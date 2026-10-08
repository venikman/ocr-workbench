import { useEffect, useId, useRef, useState } from "react";
import {
  blankClinicalContext,
  blankClinicalReview,
  CLINICAL_CHECKS,
  CLINICAL_OPTIONS,
} from "./healthcare.js";

function useDialog() {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return ref;
}

export function ClinicalReviewDialog({ review, onSave, onClose }) {
  const headingId = useId();
  const ref = useDialog();
  const [draft, setDraft] = useState(() =>
    structuredClone(review.clinicalReview || blankClinicalReview()),
  );
  const [error, setError] = useState("");
  return (
    <dialog
      ref={ref}
      className="import-dialog clinical-dialog"
      onCancel={onClose}
      aria-labelledby={headingId}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          try {
            onSave(draft);
            onClose();
          } catch (err) {
            setError(err.message);
          }
        }}
      >
        <header>
          <div>
            <span className="eyebrow">HEALTHCARE · HUMAN REVIEW</span>
            <h2 id={headingId}>Check this page and OCR run</h2>
          </div>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </header>
        <p>
          Record what you compared with the source. These checks document your
          review; they do not authorize clinical use or establish that the
          record is complete.
        </p>
        <label>
          Patient / document identity
          <select
            value={draft.identity}
            onChange={(e) => setDraft({ ...draft, identity: e.target.value })}
          >
            <option value="unchecked">Not checked</option>
            <option value="matched">
              Matched to the intended patient and document
            </option>
            <option value="mismatch">Mismatch — stop this review</option>
            <option value="unverifiable">
              Cannot verify from available evidence
            </option>
          </select>
        </label>
        <p className="field-help">
          Compare against the intended record, including identifiers and
          encounter/date. For the synthetic example, use its fictional reference
          header. OCR alone cannot establish a match.
        </p>
        <fieldset className="clinical-checks">
          <legend>Source comparison</legend>
          {Object.entries(CLINICAL_CHECKS).map(([key, label]) => (
            <label key={key}>
              <input
                type="checkbox"
                checked={draft.checks[key]}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    checks: { ...draft.checks, [key]: e.target.checked },
                  })
                }
              />
              {label}
            </label>
          ))}
        </fieldset>
        <label>
          Reviewer label{" "}
          <input
            maxLength={160}
            value={draft.reviewer}
            onChange={(e) => setDraft({ ...draft, reviewer: e.target.value })}
            placeholder="Self-entered label; not an authenticated signature"
          />
        </label>
        <label>
          Review note{" "}
          <textarea
            rows={3}
            maxLength={4000}
            value={draft.note}
            onChange={(e) => setDraft({ ...draft, note: e.target.value })}
            placeholder="Record limitations or the reference used to verify identity."
          />
        </label>
        <p className="field-help">
          Editing findings or the domain clears the identity check and
          checkboxes. Resolve findings before marking reviewed. Unfinished work
          can be exported as draft.
        </p>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <footer>
          <span>
            {review.annotations.filter((a) => a.status === "open").length}{" "}
            unresolved findings
          </span>
          <button className="primary">Save review checks</button>
        </footer>
      </form>
    </dialog>
  );
}

const labels = {
  subject: "Statement subject",
  assertion: "Assertion / negation",
  temporality: "Time context",
  eventStatus: "Care / event status",
  decision: "Mapping decision",
};
const display = {
  accepted: "Accepted by reviewer",
  rejected: "Rejected mapping",
  "needs-review": "Needs further review",
  "not-documented": "Not documented (not a negative finding)",
  "not-performed": "Explicitly not performed",
  "not-applicable": "Not applicable",
  unreviewed: "Not reviewed",
};
export function ClinicalContextDialog({ annotation, onSave, onClose }) {
  const headingId = useId();
  const ref = useDialog();
  const [draft, setDraft] = useState(() =>
    structuredClone(annotation.clinical || blankClinicalContext()),
  );
  const [error, setError] = useState("");
  return (
    <dialog
      ref={ref}
      className="import-dialog clinical-dialog"
      onCancel={onClose}
      aria-labelledby={headingId}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          try {
            onSave(draft);
            onClose();
          } catch (err) {
            setError(err.message);
          }
        }}
      >
        <header>
          <div>
            <span className="eyebrow">SOURCE-LINKED MAPPING</span>
            <h2 id={headingId}>Clinical context</h2>
          </div>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </header>
        <p>
          Describe only what this source supports. Missing documentation does
          not establish missing care. An order does not establish that care was
          performed.
        </p>
        <blockquote className="clinical-evidence">
          {annotation.note || "Add a finding note before accepting a mapping."}
        </blockquote>
        <div className="clinical-fields">
          {Object.entries(CLINICAL_OPTIONS)
            .filter(([key]) => key !== "decision")
            .map(([key, options]) => (
              <label key={key}>
                {labels[key]}
                <select
                  value={draft[key]}
                  onChange={(e) =>
                    setDraft({ ...draft, [key]: e.target.value })
                  }
                >
                  {options.map((value) => (
                    <option key={value} value={value}>
                      {display[value] || value.replaceAll("-", " ")}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          <label>
            Value exactly as documented{" "}
            <input
              maxLength={2000}
              value={draft.value}
              onChange={(e) => setDraft({ ...draft, value: e.target.value })}
              placeholder="Preserve decimals and qualifiers"
            />
          </label>
          <label>
            Unit exactly as documented{" "}
            <input
              maxLength={120}
              value={draft.unit}
              onChange={(e) => setDraft({ ...draft, unit: e.target.value })}
              placeholder="Leave empty if not documented"
            />
          </label>
        </div>
        <label>
          {labels.decision}
          <select
            value={draft.decision}
            onChange={(e) => setDraft({ ...draft, decision: e.target.value })}
          >
            {CLINICAL_OPTIONS.decision.map((value) => (
              <option key={value} value={value}>
                {display[value]}
              </option>
            ))}
          </select>
        </label>
        <p className="field-help">
          “Accepted by reviewer” requires a source image box, a note, and at
          least one linked domain concept. It records a mapping decision, not a
          diagnosis. Unknown values stay unknown; no unit conversion is applied.
        </p>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <footer>
          <span>Manual abstraction · retained in JSON export</span>
          <button className="primary">Save clinical context</button>
        </footer>
      </form>
    </dialog>
  );
}
