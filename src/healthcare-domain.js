// Local document-abstraction policy, not a clinical guideline or a terminology standard.
// The concepts describe types; they are not patient facts or extracted instances.
export const healthcareDomain = {
  id: "clinical-abstraction",
  name: "Healthcare · Clinical document review",
  version: 1,
  reviewPolicy: "clinical",
  description:
    "Human review of source fidelity and candidate clinical assertions. Use the synthetic example to evaluate identity, negation, subject, time, quantities, and source evidence. This profile does not diagnose, recommend treatment, establish performed care, or provide FHIR/SNOMED conformance. Its rules are local review guidance, not clinical authority.",
  ontology: {
    concepts: [
      {
        id: "patient",
        label: "Patient reference",
        description:
          "The subject identified in a document. A label or OCR match is not a verified patient identity or authorization to merge records.",
      },
      {
        id: "encounter",
        label: "Encounter reference",
        description:
          "A stated care event or context, with its own identifier and date. Document creation, encounter, specimen, and result dates may differ.",
      },
      {
        id: "source-page",
        label: "Source page",
        description:
          "The original page image used to check an OCR reading. Its existence does not establish the truth or completeness of every clinical statement on it.",
      },
      {
        id: "clinical-assertion",
        label: "Candidate clinical assertion",
        description:
          "A proposed interpretation of source text with an explicit subject, assertion status, and time context. It remains a candidate until a reviewer records a mapping decision.",
      },
      {
        id: "condition",
        label: "Condition or symptom",
        description:
          "A condition or symptom mentioned in a document. Preserve whether it concerns the patient or someone else and whether it is present, denied, uncertain, historical, or not documented.",
      },
      {
        id: "medication",
        label: "Medication mention",
        description:
          "A named medication and its stated dose, unit, route, frequency, and status. A historical list, prescription, order, and administration describe different things.",
      },
      {
        id: "allergy",
        label: "Allergy status",
        description:
          "A stated allergy, intolerance, or allergy-status qualifier. Unknown or undocumented allergy status is not evidence of no known allergies.",
      },
      {
        id: "observation",
        label: "Recorded observation",
        description:
          "A reported result or measurement with the source's value, unit, date, and context. A test order is not a result, and a transcribed value is not a clinical interpretation.",
      },
      {
        id: "quantity",
        label: "Quantity",
        description:
          "The complete recorded number, including leading zero, decimal point, comparison sign, range, or uncertainty. Do not silently round or convert during transcription.",
      },
      {
        id: "unit",
        label: "Unit",
        description:
          "The exact unit linked to a quantity. Similar-looking strings may have different meanings; an absent unit remains absent until separately resolved.",
      },
      {
        id: "procedure",
        label: "Procedure mention",
        description:
          "A procedure described as planned, ordered, performed, historical, or otherwise qualified. Preserve the stated status; lack of a result does not prove a procedure was not performed.",
      },
      {
        id: "plan",
        label: "Plan or order",
        description:
          "An intended or requested action. An order or future appointment is not evidence of execution, completion, or a result.",
      },
      {
        id: "negation",
        label: "Assertion qualifier",
        description:
          "Words such as denies, possible, unknown, or not documented, together with the phrase they qualify. Absence of documentation differs from an explicitly negated finding.",
      },
      {
        id: "evidence",
        label: "Source evidence anchor",
        description:
          "A page region and OCR line range supporting a reading or mapping decision. It supports a bounded statement about the source, not blanket clinical correctness.",
      },
    ],
    relations: [
      {
        id: "encounter-concerns-patient",
        from: "encounter",
        to: "patient",
        label: "may concern, after identity is checked",
      },
      {
        id: "assertion-concerns-subject",
        from: "clinical-assertion",
        to: "patient",
        label: "may concern the patient; other subjects remain explicit",
      },
      {
        id: "assertion-supported-by-evidence",
        from: "clinical-assertion",
        to: "evidence",
        label: "must cite supporting source evidence",
      },
      {
        id: "evidence-located-on-page",
        from: "evidence",
        to: "source-page",
        label: "locates a source passage on",
      },
      {
        id: "qualifier-scopes-assertion",
        from: "negation",
        to: "clinical-assertion",
        label: "qualifies the stated assertion",
      },
      {
        id: "assertion-describes-condition",
        from: "clinical-assertion",
        to: "condition",
        label: "may describe, with subject and time preserved",
      },
      {
        id: "assertion-describes-allergy",
        from: "clinical-assertion",
        to: "allergy",
        label: "may describe an explicit allergy status",
      },
      {
        id: "medication-has-quantity",
        from: "medication",
        to: "quantity",
        label: "may state a dose quantity",
      },
      {
        id: "quantity-has-unit",
        from: "quantity",
        to: "unit",
        label: "must retain the source unit when supplied",
      },
      {
        id: "observation-has-quantity",
        from: "observation",
        to: "quantity",
        label: "may record a measured quantity",
      },
      {
        id: "plan-concerns-procedure",
        from: "plan",
        to: "procedure",
        label: "requests or intends; does not establish execution of",
      },
    ],
  },
  specification: {
    rules: [
      {
        id: "identity-context",
        title: "Check patient and encounter context",
        description:
          "Compare identifiers and page context with the intended source before accepting a mapping. Keep patient, encounter, document, and page identifiers distinct. Do not join records on an OCR name match or on a synthetic example identifier.",
        conceptIds: ["patient", "encounter", "source-page", "evidence"],
      },
      {
        id: "negation-uncertainty",
        title: "Preserve negation and missing information",
        description:
          "Retain the qualifier and the phrase it governs. 'Denies chest pain' is a negated patient symptom; 'allergies unknown' is unknown, not no known allergies. 'Not documented' does not establish absence of disease or care.",
        conceptIds: ["clinical-assertion", "condition", "allergy", "negation"],
      },
      {
        id: "subject-attribution",
        title: "Keep family history separate from patient findings",
        description:
          "Identify who each statement concerns. A condition reported for a mother or other relative must not become a patient diagnosis. Leave unresolved subject attribution explicit for review.",
        conceptIds: ["patient", "clinical-assertion", "condition"],
      },
      {
        id: "event-status",
        title: "Separate history, current state, orders, and performed work",
        description:
          "Preserve historical and current qualifiers. A future order or care plan is not a performed procedure or a result. Missing execution documentation must not become a claim that care was not performed.",
        conceptIds: [
          "encounter",
          "clinical-assertion",
          "procedure",
          "plan",
          "observation",
          "medication",
        ],
      },
      {
        id: "medication-detail",
        title: "Check the complete medication statement",
        description:
          "Review medication text, decimal dose, unit, route, frequency, and stated status together against the image. Do not infer current use from a historical list, equate an order with administration, supply missing detail, or convert units silently.",
        conceptIds: [
          "medication",
          "quantity",
          "unit",
          "clinical-assertion",
          "evidence",
        ],
      },
      {
        id: "value-unit-date",
        title: "Keep results with their units and dates",
        description:
          "Check numbers, leading zeros, decimal points, signs, units, and row associations together. Preserve the distinction between encounter, specimen, result, and document dates. Do not infer a normal/abnormal interpretation or replace an unreadable value with a guess.",
        conceptIds: [
          "observation",
          "quantity",
          "unit",
          "encounter",
          "evidence",
        ],
      },
      {
        id: "evidence-review",
        title: "Record evidence and an explicit review decision",
        description:
          "Keep original OCR unchanged. Anchor each candidate interpretation to a source region and relevant OCR lines; record an explicit reviewer decision and unresolved uncertainty. Confidence, a completed review, or a passing software test is not clinical correctness or permission to write into an EHR.",
        conceptIds: ["clinical-assertion", "source-page", "evidence"],
      },
    ],
  },
};
