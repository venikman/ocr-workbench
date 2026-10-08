// These are reviewer statements about document evidence, never diagnoses or care decisions.
export const CLINICAL_CHECKS = {
  subject: "Patient statements are separated from family or other subjects.",
  negation:
    "Negated, uncertain, and not documented statements remain distinct.",
  temporality:
    "Dates, history, orders, plans, and performed care remain distinct.",
  values:
    "Critical values, decimal points, doses, units, and routes were compared with the source.",
  completeness:
    "The entire page was checked for omissions, cut-off content, and reading order.",
};
export const CLINICAL_OPTIONS = {
  subject: ["unknown", "patient", "family", "other"],
  assertion: ["unknown", "present", "negated", "uncertain", "not-documented"],
  temporality: ["unknown", "current", "historical", "planned"],
  eventStatus: [
    "unknown",
    "ordered",
    "performed",
    "not-performed",
    "not-applicable",
  ],
  decision: ["unreviewed", "accepted", "rejected", "needs-review"],
};
const fail = (path, message) => {
  throw new Error(`${path}: ${message}`);
};
const exact = (value, fields, path) => {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(value))
  )
    fail(path, "must be a plain object.");
  for (const key of Object.keys(value))
    if (!fields.includes(key))
      fail(`${path}.${key}`, "is not a supported field.");
};
const text = (value, max, path) => {
  if (typeof value !== "string" || value.length > max)
    fail(path, `must be text of at most ${max} characters.`);
  return value;
};
const option = (value, options, path) => {
  if (!options.includes(value))
    fail(path, `must be one of: ${options.join(", ")}.`);
  return value;
};
export const blankClinicalContext = () => ({
  subject: "unknown",
  assertion: "unknown",
  temporality: "unknown",
  eventStatus: "unknown",
  value: "",
  unit: "",
  decision: "unreviewed",
});
export const blankClinicalReview = () => ({
  identity: "unchecked",
  reviewer: "",
  note: "",
  checks: Object.fromEntries(
    Object.keys(CLINICAL_CHECKS).map((key) => [key, false]),
  ),
});
export function validateClinicalContext(value, path = "Clinical context") {
  exact(value, [...Object.keys(CLINICAL_OPTIONS), "value", "unit"], path);
  return {
    ...Object.fromEntries(
      Object.entries(CLINICAL_OPTIONS).map(([key, options]) => [
        key,
        option(value[key], options, `${path}.${key}`),
      ]),
    ),
    value: text(value.value, 2000, `${path}.value`),
    unit: text(value.unit, 120, `${path}.unit`),
  };
}
export function validateClinicalReview(value, path = "Clinical review") {
  exact(value, ["identity", "reviewer", "note", "checks"], path);
  exact(value.checks, Object.keys(CLINICAL_CHECKS), `${path}.checks`);
  for (const key of Object.keys(CLINICAL_CHECKS))
    if (typeof value.checks[key] !== "boolean")
      fail(`${path}.checks.${key}`, "must be true or false.");
  return {
    identity: option(
      value.identity,
      ["unchecked", "matched", "mismatch", "unverifiable"],
      `${path}.identity`,
    ),
    reviewer: text(value.reviewer, 160, `${path}.reviewer`),
    note: text(value.note, 4000, `${path}.note`),
    checks: { ...value.checks },
  };
}
export function resetClinicalReview(value) {
  return {
    ...blankClinicalReview(),
    reviewer: value.reviewer,
    note: value.note,
  };
}
export function assertClinicalComplete(review, path) {
  const value = review.clinicalReview;
  if (!value || value.identity !== "matched")
    fail(
      path,
      "verify the patient/document identity in Clinical review before marking reviewed.",
    );
  if (!value.reviewer.trim())
    fail(
      path,
      "add a reviewer label in Clinical review (this is not authenticated identity).",
    );
  if (Object.values(value.checks).some((checked) => !checked))
    fail(path, "complete every Clinical review check before marking reviewed.");
  for (const annotation of review.annotations) {
    if (annotation.status !== "resolved")
      fail(
        path,
        "resolve each healthcare finding before marking reviewed; unresolved work can still be exported as draft.",
      );
    if (
      annotation.clinical &&
      !["accepted", "rejected"].includes(annotation.clinical.decision)
    )
      fail(
        path,
        "review each clinical mapping decision before marking reviewed.",
      );
  }
}
export function assertClinicalMapping(annotation, path) {
  if (annotation.clinical?.decision !== "accepted") return;
  if (
    !annotation.box ||
    !annotation.note.trim() ||
    !annotation.conceptIds.length
  )
    fail(
      path,
      "an accepted clinical mapping needs a source image region, a note, and a domain concept.",
    );
}
