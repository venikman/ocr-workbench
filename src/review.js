import {
  validateClinicalContext,
  validateClinicalReview,
  resetClinicalReview,
  assertClinicalComplete,
  assertClinicalMapping,
} from "./healthcare.js";
/** Review data is local evidence about an OCR run; reviewing does not correct the run. */
const LIMITS = {
  cases: 100,
  runs: 20,
  annotations: 1000,
  domains: 50,
  concepts: 250,
  relations: 500,
  rules: 250,
  links: 50,
  raw: 2_000_000,
  lines: 10_000,
  note: 20_000,
  correction: 200_000,
  image: 20_000_000,
  totalText: 8_000_000,
  totalImages: 32_000_000,
  input: 42_000_000,
};
const CATEGORIES = new Set(["structure", "omission", "text", "order", "other"]);
const STATUSES = new Set(["open", "resolved"]);
const FORBIDDEN_IDS = new Set(["__proto__", "prototype", "constructor"]);
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const fail = (path, message) => {
  throw new Error(`${path}: ${message}`);
};
const emptyReview = () => ({ annotations: [], done: false, reviewedAt: null });

function object(value, path, allowed) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(value))
  ) {
    fail(path, "must be a plain object.");
  }
  if (allowed) {
    for (const key of Object.keys(value)) {
      if (!allowed.includes(key))
        fail(`${path}.${key}`, "is not a supported field.");
    }
  }
  return value;
}

function string(value, path, max, nonempty = false) {
  if (typeof value !== "string") fail(path, "must be text.");
  if (value.length > max)
    fail(path, `exceeds the ${max.toLocaleString("en-US")} character limit.`);
  if (nonempty && !value.trim()) fail(path, "must not be blank.");
  return value;
}

function id(value, path) {
  string(value, path, 128, true);
  if (
    !/^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/.test(value) ||
    FORBIDDEN_IDS.has(value)
  ) {
    fail(
      path,
      "must use letters, numbers, dots, underscores, colons, or hyphens and start with a letter or number.",
    );
  }
  return value;
}

function array(value, path, max, min = 0) {
  if (!Array.isArray(value)) fail(path, "must be an array.");
  if (value.length < min || value.length > max)
    fail(path, `must contain ${min}–${max} entries.`);
  return value;
}

function references(value, path, known, kind) {
  const seen = new Set();
  return array(value === undefined ? [] : value, path, LIMITS.links).map(
    (item, index) => {
      const reference = id(item, `${path}[${index}]`);
      if (seen.has(reference))
        fail(
          `${path}[${index}]`,
          `duplicates the ${kind} reference "${reference}".`,
        );
      seen.add(reference);
      if (!known.has(reference)) {
        fail(
          `${path}[${index}]`,
          `"${reference}" does not identify a ${kind} in this domain.`,
        );
      }
      return reference;
    },
  );
}

function uniqueId(value, path, seen, kind) {
  const checked = id(value, path);
  if (seen.has(checked)) fail(path, `duplicates another ${kind} id.`);
  seen.add(checked);
  return checked;
}

