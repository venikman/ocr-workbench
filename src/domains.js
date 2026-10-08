// Local OCR review profile derived from pages 1 and 3 of the County of Alameda
// Official Retail Food Inspection Report, retrieved 2026-10-06:
// https://deh.acgov.org/operations-assets/docs/foodsafety/OFFICIAL%20INSPECTION%20REPORT%20FORM.pdf
// Source copy and run provenance: public/assets/ and SAMPLE-SOURCES.md.
// These are source-fidelity review rules, not regulatory requirements or a
// determination that an inspection occurred, a violation exists, or a facility complies.
export const foodInspectionDomain = {
  id: "food-inspection",
  name: "Food inspection",
  version: 1,
  description:
    "A local OCR review specification for food inspection forms. The ontology names domain types and supporting document elements; its relations describe possible associations, not extracted instances. The rules check source fidelity. Seeded from the historical Alameda County form, not from current regulations.",
  ontology: {
    concepts: [
      {
        id: "inspection-record",
        label: "Inspection record",
        description:
          "A record intended to describe an inspection through facility, date, inspection-type, checklist, and observation fields. A blank report template does not establish that an inspection occurred or that its fields have values.",
      },
      {
        id: "facility",
        label: "Food facility",
        description:
          "The establishment or premises an inspection record concerns, identified on the form by facility name, address, and city. These printed labels alone do not identify an actual facility or establish its condition or compliance.",
      },
      {
        id: "permit",
        label: "Referenced permit",
        description:
          "A permit referenced through the form's permit number, permit holder, and expiration-date fields. An empty field is not a permit instance; even an entered reference alone does not establish current permit validity.",
      },
      {
        id: "source-page",
        label: "Source page",
        description:
          "The specific page image used as evidence for an OCR reading. A blank form describes fields and checklist entries; it does not establish an actual inspection or its outcome.",
      },
      {
        id: "form-field",
        label: "Form field",
        description:
          "A printed label and its associated entry area, such as facility name, permit number, date, inspection type, or signature. The label and any entered value remain distinct.",
      },
      {
        id: "checklist-item",
        label: "Checklist item",
        description:
          "A numbered printed inspection criterion, such as item 15 or item 39. Its wording is a prompt on the form, not evidence that the condition was observed.",
      },
      {
        id: "table-cell",
        label: "Table cell",
        description:
          "A bounded cell with a row and column association. Text wrapping within a cell and the two side-by-side checklist tables must not create new items or mix their values.",
      },
      {
        id: "recorded-mark",
        label: "Recorded mark",
        description:
          "A visible entered value, tick, or other mark. Keep it separate from a printed checkbox, blank entry area, printed point value, or OCR artifact.",
      },
      {
        id: "measurement",
        label: "Measurement",
        description:
          "A recorded quantity with its printed unit and row context, such as a food temperature. A temperature heading or an empty cell alone is not a measured value.",
      },
      {
        id: "observation",
        label: "Inspection observation",
        description:
          "A condition described in visibly entered inspection notes. Keep the reported condition distinct from a printed checklist prompt or section heading; an empty observations area establishes no observation.",
      },
      {
        id: "corrective-action",
        label: "Corrective action",
        description:
          "An action intended to address an inspection observation. Preserve whether the entered text describes a required, planned, or performed action. A printed heading or unmarked action option establishes no action; this is distinct from an OCR text correction.",
      },
      {
        id: "correction",
        label: "Proposed OCR correction",
        description:
          "A reviewer-proposed replacement tied to source evidence and the affected OCR context. It is separate from the original OCR and from any conclusion about the facility.",
      },
    ],
    relations: [
      {
        id: "inspection-concerns-facility",
        from: "inspection-record",
        to: "facility",
        label: "concerns the facility identified in the record",
      },
      {
        id: "inspection-recorded-under-permit",
        from: "inspection-record",
        to: "permit",
        label: "is recorded under a referenced permit, when supplied",
      },
      {
        id: "inspection-documents-observation",
        from: "inspection-record",
        to: "observation",
        label: "documents an observation, when entered",
      },
      {
        id: "observation-motivates-action",
        from: "observation",
        to: "corrective-action",
        label: "may motivate a described corrective action",
      },
      {
        id: "page-contains-field",
        from: "source-page",
        to: "form-field",
        label: "contains a labeled entry area",
      },
      {
        id: "item-occupies-cell",
        from: "checklist-item",
        to: "table-cell",
        label: "is represented in",
      },
      {
        id: "mark-refers-to-item",
        from: "recorded-mark",
        to: "checklist-item",
        label: "may refer to, when visibly associated",
      },
      {
        id: "measurement-occupies-cell",
        from: "measurement",
        to: "table-cell",
        label: "is recorded in",
      },
      {
        id: "correction-supported-by-page",
        from: "correction",
        to: "source-page",
        label: "must be supported by",
      },
    ],
  },
  specification: {
    rules: [
      {
        id: "row-association",
        title: "Preserve row and column associations",
        description:
          "Keep each numbered criterion, wrapped text, and OUT / PTS / -PTS cell with its source row. Do not merge the left and right checklist items merely because they share a horizontal line.",
        conceptIds: ["checklist-item", "table-cell"],
      },
      {
        id: "printed-versus-recorded",
        title: "Separate printed prompts from recorded facts",
        description:
          "Distinguish printed criteria, labels, point values, and checkbox outlines from entered text or marks. Preserve empty fields as empty; do not infer a violation, inspection result, or performed action from an unmarked form.",
        conceptIds: [
          "inspection-record",
          "facility",
          "permit",
          "form-field",
          "checklist-item",
          "recorded-mark",
          "observation",
          "corrective-action",
        ],
      },
      {
        id: "source-completeness",
        title: "Account for visible source content",
        description:
          "Check item numbers, headings, and cell text against the source. Flag omitted or truncated content, such as missing items 15 and 39, and do not invent content for blank areas.",
        conceptIds: [
          "source-page",
          "form-field",
          "checklist-item",
          "table-cell",
        ],
      },
      {
        id: "symbol-fidelity",
        title: "Preserve significant characters",
        description:
          "Review fractions, decimal points, slashes, minus signs, degree symbols, and percentages against the page. For example, preserve ½ in the alcohol-content criterion and distinguish the printed point notation 4/2 from a single value.",
        conceptIds: ["checklist-item", "table-cell", "measurement"],
      },
      {
        id: "measurement-context",
        title: "Keep values with their labels and units",
        description:
          "Keep any temperature value with its food-item row and the unit shown on the source form, including °F on page 3. Preserve process/location and discarded-amount column associations; do not convert units or supply missing values during transcription.",
        conceptIds: [
          "form-field",
          "table-cell",
          "recorded-mark",
          "measurement",
        ],
      },
      {
        id: "correction-evidence",
        title: "Anchor corrections to source evidence",
        description:
          "Attach each proposed correction to a source region and the affected OCR lines when available. For omissions, identify the source region and adjacent OCR context; keep the raw run unchanged and leave uncertain readings explicit for review.",
        conceptIds: ["source-page", "correction"],
      },
    ],
  },
};
