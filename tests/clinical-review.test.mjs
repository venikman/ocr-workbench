import test from "node:test";
import assert from "node:assert/strict";
import {
  validateBundle,
  updateReview,
  markReviewed,
  exportBundle,
  assignDomain,
  saveDomain,
} from "../src/review.js";
import {
  blankClinicalContext,
  blankClinicalReview,
} from "../src/healthcare.js";
import { healthcareDomain } from "../src/healthcare-domain.js";
import { createHealthcareCases } from "../src/healthcare-demo.js";

const fixture = () =>
  validateBundle({
    schemaVersion: 3,
    domains: [healthcareDomain],
    cases: createHealthcareCases(),
  });
const selected = (b) => b.cases[0].reviews[b.cases[0].runs[0].id];
const edit = (b, fn) =>
  updateReview(b, b.cases[0].id, b.cases[0].runs[0].id, fn);
const complete = (b) =>
  markReviewed(b, b.cases[0].id, b.cases[0].runs[0].id, true);
function checked() {
  const value = blankClinicalReview();
  value.identity = "matched";
  value.reviewer = "Synthetic evaluation reviewer";
  value.checks = Object.fromEntries(
    Object.keys(value.checks).map((k) => [k, true]),
  );
  return value;
}
function ready() {
  let b = edit(fixture(), (r) => {
    r.annotations.forEach((a) => (a.status = "resolved"));
  });
  return edit(b, (r) => {
    r.clinicalReview = checked();
  });
}
test("healthcare completion requires identity, all source checks, a reviewer label and resolved findings", () => {
  assert.throws(() => complete(fixture()), /identity/);
  for (const identity of ["unchecked", "unverifiable", "mismatch"]) {
    const b = edit(ready(), (r) => {
      r.clinicalReview.identity = identity;
    });
    assert.throws(() => complete(b), /identity/);
  }
  assert.throws(
    () =>
      complete(
        edit(ready(), (r) => {
          r.clinicalReview.reviewer = " ";
        }),
      ),
    /reviewer label/,
  );
  for (const key of Object.keys(checked().checks)) {
    assert.throws(
      () =>
        complete(
          edit(ready(), (r) => {
            r.clinicalReview.checks[key] = false;
          }),
        ),
      /every Clinical review check/,
    );
  }
  let b = edit(fixture(), (r) => {
    r.clinicalReview = checked();
  });
  assert.throws(() => complete(b), /resolve each healthcare finding/);
  assert.equal(selected(complete(ready())).done, true);
});
test("accepted clinical mappings require source-image evidence, a note and scoped concept", () => {
  const accepted = {
    ...blankClinicalContext(),
    subject: "family",
    assertion: "present",
    temporality: "historical",
    decision: "accepted",
  };
  const b = edit(fixture(), (r) => {
    r.annotations[0].clinical = accepted;
  });
  for (const field of ["box", "note", "conceptIds"]) {
    const malformed = structuredClone(b);
    selected(malformed).annotations[0][field] = {
      box: null,
      note: "",
      conceptIds: [],
    }[field];
    assert.throws(
      () => validateBundle(malformed),
      /accepted clinical mapping needs/,
    );
  }
  assert.equal(selected(b).annotations[0].clinical.subject, "family");
});
test("unknown, not documented, exact values and units survive export without inferred care", () => {
  const value = {
    ...blankClinicalContext(),
    assertion: "not-documented",
    temporality: "planned",
    eventStatus: "ordered",
    value: "0.5",
    unit: "mg",
    decision: "needs-review",
  };
  const b = edit(fixture(), (r) => {
    r.annotations[0].clinical = value;
  });
  const restored = validateBundle(exportBundle(b));
  assert.deepEqual(selected(restored).annotations[0].clinical, value);
  assert.equal(selected(restored).done, false);
  assert.equal(restored.cases[0].runs[0].raw, b.cases[0].runs[0].raw);
});
test("unreviewed and deferred clinical mappings cannot be marked reviewed", () => {
  for (const decision of ["unreviewed", "needs-review"]) {
    let b = edit(ready(), (r) => {
      r.annotations[0].clinical = { ...blankClinicalContext(), decision };
    });
    b = edit(b, (r) => {
      r.clinicalReview = checked();
    });
    assert.throws(() => complete(b), /mapping decision/);
  }
});
test("changing mapping content reopens decisions and invalidates checklist even if done is assigned", () => {
  let b = edit(ready(), (r) => {
    r.annotations[0].clinical = {
      ...blankClinicalContext(),
      decision: "accepted",
    };
  });
  b = edit(b, (r) => {
    r.clinicalReview = checked();
  });
  b = complete(b);
  for (const mutate of [
    (a) => {
      a.note += " changed";
    },
    (a) => {
      a.box.x += 0.001;
    },
    (a) => {
      a.clinical.assertion = "negated";
    },
    (a) => {
      a.ruleIds = [];
    },
  ]) {
    const changed = edit(b, (r) => mutate(r.annotations[0]));
    assert.equal(selected(changed).done, false);
    assert.equal(selected(changed).reviewedAt, null);
    assert.equal(
      selected(changed).annotations[0].clinical.decision,
      "unreviewed",
    );
    assert.equal(selected(changed).clinicalReview.identity, "unchecked");
    assert.ok(
      Object.values(selected(changed).clinicalReview.checks).every(
        (v) => v === false,
      ),
    );
    assert.throws(
      () =>
        edit(b, (r) => {
          mutate(r.annotations[0]);
          r.done = true;
        }),
      /identity/,
    );
  }
  assert.equal(selected(b).done, true);
});
test("domain revisions and assignment changes invalidate healthcare checks and mappings", () => {
  let b = edit(ready(), (r) => {
    r.annotations[0].clinical = {
      ...blankClinicalContext(),
      decision: "accepted",
    };
  });
  b = edit(b, (r) => {
    r.clinicalReview = checked();
  });
  b = complete(b);
  for (const changed of [
    saveDomain(b, { ...b.domains[0], description: "Revised scope" }),
    assignDomain(b, b.cases[0].id, null),
  ]) {
    assert.equal(selected(changed).done, false);
    assert.equal(selected(changed).clinicalReview.identity, "unchecked");
    assert.equal(
      selected(changed).annotations[0].clinical.decision,
      "unreviewed",
    );
    assert.equal(
      selected(changed).annotations[0].note,
      selected(b).annotations[0].note,
    );
  }
});
test("malformed healthcare attestations and forged completion with missing checks fail import", () => {
  for (const mutate of [
    (r) => {
      r.clinicalReview.checks.values = "true";
    },
    (r) => {
      delete r.clinicalReview.checks.subject;
    },
    (r) => {
      r.clinicalReview.identity = "probably";
    },
    (r) => {
      r.clinicalReview.extra = true;
    },
    (r) => {
      r.annotations[0].clinical = {
        ...blankClinicalContext(),
        subject: "clinician-guessed",
      };
    },
  ]) {
    const b = ready();
    mutate(selected(b));
    assert.throws(() => validateBundle(b));
  }
  const b = complete(ready());
  delete selected(b).clinicalReview;
  assert.throws(() => validateBundle(b), /identity/);
});
test("schema2 migration adds no clinical checks or fabricated mapping decisions", () => {
  const b = fixture();
  b.schemaVersion = 2;
  delete b.domains[0].reviewPolicy;
  const migrated = validateBundle(b);
  assert.equal(migrated.schemaVersion, 3);
  assert.equal(selected(migrated).clinicalReview, undefined);
  assert.ok(
    selected(migrated).annotations.every((a) => a.clinical === undefined),
  );
  assert.deepEqual(migrated.cases, b.cases);
});
