// One wholly synthetic page with actual, unchanged local OCR output.
// Seed annotations are open review prompts, except the observed identity-line separator artifact.
// Hashes, source, reproduction, and scope: HEALTHCARE-SAMPLE.md.
const healthcareCases = [
  {
    id: "synthetic-clinical-note",
    domainId: "clinical-abstraction",
    title: "Synthetic clinical note · Meaning and evidence checks",
    source: {
      image: "/assets/healthcare/synthetic-clinical-note.png",
      page: 1,
      width: 1530,
      height: 1980,
    },
    runs: [
      {
        id: "tesseract-psm3",
        model: "Tesseract 5.5.2 · PSM 3",
        raw: "SYNTHETIC / NOT A PATIENT RECORD\n\nClinical document abstraction exercise\nAll content and identifiers are fictional. Not clinical guidance.\n\nDOCUMENT AND ENCOUNTER\n\nDocument ID: DEMO-DOCUMENT-001__— Page: 1 of 1\nPatient ID: DEMO-PATIENT-ALPHA\n\nEncounter ID: DEMO-ENCOUNTER-001\n\nEncounter date: 2026-01-10 Note date: 2026-01-11\n\nSUBJECT AND ASSERTION STATUS\n\nPatient reports mild fatigue. Patient denies chest pain.\nFamily history: Mother has diabetes mellitus.\n\nPatient diabetes status: not documented in this note.\nAllergies: unknown; verification is pending.\n\nHISTORY AND MEDICATION LIST\n\nPast procedure: appendectomy, documented in 2014.\nHistorical list: Example medicine A, 0.5 mg, oral, once daily.\nCurrent use is unverified. This is not a medication order.\n\nRECORDED RESULT\n\nGlucose: 104 mg/dL. Specimen date: 2026-01-09.\nResult date: 2026-01-10. Interpretation: not recorded.\n\nPLAN AND FOLLOW-UP\n\nECG ordered for 2026-01-17.\nCompletion and result are not documented in this note.\nAn order alone does not establish that the test was performed.\n\nREVIEW EXERCISE\n\nCheck source fidelity, identity, subject, negation, time, and units.\nMissing documentation does not prove missing care.\nDo not use this page for patient care or treatment decisions.\n\nSynthetic evaluation fixture /OCR Workbench / 1\n",
        origin:
          "Actual local OCR of a wholly synthetic page · English LSTM · --oem 1 --psm 3 · 180 dpi · 2026-10-07 · HEALTHCARE-SAMPLE.md",
      },
    ],
    reviews: {
      "tesseract-psm3": {
        annotations: [
          {
            id: "healthcare-seed-identity",
            box: {
              x: 0.058824,
              y: 0.170202,
              w: 0.882353,
              h: 0.088889,
            },
            lines: {
              start: 8,
              end: 13,
            },
            category: "text",
            note: "OCR added separator characters after the document ID. Check document, patient, encounter, and date fields independently; these are synthetic identifiers.",
            correction: "",
            status: "open",
            conceptIds: ["patient", "encounter", "source-page"],
            ruleIds: ["identity-context"],
          },
          {
            id: "healthcare-seed-negation",
            box: {
              x: 0.058824,
              y: 0.315657,
              w: 0.882353,
              h: 0.021212,
            },
            lines: {
              start: 17,
              end: 17,
            },
            category: "other",
            note: 'Review prompt: preserve "denies chest pain" as a negated patient symptom. This is a meaning check, not a detected OCR error.',
            correction: "",
            status: "open",
            conceptIds: ["clinical-assertion", "condition", "negation"],
            ruleIds: ["negation-uncertainty"],
          },
          {
            id: "healthcare-seed-family-history",
            box: {
              x: 0.058824,
              y: 0.339394,
              w: 0.882353,
              h: 0.045455,
            },
            lines: {
              start: 18,
              end: 20,
            },
            category: "other",
            note: "Review prompt: diabetes concerns the mother; the patient's diabetes status is not documented. Missing documentation is not a negative diagnosis.",
            correction: "",
            status: "open",
            conceptIds: ["patient", "clinical-assertion", "condition"],
            ruleIds: ["subject-attribution", "negation-uncertainty"],
          },
          {
            id: "healthcare-seed-allergy",
            box: {
              x: 0.058824,
              y: 0.386869,
              w: 0.882353,
              h: 0.021212,
            },
            lines: {
              start: 21,
              end: 21,
            },
            category: "other",
            note: "Review prompt: allergy status is unknown and awaiting verification. Do not map it to no known allergies.",
            correction: "",
            status: "open",
            conceptIds: ["allergy", "negation", "clinical-assertion"],
            ruleIds: ["negation-uncertainty"],
          },
          {
            id: "healthcare-seed-history",
            box: {
              x: 0.058824,
              y: 0.461111,
              w: 0.882353,
              h: 0.021212,
            },
            lines: {
              start: 25,
              end: 25,
            },
            category: "other",
            note: "Review prompt: preserve appendectomy as a historical procedure reported for 2014, not a current procedure.",
            correction: "",
            status: "open",
            conceptIds: ["procedure", "clinical-assertion"],
            ruleIds: ["event-status"],
          },
          {
            id: "healthcare-seed-medication",
            box: {
              x: 0.058824,
              y: 0.484848,
              w: 0.882353,
              h: 0.045455,
            },
            lines: {
              start: 26,
              end: 27,
            },
            category: "other",
            note: "Review prompt: keep 0.5 mg, oral, once daily together. This is a historical list; current use is unverified and no medication order is established.",
            correction: "",
            status: "open",
            conceptIds: [
              "medication",
              "quantity",
              "unit",
              "clinical-assertion",
            ],
            ruleIds: ["medication-detail", "event-status"],
          },
          {
            id: "healthcare-seed-result",
            box: {
              x: 0.058824,
              y: 0.582828,
              w: 0.882353,
              h: 0.045455,
            },
            lines: {
              start: 31,
              end: 32,
            },
            category: "other",
            note: "Review prompt: retain 104 mg/dL and the distinct specimen and result dates. The source provides no clinical interpretation.",
            correction: "",
            status: "open",
            conceptIds: ["observation", "quantity", "unit", "encounter"],
            ruleIds: ["value-unit-date"],
          },
          {
            id: "healthcare-seed-plan",
            box: {
              x: 0.058824,
              y: 0.680808,
              w: 0.882353,
              h: 0.068687,
            },
            lines: {
              start: 36,
              end: 38,
            },
            category: "other",
            note: "Review prompt: ECG is ordered for a future date; completion and result are not documented. Do not map the order to a performed test, or missing documentation to nonperformance.",
            correction: "",
            status: "open",
            conceptIds: ["plan", "procedure", "clinical-assertion"],
            ruleIds: ["event-status"],
          },
        ],
        done: false,
        reviewedAt: null,
      },
    },
  },
];

export function createHealthcareCases() {
  return structuredClone(healthcareCases);
}