function domainProfile(value, path) {
  object(value, path, [
    "id",
    "name",
    "version",
    "description",
    "ontology",
    "specification",
    "reviewPolicy",
  ]);
  if (value.reviewPolicy !== undefined && value.reviewPolicy !== "clinical")
    fail(`${path}.reviewPolicy`, "must be clinical when supplied.");
  if (!Number.isSafeInteger(value.version) || value.version < 1) {
    fail(`${path}.version`, "must be a positive safe integer.");
  }
  object(value.ontology, `${path}.ontology`, ["concepts", "relations"]);
  object(value.specification, `${path}.specification`, ["rules"]);
  const conceptIds = new Set();
  const concepts = array(
    value.ontology.concepts,
    `${path}.ontology.concepts`,
    LIMITS.concepts,
  ).map((concept, index) => {
    const at = `${path}.ontology.concepts[${index}]`;
    object(concept, at, ["id", "label", "description"]);
    return {
      id: uniqueId(concept.id, `${at}.id`, conceptIds, "concept"),
      label: string(concept.label, `${at}.label`, 300, true),
      description: string(
        concept.description,
        `${at}.description`,
        LIMITS.note,
      ),
    };
  });
  const relationIds = new Set();
  const relations = array(
    value.ontology.relations,
    `${path}.ontology.relations`,
    LIMITS.relations,
  ).map((relation, index) => {
    const at = `${path}.ontology.relations[${index}]`;
    object(relation, at, ["id", "from", "to", "label"]);
    const result = {
      id: uniqueId(relation.id, `${at}.id`, relationIds, "relation"),
      from: id(relation.from, `${at}.from`),
      to: id(relation.to, `${at}.to`),
      label: string(relation.label, `${at}.label`, 300, true),
    };
    for (const end of ["from", "to"]) {
      if (!conceptIds.has(result[end]))
        fail(
          `${at}.${end}`,
          `"${result[end]}" does not identify a concept in this domain.`,
        );
    }
    return result;
  });
  const ruleIds = new Set();
  const rules = array(
    value.specification.rules,
    `${path}.specification.rules`,
    LIMITS.rules,
  ).map((rule, index) => {
    const at = `${path}.specification.rules[${index}]`;
    object(rule, at, ["id", "title", "description", "conceptIds"]);
    return {
      id: uniqueId(rule.id, `${at}.id`, ruleIds, "rule"),
      title: string(rule.title, `${at}.title`, 300, true),
      description: string(rule.description, `${at}.description`, LIMITS.note),
      conceptIds: references(
        rule.conceptIds,
        `${at}.conceptIds`,
        conceptIds,
        "concept",
      ),
    };
  });
  return {
    id: id(value.id, `${path}.id`),
    name: string(value.name, `${path}.name`, 300, true),
    version: value.version,
    description: string(value.description, `${path}.description`, LIMITS.note),
    ontology: { concepts, relations },
    specification: { rules },
    ...(value.reviewPolicy ? { reviewPolicy: value.reviewPolicy } : {}),
  };
}

function domainScope(domain) {
  return {
    clinical: domain?.reviewPolicy === "clinical",
    concepts: new Set(domain?.ontology.concepts.map((item) => item.id) || []),
    rules: new Set(domain?.specification.rules.map((item) => item.id) || []),
  };
}

function timestamp(value, path) {
  string(value, path, 40, true);
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value) ||
    !Number.isFinite(Date.parse(value))
  )
    fail(path, "must be a valid UTC ISO timestamp.");
  const canonical = value.includes(".")
    ? value.replace(
        /\.(\d{1,3})Z$/,
        (_, fraction) => `.${fraction.padEnd(3, "0")}Z`,
      )
    : value.replace("Z", ".000Z");
  if (new Date(value).toISOString() !== canonical)
    fail(path, "must be a valid UTC calendar date and time.");
  return value;
}

function imageSource(value, path) {
  string(value, path, LIMITS.image, true);
  if (
    /^\/?assets\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_.-]+\.(?:png|jpe?g|webp)$/i.test(
      value,
    )
  ) {
    if (value.split("/").some((part) => part === "." || part === ".."))
      fail(path, "must not traverse directories.");
    return value.startsWith("/") ? value : `/${value}`;
  }
  const match =
    /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match || match[2].length % 4 !== 0) {
    fail(
      path,
      "use a local /assets/ PNG, JPEG, or WebP path, or a base64 PNG/JPEG/WebP data URL. Remote images and SVG are not supported.",
    );
  }
  let prefix;
  try {
    prefix = atob(match[2].slice(0, 32));
  } catch {
    fail(path, "contains invalid base64 image data.");
  }
  const raster =
    match[1] === "png"
      ? prefix.startsWith("\x89PNG\r\n\x1a\n")
      : match[1] === "jpeg"
        ? prefix.startsWith("\xff\xd8\xff")
        : prefix.startsWith("RIFF") && prefix.slice(8, 12) === "WEBP";
  if (!raster)
    fail(path, `image data does not match the declared ${match[1]} format.`);
  return value;
}

