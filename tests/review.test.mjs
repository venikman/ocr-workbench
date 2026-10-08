import test from "node:test";
import assert from "node:assert/strict";
import {
  createAnnotation,
  assignDomain,
  exportBundle,
  markReviewed,
  normalizeBox,
  saveDomain,
  updateReview,
  validateBundle,
} from "../src/review.js";

const png =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jfWsAAAAASUVORK5CYII=";
const fixture = () => ({
  schemaVersion: 3,
  domains: [],
  cases: [
    {
      id: "inspection",
      domainId: null,
      title: "Inspection report",
      source: { image: "/assets/inspection.png", page: 1 },
      runs: [
        {
          id: "chandra",
          model: "Chandra",
          raw: "First line\nSecond line\nThird line",
          origin: "Published example",
        },
      ],
      reviews: { chandra: { annotations: [], done: false, reviewedAt: null } },
    },
  ],
});
const evidence = () => ({
  ...createAnnotation({ start: 2, end: 3 }),
  note: "Rows are split into separate cells.",
  category: "structure",
});
const selected = (bundle) => bundle.cases[0].reviews.chandra;

test("valid bundle is cloned, absent reviews initialize, and export/import preserves evidence", () => {
  const input = fixture();
  input.cases[0].source.image = png;
  input.cases[0].reviews.chandra.annotations.push(evidence());
  const validated = validateBundle(input);
  assert.deepEqual(validated, input);
  validated.cases[0].reviews.chandra.annotations[0].note = "Changed copy";
  assert.notEqual(selected(input).annotations[0].note, "Changed copy");
  const restored = validateBundle(exportBundle(input));
  assert.deepEqual(restored.cases, input.cases);
  assert.match(restored.exportedAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(input.exportedAt, undefined);
  const noReviews = fixture();
  noReviews.cases[0].reviews = {};
  assert.deepEqual(selected(validateBundle(noReviews)), {
    annotations: [],
    done: false,
    reviewedAt: null,
  });
});

test("reviewed means documented inspection, not corrected OCR or resolved errors", () => {
  const input = fixture();
  selected(input).annotations.push(evidence());
  const reviewed = markReviewed(input, "inspection", "chandra", true);
  assert.equal(selected(reviewed).done, true);
  assert.equal(selected(reviewed).annotations[0].status, "open");
  assert.ok(selected(reviewed).reviewedAt);
  assert.equal(reviewed.cases[0].runs[0].raw, input.cases[0].runs[0].raw);
  assert.equal(selected(input).done, false);
  assert.equal(
    selected(markReviewed(reviewed, "inspection", "chandra", false)).reviewedAt,
    null,
  );
});

test("mark reviewed rejects an undocumented or unlocated annotation", () => {
  const input = fixture();
  selected(input).annotations.push(createAnnotation({ start: 1, end: 1 }));
  assert.throws(
    () => markReviewed(input, "inspection", "chandra", true),
    /add a note/,
  );
  selected(input).annotations[0].note = "   ";
  assert.throws(
    () => markReviewed(input, "inspection", "chandra", true),
    /add a note/,
  );
  selected(input).annotations[0].note = "A missing table";
  selected(input).annotations[0].lines = null;
  assert.throws(
    () => markReviewed(input, "inspection", "chandra", true),
    /link an image region or output lines/,
  );
  selected(input).annotations[0].box = { x: 0.1, y: 0.2, w: 0.3, h: 0.4 };
  assert.equal(
    selected(markReviewed(input, "inspection", "chandra", true)).done,
    true,
  );
});

test("editing reviewed evidence invalidates review without mutating the old bundle", () => {
  const input = fixture();
  selected(input).annotations.push(evidence());
  const reviewed = markReviewed(input, "inspection", "chandra", true);
  const updated = updateReview(reviewed, "inspection", "chandra", (draft) => {
    draft.annotations[0].correction = "Merged row";
  });
  assert.equal(selected(updated).done, false);
  assert.equal(selected(updated).reviewedAt, null);
  assert.equal(selected(reviewed).done, true);
  assert.equal(selected(reviewed).annotations[0].correction, "");
  assert.equal(
    updateReview(reviewed, "inspection", "chandra", () => {}),
    reviewed,
  );
  const explicit = updateReview(reviewed, "inspection", "chandra", (draft) => {
    draft.annotations[0].note = "Reviewed updated evidence";
    draft.done = true;
  });
  assert.equal(selected(explicit).done, true);
  assert.equal(
    selected(explicit).annotations[0].note,
    "Reviewed updated evidence",
  );
  assert.throws(
    () => updateReview(input, "missing", "chandra", () => {}),
    /unknown id/,
  );
  assert.throws(
    () => updateReview(input, "inspection", "missing", () => {}),
    /unknown id/,
  );
});

test("normalization handles reverse drags, viewport overflow, and non-finite coordinates", () => {
  assert.deepEqual(normalizeBox(0.8, 0.9, 0.2, 0.3), {
    x: 0.2,
    y: 0.3,
    w: 0.6000000000000001,
    h: 0.6000000000000001,
  });
  assert.deepEqual(normalizeBox(-1, 2, 2, -1), { x: 0, y: 0, w: 1, h: 1 });
  assert.deepEqual(normalizeBox(-2, -2, -1, -1), { x: 0, y: 0, w: 0, h: 0 });
  assert.throws(() => normalizeBox(NaN, 0, 1, 1), /finite/);
  assert.throws(() => normalizeBox(0, 0, Infinity, 1), /finite/);
});

test("unsafe or unsupported source images and attribution links are rejected", () => {
  for (const image of [
    "https://example.com/image.png",
    "//example.com/image.png",
    "/assets/../image.png",
    "/assets/image.svg",
    "data:image/svg+xml;base64,PHN2Zz4=",
    "data:text/html;base64,PGgxPkhlbGxvPC9oMT4=",
    "data:image/png;base64,PHN2Zz48L3N2Zz4=",
    "data:image/png;base64,invalid",
    "/assets/image.png?x=1",
  ]) {
    const input = fixture();
    input.cases[0].source.image = image;
    assert.throws(() => validateBundle(input), /source.image/);
  }
  const input = fixture();
  input.cases[0].source.url = "javascript:alert(1)";
  assert.throws(() => validateBundle(input), /attribution URL/);
  input.cases[0].source.url = "https://user:secret@example.com/report";
  assert.throws(() => validateBundle(input), /without credentials/);
  input.cases[0].source.url = "https://example.com/report";
  input.cases[0].source.image = "assets/inspection.png";
  assert.equal(
    validateBundle(input).cases[0].source.image,
    "/assets/inspection.png",
  );
});

test("malformed ids, duplicate entries, unknown reviews, and invalid ranges are rejected", () => {
  const mutations = [
    [
      (input) => {
        input.schemaVersion = 4;
      },
      /schemaVersion/,
    ],
    [
      (input) => {
        input.cases.push(structuredClone(input.cases[0]));
      },
      /duplicates another case/,
    ],
    [
      (input) => {
        input.cases[0].runs.push(structuredClone(input.cases[0].runs[0]));
      },
      /duplicates another run/,
    ],
    [
      (input) => {
        input.cases[0].runs[0].id = "constructor";
      },
      /must use/,
    ],
    [
      (input) => {
        input.cases[0].reviews.ghost = {
          annotations: [],
          done: false,
          reviewedAt: null,
        };
      },
      /does not correspond/,
    ],
    [
      (input) => {
        selected(input).annotations = [evidence(), evidence()];
        selected(input).annotations[1].id = selected(input).annotations[0].id;
      },
      /duplicates another annotation/,
    ],
    [
      (input) => {
        selected(input).annotations = [
          { ...evidence(), lines: { start: 1, end: 4 } },
        ];
      },
      /3 lines/,
    ],
    [
      (input) => {
        selected(input).annotations = [
          { ...evidence(), lines: { start: 0, end: 1 } },
        ];
      },
      /1-based/,
    ],
    [
      (input) => {
        selected(input).annotations = [{ ...evidence(), category: "bad" }];
      },
      /category/,
    ],
    [
      (input) => {
        selected(input).annotations = [{ ...evidence(), status: "done" }];
      },
      /status/,
    ],
    [
      (input) => {
        selected(input).annotations = [
          { ...evidence(), box: { x: 0.8, y: 0, w: 0.4, h: 0.5 } },
        ];
      },
      /fit within/,
    ],
    [
      (input) => {
        selected(input).annotations = [
          { ...evidence(), box: { x: NaN, y: 0, w: 0.4, h: 0.5 } },
        ];
      },
      /finite/,
    ],
    [
      (input) => {
        selected(input).annotations = [
          { ...evidence(), box: { x: 0, y: 0, w: 0, h: 0.5 } },
        ];
      },
      /positive width/,
    ],
    [
      (input) => {
        selected(input).done = true;
      },
      /reviewedAt/,
    ],
    [
      (input) => {
        selected(input).reviewedAt = "2026-10-06T12:00:00.000Z";
      },
      /must be null/,
    ],
    [
      (input) => {
        selected(input).done = true;
        selected(input).reviewedAt = "2026-02-30T12:00:00.000Z";
      },
      /valid UTC calendar/,
    ],
    [
      (input) => {
        input.cases[0].source.width = Infinity;
      },
      /pixel count/,
    ],
    [
      (input) => {
        input.cases[0].runs[0].raw = "a".repeat(2_000_001);
      },
      /character limit/,
    ],
    [
      (input) => {
        input.cases[0].unknown = true;
      },
      /supported field/,
    ],
  ];
  for (const [mutate, expected] of mutations) {
    const input = fixture();
    mutate(input);
    assert.throws(() => validateBundle(input), expected);
  }
  assert.throws(() => validateBundle("{broken"), /not valid JSON/);
  assert.throws(
    () => validateBundle({ schemaVersion: 1, cases: [] }),
    /1–100 entries/,
  );
  const polluted = JSON.parse(JSON.stringify(fixture()));
  polluted.cases[0].reviews = JSON.parse(
    '{"__proto__":{"annotations":[],"done":false,"reviewedAt":null}}',
  );
  assert.throws(() => validateBundle(polluted), /does not correspond/);
});

test("failed updates leave previous evidence intact and reject malformed annotation fields", () => {
  const input = fixture();
  selected(input).annotations.push(evidence());
  const snapshot = structuredClone(input);
  assert.throws(
    () =>
      updateReview(input, "inspection", "chandra", (draft) => {
        draft.annotations[0].note = null;
        draft.done = true;
      }),
    /note: must be text/,
  );
  assert.deepEqual(input, snapshot);
  assert.throws(
    () =>
      updateReview(input, "inspection", "chandra", async (draft) => {
        draft.annotations[0].note = "Async mutation";
      }),
    /must be synchronous/,
  );
  assert.deepEqual(input, snapshot);
});

test("single-page line limit prevents an import from overwhelming the line-numbered view", () => {
  const input = fixture();
  input.cases[0].runs[0].raw = "\n".repeat(9999);
  assert.equal(validateBundle(input).cases[0].runs[0].raw.length, 9999);
  input.cases[0].runs[0].raw += "\n";
  assert.throws(
    () => validateBundle(input),
    /10,000-line limit.*Split this output/,
  );
});

test("review edits cannot create a bundle that would fail the aggregate limit on reload or export", () => {
  const input = fixture();
  const raw = "a".repeat(2_000_000);
  input.cases[0].runs = Array.from({ length: 4 }, (_, index) => ({
    id: `run-${index}`,
    model: "OCR",
    raw,
    origin: "Imported output",
  }));
  input.cases[0].reviews = {};
  const checked = validateBundle(input);
  const annotation = { ...createAnnotation({ start: 1, end: 1 }), note: "a" };
  assert.throws(
    () =>
      updateReview(checked, "inspection", "run-0", (draft) =>
        draft.annotations.push(annotation),
      ),
    /8 million character combined/,
  );
  assert.equal(checked.cases[0].reviews["run-0"].annotations.length, 0);
  assert.doesNotThrow(() => exportBundle(checked));
});

test("annotation creation copies coordinates and gives distinct identifiers", () => {
  const range = { start: 1, end: 2 };
  const region = { x: 0.2, y: 0.3, w: 0.4, h: 0.5 };
  const annotation = createAnnotation(range, region);
  range.end = 10;
  region.x = 0.8;
  assert.deepEqual(annotation.lines, { start: 1, end: 2 });
  assert.equal(annotation.box.x, 0.2);
  assert.equal(annotation.status, "open");
  assert.notEqual(annotation.id, createAnnotation().id);
  assert.deepEqual(annotation.conceptIds, []);
  assert.deepEqual(annotation.ruleIds, []);
});

const profile = () => ({
  id: "food-inspection",
  name: "Food inspection",
  version: 1,
  description: "Review the structure and wording of a food inspection form.",
  ontology: {
    concepts: [
      {
        id: "facility",
        label: "Facility",
        description: "The premises inspected.",
      },
      {
        id: "inspection",
        label: "Inspection",
        description: "A recorded inspection.",
      },
    ],
    relations: [
      {
        id: "inspection-facility",
        from: "inspection",
        to: "facility",
        label: "inspects",
      },
    ],
  },
  specification: {
    rules: [
      {
        id: "preserve-columns",
        title: "Preserve table columns",
        description: "Keep independent column values separate.",
        conceptIds: ["inspection"],
      },
    ],
  },
});

const domainFixture = () => {
  const input = fixture();
  input.domains = [profile()];
  input.cases[0].domainId = input.domains[0].id;
  selected(input).annotations.push({
    ...evidence(),
    conceptIds: ["inspection"],
    ruleIds: ["preserve-columns"],
  });
  return input;
};

test("v1 migration preserves old review evidence and completion while adding unassigned domain fields", () => {
  const legacy = fixture();
  legacy.schemaVersion = 1;
  delete legacy.domains;
  delete legacy.cases[0].domainId;
  const annotation = evidence();
  delete annotation.conceptIds;
  delete annotation.ruleIds;
  selected(legacy).annotations.push(annotation);
  selected(legacy).done = true;
  selected(legacy).reviewedAt = "2026-10-06T12:00:00.000Z";
  legacy.exportedAt = "2026-10-06T12:01:00.000Z";
  const before = structuredClone(legacy);
  const migrated = validateBundle(legacy);
  assert.equal(migrated.schemaVersion, 3);
  assert.deepEqual(migrated.domains, []);
  assert.equal(migrated.cases[0].domainId, null);
  assert.deepEqual(selected(migrated), {
    ...selected(legacy),
    annotations: [{ ...annotation, conceptIds: [], ruleIds: [] }],
  });
  assert.equal(migrated.exportedAt, legacy.exportedAt);
  assert.equal(migrated.cases[0].runs[0].raw, legacy.cases[0].runs[0].raw);
  assert.deepEqual(legacy, before);
});

test("domain references round-trip in exports and missing annotation link arrays default empty", () => {
  const input = domainFixture();
  assert.deepEqual(validateBundle(input), input);
  const restored = validateBundle(exportBundle(input));
  assert.equal(restored.schemaVersion, 3);
  assert.deepEqual(restored.domains, input.domains);
  assert.deepEqual(restored.cases, input.cases);
  delete selected(input).annotations[0].conceptIds;
  delete selected(input).annotations[0].ruleIds;
  const checked = validateBundle(input);
  assert.deepEqual(selected(checked).annotations[0].conceptIds, []);
  assert.deepEqual(selected(checked).annotations[0].ruleIds, []);
});

test("domain profile and finding references reject duplicates, dangling links, and oversized collections", () => {
  const mutations = [
    [
      (input) => {
        input.domains.push(profile());
      },
      /duplicates another domain/,
    ],
    [
      (input) => {
        input.domains[0].ontology.concepts.push(
          input.domains[0].ontology.concepts[0],
        );
      },
      /duplicates another concept/,
    ],
    [
      (input) => {
        input.domains[0].ontology.relations.push(
          input.domains[0].ontology.relations[0],
        );
      },
      /duplicates another relation/,
    ],
    [
      (input) => {
        input.domains[0].specification.rules.push(
          input.domains[0].specification.rules[0],
        );
      },
      /duplicates another rule/,
    ],
    [
      (input) => {
        input.domains[0].ontology.relations[0].to = "missing";
      },
      /does not identify a concept/,
    ],
    [
      (input) => {
        input.domains[0].specification.rules[0].conceptIds = ["missing"];
      },
      /does not identify a concept/,
    ],
    [
      (input) => {
        input.domains[0].specification.rules[0].conceptIds = [
          "inspection",
          "inspection",
        ];
      },
      /duplicates the concept/,
    ],
    [
      (input) => {
        input.domains[0].version = 1.5;
      },
      /positive safe integer/,
    ],
    [
      (input) => {
        input.cases[0].domainId = "missing";
      },
      /does not identify a domain/,
    ],
    [
      (input) => {
        input.cases[0].domainId = null;
      },
      /does not identify a concept/,
    ],
    [
      (input) => {
        selected(input).annotations[0].conceptIds = ["missing"];
      },
      /does not identify a concept/,
    ],
    [
      (input) => {
        selected(input).annotations[0].ruleIds = ["missing"];
      },
      /does not identify a rule/,
    ],
    [
      (input) => {
        selected(input).annotations[0].ruleIds = [
          "preserve-columns",
          "preserve-columns",
        ];
      },
      /duplicates the rule/,
    ],
    [
      (input) => {
        selected(input).annotations[0].conceptIds = null;
      },
      /must be an array/,
    ],
    [
      (input) => {
        input.domains[0].ontology.concepts = Array.from(
          { length: 251 },
          (_, i) => ({ id: `concept-${i}`, label: "Concept", description: "" }),
        );
      },
      /0–250 entries/,
    ],
    [
      (input) => {
        input.domains = Array.from({ length: 51 }, (_, i) => ({
          ...profile(),
          id: `domain-${i}`,
        }));
      },
      /0–50 entries/,
    ],
  ];
  for (const [mutate, expected] of mutations) {
    const input = domainFixture();
    mutate(input);
    assert.throws(() => validateBundle(input), expected);
  }
});

test("changing domain assignment clears scoped finding links and reopens reviews without losing evidence", () => {
  let input = domainFixture();
  input.domains.push({
    ...profile(),
    id: "another-domain",
    name: "Another domain",
  });
  input = markReviewed(input, "inspection", "chandra", true);
  assert.equal(assignDomain(input, "inspection", "food-inspection"), input);
  const reassigned = assignDomain(input, "inspection", "another-domain");
  assert.equal(reassigned.cases[0].domainId, "another-domain");
  assert.equal(selected(reassigned).done, false);
  assert.equal(selected(reassigned).reviewedAt, null);
  assert.deepEqual(selected(reassigned).annotations[0], {
    ...selected(input).annotations[0],
    conceptIds: [],
    ruleIds: [],
  });
  assert.deepEqual(reassigned.cases[0].runs, input.cases[0].runs);
  assert.equal(selected(input).done, true);
  assert.deepEqual(selected(input).annotations[0].ruleIds, [
    "preserve-columns",
  ]);
  assert.equal(assignDomain(input, "inspection", null).cases[0].domainId, null);
  assert.throws(
    () => assignDomain(input, "inspection", "missing"),
    /unknown domain/,
  );
  assert.throws(() => assignDomain(input, "missing", null), /unknown id/);
});

test("saving domain changes manages monotonic versions and invalidates only assigned cases", () => {
  const empty = fixture();
  const created = saveDomain(empty, { ...profile(), version: 900 });
  assert.equal(created.domains[0].version, 1);
  assert.equal(empty.domains.length, 0);
  assert.equal(
    saveDomain(created, { ...created.domains[0], version: 0 }),
    created,
  );
  let input = domainFixture();
  input.cases.push({
    ...structuredClone(input.cases[0]),
    id: "other-case",
    domainId: null,
    reviews: {
      chandra: {
        annotations: [],
        done: true,
        reviewedAt: "2026-10-06T12:00:00.000Z",
      },
    },
  });
  input = markReviewed(input, "inspection", "chandra", true);
  const edited = structuredClone(input.domains[0]);
  edited.specification.rules[0].description =
    "Preserve every separate source column in its own output cell.";
  const updated = saveDomain(input, edited);
  assert.equal(updated.domains[0].version, 2);
  assert.equal(selected(updated).done, false);
  assert.equal(selected(updated).reviewedAt, null);
  assert.deepEqual(selected(updated).annotations, selected(input).annotations);
  assert.equal(updated.cases[1].reviews.chandra.done, true);
  assert.equal(input.domains[0].version, 1);
  assert.equal(selected(input).done, true);
  const third = saveDomain(updated, {
    ...updated.domains[0],
    name: "Updated name",
    version: 1,
  });
  assert.equal(third.domains[0].version, 3);
});

test("saving a domain cannot delete a referenced concept or rule", () => {
  const input = domainFixture();
  const before = structuredClone(input);
  const removedRule = structuredClone(input.domains[0]);
  removedRule.specification.rules = [];
  assert.throws(
    () => saveDomain(input, removedRule),
    /cannot remove rule.*Remove that finding link first/,
  );
  const removedConcept = structuredClone(input.domains[0]);
  removedConcept.ontology.concepts = removedConcept.ontology.concepts.filter(
    (item) => item.id !== "inspection",
  );
  removedConcept.ontology.relations = [];
  removedConcept.specification.rules[0].conceptIds = [];
  assert.throws(
    () => saveDomain(input, removedConcept),
    /cannot remove concept.*Remove that finding link first/,
  );
  assert.deepEqual(input, before);
  const unlinked = updateReview(input, "inspection", "chandra", (draft) => {
    draft.annotations[0].conceptIds = [];
    draft.annotations[0].ruleIds = [];
  });
  assert.equal(
    saveDomain(unlinked, removedRule).domains[0].specification.rules.length,
    0,
  );
});

test("finding links validate on edit and reopen reviews without imposing a compliance gate", () => {
  let input = domainFixture();
  input = markReviewed(input, "inspection", "chandra", true);
  assert.throws(
    () =>
      updateReview(input, "inspection", "chandra", (draft) => {
        draft.annotations[0].ruleIds = ["not-in-profile"];
      }),
    /does not identify a rule/,
  );
  const changed = updateReview(input, "inspection", "chandra", (draft) => {
    draft.annotations[0].ruleIds = [];
  });
  assert.equal(selected(changed).done, false);
  assert.equal(
    selected(markReviewed(changed, "inspection", "chandra", true)).done,
    true,
  );
  assert.equal(selected(changed).annotations[0].status, "open");
});

test("domain changes reopen every run attached to the affected document", () => {
  let input = domainFixture();
  input.cases[0].runs.push({ ...input.cases[0].runs[0], id: "alternative" });
  input.cases[0].reviews.alternative = {
    annotations: [],
    done: true,
    reviewedAt: "2026-10-06T12:00:00.000Z",
  };
  input = markReviewed(input, "inspection", "chandra", true);
  for (const changed of [
    assignDomain(input, "inspection", null),
    saveDomain(input, {
      ...input.domains[0],
      description: "Clarified review context.",
    }),
  ]) {
    for (const value of Object.values(changed.cases[0].reviews)) {
      assert.equal(value.done, false);
      assert.equal(value.reviewedAt, null);
    }
  }
  assert.equal(input.cases[0].reviews.alternative.done, true);
});