function source(value, path) {
  object(value, path, ["image", "url", "page", "width", "height"]);
  const result = {
    image: imageSource(value.image, `${path}.image`),
    page: value.page,
  };
  if (
    !Number.isSafeInteger(value.page) ||
    value.page < 1 ||
    value.page > 100_000
  ) {
    fail(`${path}.page`, "must be a positive integer no greater than 100000.");
  }
  if (own(value, "url")) {
    string(value.url, `${path}.url`, 2048, true);
    let parsed;
    try {
      parsed = new URL(value.url);
    } catch {
      fail(`${path}.url`, "must be an HTTP(S) attribution URL.");
    }
    if (
      !["http:", "https:"].includes(parsed.protocol) ||
      parsed.username ||
      parsed.password
    ) {
      fail(
        `${path}.url`,
        "must be an HTTP(S) attribution URL without credentials.",
      );
    }
    result.url = value.url;
  }
  for (const key of ["width", "height"]) {
    if (own(value, key)) {
      if (
        !Number.isSafeInteger(value[key]) ||
        value[key] < 1 ||
        value[key] > 100_000
      ) {
        fail(
          `${path}.${key}`,
          "must be a positive pixel count no greater than 100000.",
        );
      }
      result[key] = value[key];
    }
  }
  return result;
}

function box(value, path) {
  if (value === null) return null;
  object(value, path, ["x", "y", "w", "h"]);
  for (const key of ["x", "y", "w", "h"]) {
    if (!Number.isFinite(value[key]) || value[key] < 0 || value[key] > 1) {
      fail(`${path}.${key}`, "must be a finite number from 0 to 1.");
    }
  }
  if (value.w <= 0 || value.h <= 0)
    fail(path, "must have a positive width and height.");
  if (
    value.x + value.w > 1 + Number.EPSILON ||
    value.y + value.h > 1 + Number.EPSILON
  ) {
    fail(path, "must fit within the source image.");
  }
  return { x: value.x, y: value.y, w: value.w, h: value.h };
}

function lines(value, path, lineCount) {
  if (value === null) return null;
  object(value, path, ["start", "end"]);
  if (
    !Number.isSafeInteger(value.start) ||
    !Number.isSafeInteger(value.end) ||
    value.start < 1 ||
    value.end < value.start ||
    value.end > lineCount
  ) {
    fail(
      path,
      `must be a 1-based inclusive range within the run's ${lineCount} lines.`,
    );
  }
  return { start: value.start, end: value.end };
}

function completeness(review, path) {
  review.annotations.forEach((annotation, index) => {
    if (!annotation.note.trim())
      fail(
        `${path}.annotations[${index}].note`,
        "add a note before marking this run reviewed.",
      );
    if (!annotation.box && !annotation.lines) {
      fail(
        `${path}.annotations[${index}]`,
        "link an image region or output lines before marking this run reviewed.",
      );
    }
  });
}

function review(value, path, lineCount, scope = domainScope(null)) {
  object(value, path, ["annotations", "done", "reviewedAt", "clinicalReview"]);
  if (typeof value.done !== "boolean")
    fail(`${path}.done`, "must be true or false.");
  const seen = new Set();
  const annotations = array(
    value.annotations,
    `${path}.annotations`,
    LIMITS.annotations,
  ).map((item, index) => {
    const at = `${path}.annotations[${index}]`;
    object(item, at, [
      "id",
      "box",
      "lines",
      "category",
      "note",
      "correction",
      "status",
      "conceptIds",
      "ruleIds",
      "clinical",
    ]);
    const annotationId = id(item.id, `${at}.id`);
    if (seen.has(annotationId))
      fail(`${at}.id`, "duplicates another annotation id in this run.");
    seen.add(annotationId);
    if (!CATEGORIES.has(item.category))
      fail(
        `${at}.category`,
        "must be structure, omission, text, order, or other.",
      );
    if (!STATUSES.has(item.status))
      fail(`${at}.status`, "must be open or resolved.");
    return {
      id: annotationId,
      box: box(item.box, `${at}.box`),
      lines: lines(item.lines, `${at}.lines`, lineCount),
      category: item.category,
      note: string(item.note, `${at}.note`, LIMITS.note),
      correction: string(
        item.correction,
        `${at}.correction`,
        LIMITS.correction,
      ),
      status: item.status,
      conceptIds: references(
        item.conceptIds,
        `${at}.conceptIds`,
        scope.concepts,
        "concept",
      ),
      ruleIds: references(item.ruleIds, `${at}.ruleIds`, scope.rules, "rule"),
      ...(item.clinical === undefined
        ? {}
        : {
            clinical: validateClinicalContext(item.clinical, `${at}.clinical`),
          }),
    };
  });
  const result = {
    annotations,
    done: value.done,
    reviewedAt: value.reviewedAt,
    ...(value.clinicalReview === undefined
      ? {}
      : {
          clinicalReview: validateClinicalReview(
            value.clinicalReview,
            `${path}.clinicalReview`,
          ),
        }),
  };
  for (const [index, annotation] of annotations.entries())
    assertClinicalMapping(annotation, `${path}.annotations[${index}]`);
  if (value.reviewedAt !== null)
    timestamp(value.reviewedAt, `${path}.reviewedAt`);
  if (value.done && value.reviewedAt === null)
    fail(`${path}.reviewedAt`, "is required when the run is marked reviewed.");
  if (!value.done && value.reviewedAt !== null)
    fail(`${path}.reviewedAt`, "must be null while a run is not reviewed.");
  if (value.done) {
    completeness(result, path);
    if (scope.clinical) assertClinicalComplete(result, path);
  }
  return result;
}

/** Validate a bundle and migrate version 1/2 evidence to schema 3 without inventing clinical assessments. */
export function validateBundle(input) {
  if (typeof input === "string") {
    if (input.length > LIMITS.input)
      fail("Bundle", "exceeds the 42 MB import limit.");
    try {
      input = JSON.parse(input);
    } catch {
      fail("Bundle", "is not valid JSON.");
    }
  }
  object(input, "Bundle");
  if (![1, 2, 3].includes(input.schemaVersion))
    fail("Bundle.schemaVersion", "must be 1, 2, or 3.");
  const legacy = input.schemaVersion === 1;
  object(
    input,
    "Bundle",
    legacy
      ? ["schemaVersion", "cases", "exportedAt"]
      : ["schemaVersion", "domains", "cases", "exportedAt"],
  );
  const domainIds = new Set();
  const domains = legacy
    ? []
    : array(input.domains, "Bundle.domains", LIMITS.domains).map(
        (value, index) => {
          const at = `Bundle.domains[${index}]`;
          const checked = domainProfile(value, at);
          uniqueId(checked.id, `${at}.id`, domainIds, "domain");
          return checked;
        },
      );
  const domainsById = new Map(domains.map((domain) => [domain.id, domain]));
  let totalText = domains.reduce(
    (sum, domain) => sum + JSON.stringify(domain).length,
    0,
  );
  if (totalText > LIMITS.totalText)
    fail(
      "Bundle",
      "exceeds the 8 million character combined domain, output, and annotation limit.",
    );
  let totalImages = 0;
  const caseIds = new Set();
  const cases = array(input.cases, "Bundle.cases", LIMITS.cases, 1).map(
    (item, index) => {
      const at = `Bundle.cases[${index}]`;
      object(
        item,
        at,
        legacy
          ? ["id", "title", "source", "runs", "reviews"]
          : ["id", "title", "source", "runs", "reviews", "domainId"],
      );
      const caseId = id(item.id, `${at}.id`);
      if (caseIds.has(caseId)) fail(`${at}.id`, "duplicates another case id.");
      caseIds.add(caseId);
      const domainId = legacy ? null : item.domainId;
      if (domainId !== null) {
        id(domainId, `${at}.domainId`);
        if (!domainsById.has(domainId))
          fail(
            `${at}.domainId`,
            `"${domainId}" does not identify a domain in this bundle.`,
          );
      }
      const scope = domainScope(domainsById.get(domainId));
      const result = {
        id: caseId,
        domainId,
        title: string(item.title, `${at}.title`, 300, true),
        source: source(item.source, `${at}.source`),
        runs: [],
        reviews: {},
      };
      totalImages += result.source.image.length;
      if (totalImages > LIMITS.totalImages)
        fail("Bundle", "exceeds the 32 MB combined image limit.");
      const runIds = new Set();
      result.runs = array(item.runs, `${at}.runs`, LIMITS.runs, 1).map(
        (run, runIndex) => {
          const runAt = `${at}.runs[${runIndex}]`;
          object(run, runAt, ["id", "model", "raw", "origin"]);
          const runId = id(run.id, `${runAt}.id`);
          if (runIds.has(runId))
            fail(`${runAt}.id`, "duplicates another run id in this case.");
          runIds.add(runId);
          const raw = string(run.raw, `${runAt}.raw`, LIMITS.raw);
          let lineCount = 1;
          for (
            let newline = raw.indexOf("\n");
            newline !== -1;
            newline = raw.indexOf("\n", newline + 1)
          ) {
            lineCount += 1;
            if (lineCount > LIMITS.lines) {
              fail(
                `${runAt}.raw`,
                "exceeds the 10,000-line limit for a single page. Split this output into smaller document pairs.",
              );
            }
          }
          totalText += raw.length;
          return {
            id: runId,
            model: string(run.model, `${runAt}.model`, 200, true),
            raw,
            origin: string(run.origin, `${runAt}.origin`, 2048, true),
          };
        },
      );
      object(item.reviews, `${at}.reviews`);
      for (const key of Object.keys(item.reviews)) {
        if (!runIds.has(key))
          fail(
            `${at}.reviews.${key}`,
            "does not correspond to a run in this case.",
          );
      }
      for (const run of result.runs) {
        const value = own(item.reviews, run.id)
          ? item.reviews[run.id]
          : emptyReview();
        const checked = review(
          value,
          `${at}.reviews.${run.id}`,
          run.raw.split("\n").length,
          scope,
        );
        totalText += checked.annotations.reduce(
          (sum, item) =>
            sum +
            item.note.length +
            item.correction.length +
            (item.clinical ? JSON.stringify(item.clinical).length : 0),
          0,
        );
        totalText += checked.clinicalReview
          ? JSON.stringify(checked.clinicalReview).length
          : 0;
        result.reviews[run.id] = checked;
      }
      if (totalText > LIMITS.totalText)
        fail(
          "Bundle",
          "exceeds the 8 million character combined domain, output, and annotation limit.",
        );
      return result;
    },
  );
  const result = { schemaVersion: 3, domains, cases };
  if (own(input, "exportedAt"))
    result.exportedAt = timestamp(input.exportedAt, "Bundle.exportedAt");
  return result;
}

function findRun(bundle, caseId, runId) {
  const caseIndex = bundle.cases.findIndex((item) => item.id === caseId);
  if (caseIndex < 0) fail("Case", `unknown id "${caseId}".`);
  const item = bundle.cases[caseIndex];
  const run = item.runs.find((item) => item.id === runId);
  if (!run) fail("Run", `unknown id "${runId}" in case "${caseId}".`);
  return { caseIndex, item, run };
}

function checkBundleTextBudget(bundle) {
  let total = bundle.domains.reduce(
    (sum, domain) => sum + JSON.stringify(domain).length,
    0,
  );
  for (const item of bundle.cases) {
    total += item.runs.reduce((sum, run) => sum + run.raw.length, 0);
    for (const value of Object.values(item.reviews)) {
      total += value.clinicalReview
        ? JSON.stringify(value.clinicalReview).length
        : 0;
      total += value.annotations.reduce(
        (sum, annotation) =>
          sum +
          annotation.note.length +
          annotation.correction.length +
          (annotation.clinical
            ? JSON.stringify(annotation.clinical).length
            : 0),
        0,
      );
    }
    if (total > LIMITS.totalText) {
      fail(
        "Bundle",
        "exceeds the 8 million character combined domain, output, and annotation limit.",
      );
    }
  }
}

/** Edit a review immutably. Changing evidence reopens it unless done is explicitly assigned. */
export function updateReview(bundle, caseId, runId, mutator) {
  if (typeof mutator !== "function")
    fail("Review update", "requires a mutator function.");
  if (bundle.schemaVersion !== 3) bundle = validateBundle(bundle);
  const { caseIndex, item, run } = findRun(bundle, caseId, runId);
  const before = item.reviews[runId] || emptyReview();
  const next = structuredClone(before);
  let doneAssigned = false;
  const draft = new Proxy(next, {
    set(target, property, value) {
      if (property === "done") doneAssigned = true;
      target[property] = value;
      return true;
    },
  });
  const outcome = mutator(draft);
  if (outcome && typeof outcome.then === "function")
    fail("Review update", "must be synchronous.");
  const evidenceChanged =
    JSON.stringify(next.annotations) !== JSON.stringify(before.annotations);
  if (evidenceChanged) {
    if (next.clinicalReview)
      next.clinicalReview = resetClinicalReview(next.clinicalReview);
    for (const annotation of next.annotations) {
      const old = before.annotations.find((item) => item.id === annotation.id);
      // A decision can change alone. Altering its supporting content invalidates the old decision.
      const content = (item) =>
        item &&
        JSON.stringify({
          box: item.box,
          lines: item.lines,
          note: item.note,
          correction: item.correction,
          conceptIds: item.conceptIds,
          ruleIds: item.ruleIds,
          clinical: item.clinical
            ? { ...item.clinical, decision: undefined }
            : undefined,
        });
      if (
        old?.clinical &&
        annotation.clinical &&
        content(old) !== content(annotation)
      )
        annotation.clinical.decision = "unreviewed";
    }
  }
  const changed = JSON.stringify(next) !== JSON.stringify(before);
  if (!changed && !doneAssigned) return bundle;
  if (!doneAssigned) next.done = false;
  if (next.done) {
    next.reviewedAt =
      changed || !before.reviewedAt
        ? new Date().toISOString()
        : before.reviewedAt;
  } else {
    next.reviewedAt = null;
  }
  const scope = domainScope(
    bundle.domains.find((domain) => domain.id === item.domainId),
  );
  const checked = review(next, "Review", run.raw.split("\n").length, scope);
  const cases = bundle.cases.slice();
  cases[caseIndex] = {
    ...item,
    reviews: { ...item.reviews, [runId]: checked },
  };
  const result = { ...bundle, cases };
  checkBundleTextBudget(result);
  return result;
}

/** A reviewed run may contain documented open errors. This never rewrites OCR output. */
export function markReviewed(bundle, caseId, runId, done) {
  if (typeof done !== "boolean") fail("Reviewed", "must be true or false.");
  return updateReview(bundle, caseId, runId, (draft) => {
    draft.done = done;
  });
}

function reopenCase(item, clearLinks = false) {
  return {
    ...item,
    reviews: Object.fromEntries(
      Object.entries(item.reviews).map(([runId, value]) => [
        runId,
        {
          ...value,
          done: false,
          reviewedAt: null,
          ...(value.clinicalReview
            ? { clinicalReview: resetClinicalReview(value.clinicalReview) }
            : {}),
          annotations: clearLinks
            ? value.annotations.map((annotation) => ({
                ...annotation,
                conceptIds: [],
                ruleIds: [],
                ...(annotation.clinical
                  ? {
                      clinical: {
                        ...annotation.clinical,
                        decision: "unreviewed",
                      },
                    }
                  : {}),
              }))
            : value.annotations.map((annotation) =>
                annotation.clinical
                  ? {
                      ...annotation,
                      clinical: {
                        ...annotation.clinical,
                        decision: "unreviewed",
                      },
                    }
                  : annotation,
              ),
        },
      ]),
    ),
  };
}

/** Assignment changes invalidate inspection and remove links scoped to the former domain. */
export function assignDomain(bundle, caseId, domainId) {
  const checked = validateBundle(bundle);
  const caseIndex = checked.cases.findIndex((item) => item.id === caseId);
  if (caseIndex < 0) fail("Case", `unknown id "${caseId}".`);
  if (domainId !== null) {
    id(domainId, "Domain assignment");
    if (!checked.domains.some((domain) => domain.id === domainId)) {
      fail("Domain assignment", `unknown domain id "${domainId}".`);
    }
  }
  const item = checked.cases[caseIndex];
  if (item.domainId === domainId)
    return bundle.schemaVersion === 3 ? bundle : checked;
  checked.cases[caseIndex] = { ...reopenCase(item, true), domainId };
  return checked;
}

/** Save a profile revision. Domain rules describe review criteria; they are not compliance results. */
export function saveDomain(bundle, domain) {
  const checked = validateBundle(bundle);
  object(domain, "Domain");
  const domainId = id(domain.id, "Domain.id");
  const domainIndex = checked.domains.findIndex((item) => item.id === domainId);
  const before = checked.domains[domainIndex];
  // Profile versions are assigned here, never accepted from the editor.
  const proposed = domainProfile(
    { ...domain, version: before?.version ?? 1 },
    "Domain",
  );
  if (before && JSON.stringify(before) === JSON.stringify(proposed)) {
    return bundle.schemaVersion === 3 ? bundle : checked;
  }
  if (before) {
    if (before.version === Number.MAX_SAFE_INTEGER)
      fail(
        "Domain.version",
        "cannot be incremented beyond the safe integer limit.",
      );
    proposed.version = before.version + 1;
    const scope = domainScope(proposed);
    for (const item of checked.cases.filter(
      (item) => item.domainId === domainId,
    )) {
      for (const value of Object.values(item.reviews)) {
        for (const annotation of value.annotations) {
          for (const [field, kind, known] of [
            ["conceptIds", "concept", scope.concepts],
            ["ruleIds", "rule", scope.rules],
          ]) {
            for (const reference of annotation[field]) {
              if (!known.has(reference)) {
                fail(
                  "Domain",
                  `cannot remove ${kind} "${reference}"; finding "${annotation.id}" in "${item.title}" still references it. Remove that finding link first.`,
                );
              }
            }
          }
        }
      }
    }
    checked.domains[domainIndex] = proposed;
    checked.cases = checked.cases.map((item) =>
      item.domainId === domainId ? reopenCase(item) : item,
    );
  } else {
    if (checked.domains.length >= LIMITS.domains)
      fail(
        "Bundle.domains",
        `cannot contain more than ${LIMITS.domains} domains.`,
      );
    checked.domains.push(proposed);
  }
  return validateBundle(checked);
}

/** Normalize drag endpoints to image-relative coordinates; callers discard zero-area drags. */
export function normalizeBox(x1, y1, x2, y2) {
  if (![x1, y1, x2, y2].every(Number.isFinite))
    fail("Box coordinates", "must be finite numbers.");
  const clamp = (value) => Math.max(0, Math.min(1, value));
  const left = clamp(Math.min(x1, x2));
  const top = clamp(Math.min(y1, y2));
  return {
    x: left,
    y: top,
    w: clamp(Math.max(x1, x2)) - left,
    h: clamp(Math.max(y1, y2)) - top,
  };
}

export function createAnnotation(lineRange = null, imageBox = null) {
  const annotationId =
    globalThis.crypto?.randomUUID?.() ||
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return {
    id: `ann-${annotationId}`,
    box: imageBox === null ? null : box(imageBox, "Annotation.box"),
    lines:
      lineRange === null
        ? null
        : lines(lineRange, "Annotation.lines", Number.MAX_SAFE_INTEGER),
    category: "other",
    note: "",
    correction: "",
    status: "open",
    conceptIds: [],
    ruleIds: [],
  };
}

export function exportBundle(bundle) {
  const validated = validateBundle(bundle);
  return JSON.stringify(
    { ...validated, exportedAt: new Date().toISOString() },
    null,
    2,
  );
}
