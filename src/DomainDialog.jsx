import { useEffect, useId, useRef, useState } from "react";
import { foodInspectionDomain } from "./domains.js";
import { healthcareDomain } from "./healthcare-domain.js";

const uid = (prefix) => `${prefix}-${crypto.randomUUID()}`;
const blankDomain = () => ({
  id: uid("domain"),
  name: "",
  version: 1,
  description: "",
  ontology: { concepts: [], relations: [] },
  specification: { rules: [] },
});
const toggle = (values, id) =>
  values.includes(id)
    ? values.filter((value) => value !== id)
    : [...values, id];

function useDialog() {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return ref;
}

function ConceptChoices({ concepts, selected, onChange, label }) {
  return (
    <fieldset className="concept-choices">
      <legend>{label}</legend>
      {concepts.length === 0 && <p>Add concepts in the ontology first.</p>}
      {concepts.map((concept) => (
        <label key={concept.id}>
          <input
            type="checkbox"
            checked={selected.includes(concept.id)}
            onChange={() => onChange(toggle(selected, concept.id))}
          />
          {concept.label || "Untitled concept"}
        </label>
      ))}
    </fieldset>
  );
}

export function DomainDialog({
  domains,
  initialId,
  onSave,
  onAssign,
  onClose,
}) {
  const initial = domains.find((d) => d.id === initialId) || domains[0];
  const [selectedId, setSelectedId] = useState(initial?.id ?? null);
  const [draft, setDraft] = useState(() =>
    structuredClone(initial || blankDomain()),
  );
  const [editing, setEditing] = useState(!initial);
  const [section, setSection] = useState("specification");
  const [error, setError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const headingId = useId();
  const ref = useDialog();
  const errorRef = useRef(null);
  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ block: "nearest" });
  }, [error]);
  const saved = domains.find((d) => d.id === selectedId);
  const current = editing ? draft : saved;
  const concepts = current.ontology.concepts;
  const rules = current.specification.rules;
  const conceptName = (id) => concepts.find((c) => c.id === id)?.label || id;
  function choose(id) {
    setSelectedId(id);
    setError("");
    setSavedMessage("");
  }
  function begin(template) {
    setDraft(
      template
        ? {
            ...structuredClone(template),
            id: uid("domain"),
            name: `${template.name} copy`,
            version: 1,
          }
        : blankDomain(),
    );
    setSelectedId(null);
    setEditing(true);
    setError("");
    setSavedMessage("");
    setSection("specification");
  }
  function edit() {
    setDraft(structuredClone(saved));
    setEditing(true);
    setError("");
    setSavedMessage("");
  }
  function cancel() {
    if (saved || domains.length) {
      setSelectedId(saved?.id || domains[0].id);
      setEditing(false);
      setError("");
    } else onClose();
  }
  function patchItem(group, id, patch) {
    setDraft((d) => {
      const next = structuredClone(d);
      const list =
        group === "rules" ? next.specification.rules : next.ontology[group];
      Object.assign(
        list.find((item) => item.id === id),
        patch,
      );
      return next;
    });
  }
  function add(group) {
    setDraft((d) => {
      const next = structuredClone(d);
      if (group === "rules")
        next.specification.rules.push({
          id: uid("rule"),
          title: "",
          description: "",
          conceptIds: [],
        });
      else if (group === "concepts")
        next.ontology.concepts.push({
          id: uid("concept"),
          label: "",
          description: "",
        });
      else
        next.ontology.relations.push({
          id: uid("relation"),
          from: concepts[0]?.id || "",
          to: concepts[0]?.id || "",
          label: "",
        });
      return next;
    });
  }
  function remove(group, id) {
    if (
      group === "concepts" &&
      (draft.specification.rules.some((rule) => rule.conceptIds.includes(id)) ||
        draft.ontology.relations.some(
          (relation) => relation.from === id || relation.to === id,
        ))
    ) {
      setError(
        `Remove this concept's links from rules and relations before removing the concept itself.`,
      );
      return;
    }
    setError("");
    setDraft((d) => {
      const next = structuredClone(d);
      if (group === "rules")
        next.specification.rules = next.specification.rules.filter(
          (item) => item.id !== id,
        );
      else
        next.ontology[group] = next.ontology[group].filter(
          (item) => item.id !== id,
        );
      return next;
    });
  }
  function save(e) {
    e.preventDefault();
    try {
      const result = onSave(draft);
      setSelectedId(result.id);
      setEditing(false);
      setError("");
      setSavedMessage(
        `Saved ${result.name} · v${result.version}. Use this domain to assign it to the current document.`,
      );
    } catch (err) {
      setError(err.message);
    }
  }
  return (
    <dialog
      ref={ref}
      className="import-dialog domain-dialog"
      onCancel={onClose}
      aria-labelledby={headingId}
    >
      <form onSubmit={save} noValidate>
        <header>
          <div>
            <span className="eyebrow">DOMAIN LIBRARY</span>
            <h2 id={headingId}>Specification & ontology</h2>
          </div>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="domain-library-controls">
          <label>
            Profile
            <select
              aria-label="Library domain"
              disabled={editing}
              value={selectedId || ""}
              onChange={(e) => choose(e.target.value)}
            >
              {!selectedId && <option value="">New domain</option>}
              {domains.map((domain) => (
                <option key={domain.id} value={domain.id}>
                  {domain.name} · v{domain.version}
                </option>
              ))}
            </select>
          </label>
          {!editing && (
            <>
              <button type="button" onClick={() => begin(healthcareDomain)}>
                Healthcare template
              </button>
              <button type="button" onClick={() => begin()}>
                New domain
              </button>
              <button type="button" onClick={() => begin(saved)}>
                Duplicate
              </button>
              <button type="button" onClick={edit}>
                Edit profile
              </button>
            </>
          )}
          {editing && !domains.length && !draft.name && (
            <button
              type="button"
              onClick={() => setDraft(structuredClone(healthcareDomain))}
            >
              Start from healthcare
            </button>
          )}
          {editing && !domains.length && !draft.name && (
            <button
              type="button"
              onClick={() => setDraft(structuredClone(foodInspectionDomain))}
            >
              Start from food inspection
            </button>
          )}
        </div>
        <div className="domain-intro">
          {editing ? (
            <>
              <label>
                Domain name
                <input
                  value={draft.name}
                  maxLength={160}
                  placeholder="e.g. Insurance claims"
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </label>
              <label>
                Review policy
                <select
                  value={draft.reviewPolicy || "general"}
                  onChange={(e) => {
                    const next = { ...draft };
                    if (e.target.value === "clinical")
                      next.reviewPolicy = "clinical";
                    else delete next.reviewPolicy;
                    setDraft(next);
                  }}
                >
                  <option value="general">General document review</option>
                  <option value="clinical">
                    Clinical document review with required checks
                  </option>
                </select>
              </label>
              <label>
                Scope & purpose
                <textarea
                  rows="2"
                  maxLength={2000}
                  value={draft.description}
                  placeholder="Which documents, meanings, and review questions does this profile cover?"
                  onChange={(e) =>
                    setDraft({ ...draft, description: e.target.value })
                  }
                />
              </label>
            </>
          ) : (
            <>
              <h3>
                {current.name}
                <span className="version-badge">v{current.version}</span>
              </h3>
              <p>{current.description || "No scope description supplied."}</p>
              {current.reviewPolicy === "clinical" && (
                <p className="policy-label">
                  Clinical review policy · identity, source checks, and resolved
                  findings required to mark reviewed.
                </p>
              )}
            </>
          )}
        </div>
        <nav className="domain-tabs" aria-label="Profile sections">
          <button
            type="button"
            className={section === "specification" ? "active" : ""}
            aria-pressed={section === "specification"}
            onClick={() => setSection("specification")}
          >
            Specification <span>{rules.length} rules</span>
          </button>
          <button
            type="button"
            className={section === "ontology" ? "active" : ""}
            aria-pressed={section === "ontology"}
            onClick={() => setSection("ontology")}
          >
            Ontology{" "}
            <span>
              {concepts.length} concepts · {current.ontology.relations.length}{" "}
              relations
            </span>
          </button>
        </nav>
        <section className="domain-content">
          {section === "specification" ? (
            <>
              <p className="domain-explainer">
                Rules guide a reviewer’s checks. Linking a finding records
                relevance; it does not establish that every rule has passed.
              </p>
              <div className="profile-cards">
                {rules.map((rule, index) => (
                  <article className="profile-card" key={rule.id}>
                    <div className="profile-card-heading">
                      <span className="item-index">R{index + 1}</span>
                      {editing ? (
                        <label>
                          Rule title
                          <input
                            value={rule.title}
                            maxLength={160}
                            onChange={(e) =>
                              patchItem("rules", rule.id, {
                                title: e.target.value,
                              })
                            }
                          />
                        </label>
                      ) : (
                        <h4>{rule.title}</h4>
                      )}
                      {editing && (
                        <button
                          type="button"
                          className="quiet"
                          aria-label={`Remove rule ${index + 1}`}
                          onClick={() => remove("rules", rule.id)}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    {editing ? (
                      <>
                        <label>
                          Review criterion
                          <textarea
                            rows="3"
                            maxLength={4000}
                            value={rule.description}
                            onChange={(e) =>
                              patchItem("rules", rule.id, {
                                description: e.target.value,
                              })
                            }
                          />
                        </label>
                        <ConceptChoices
                          label={`Concepts for rule ${index + 1}`}
                          concepts={concepts}
                          selected={rule.conceptIds}
                          onChange={(conceptIds) =>
                            patchItem("rules", rule.id, { conceptIds })
                          }
                        />
                      </>
                    ) : (
                      <>
                        <p>{rule.description}</p>
                        <div className="concept-tags">
                          {rule.conceptIds.map((id) => (
                            <span key={id}>{conceptName(id)}</span>
                          ))}
                        </div>
                      </>
                    )}
                  </article>
                ))}
              </div>
              {!rules.length && (
                <p className="domain-empty">
                  No review rules yet. Add a rule with a concrete criterion and
                  the concepts it concerns.
                </p>
              )}
              {editing && (
                <button type="button" onClick={() => add("rules")}>
                  + Add rule
                </button>
              )}
            </>
          ) : (
            <>
              <p className="domain-explainer">
                Concepts define shared meanings. Relations connect concept
                types; they are not extracted facts about this document.
              </p>
              <div className="profile-cards">
                {concepts.map((concept, index) => (
                  <article className="profile-card" key={concept.id}>
                    <div className="profile-card-heading">
                      <span className="item-index">C{index + 1}</span>
                      {editing ? (
                        <label>
                          Concept name
                          <input
                            value={concept.label}
                            maxLength={120}
                            onChange={(e) =>
                              patchItem("concepts", concept.id, {
                                label: e.target.value,
                              })
                            }
                          />
                        </label>
                      ) : (
                        <h4>{concept.label}</h4>
                      )}
                      {editing && (
                        <button
                          type="button"
                          className="quiet"
                          aria-label={`Remove concept ${index + 1}`}
                          onClick={() => remove("concepts", concept.id)}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    {editing ? (
                      <label>
                        Definition
                        <textarea
                          rows="3"
                          maxLength={2000}
                          value={concept.description}
                          onChange={(e) =>
                            patchItem("concepts", concept.id, {
                              description: e.target.value,
                            })
                          }
                        />
                      </label>
                    ) : (
                      <p>{concept.description}</p>
                    )}
                  </article>
                ))}
              </div>
              {!concepts.length && (
                <p className="domain-empty">
                  No concepts yet. Name the things and document elements your
                  reviewers need to distinguish.
                </p>
              )}
              {editing && (
                <button type="button" onClick={() => add("concepts")}>
                  + Add concept
                </button>
              )}
              <h3 className="relations-heading">
                Relations{" "}
                <span className="count">
                  {current.ontology.relations.length}
                </span>
              </h3>
              <div className="relation-list">
                {current.ontology.relations.map((relation, index) => (
                  <div className="relation-row" key={relation.id}>
                    {editing ? (
                      <>
                        <label>
                          From
                          <select
                            aria-label={`Relation ${index + 1} from`}
                            value={relation.from}
                            onChange={(e) =>
                              patchItem("relations", relation.id, {
                                from: e.target.value,
                              })
                            }
                          >
                            <option value="">Choose concept</option>
                            {concepts.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.label || "Untitled concept"}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Relation
                          <input
                            aria-label={`Relation ${index + 1} label`}
                            value={relation.label}
                            maxLength={120}
                            placeholder="e.g. describes"
                            onChange={(e) =>
                              patchItem("relations", relation.id, {
                                label: e.target.value,
                              })
                            }
                          />
                        </label>
                        <label>
                          To
                          <select
                            aria-label={`Relation ${index + 1} to`}
                            value={relation.to}
                            onChange={(e) =>
                              patchItem("relations", relation.id, {
                                to: e.target.value,
                              })
                            }
                          >
                            <option value="">Choose concept</option>
                            {concepts.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.label || "Untitled concept"}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button
                          type="button"
                          className="quiet"
                          aria-label={`Remove relation ${index + 1}`}
                          onClick={() => remove("relations", relation.id)}
                        >
                          Remove
                        </button>
                      </>
                    ) : (
                      <>
                        <strong>{conceptName(relation.from)}</strong>
                        <span>→ {relation.label} →</span>
                        <strong>{conceptName(relation.to)}</strong>
                      </>
                    )}
                  </div>
                ))}
              </div>
              {editing && (
                <button
                  type="button"
                  disabled={!concepts.length}
                  onClick={() => add("relations")}
                >
                  + Add relation
                </button>
              )}
            </>
          )}
        </section>
        {error && (
          <p ref={errorRef} className="error" role="alert">
            {error}
          </p>
        )}
        {savedMessage && <p role="status">{savedMessage}</p>}
        <footer className="domain-footer">
          <span>
            {editing
              ? "Saving a changed profile reopens its document reviews. Referenced concepts and rules cannot be removed."
              : "Local review guidance · no automated conformance assessment"}
          </span>
          <div>
            {editing ? (
              <>
                <button type="button" onClick={cancel}>
                  Cancel edits
                </button>
                <button className="primary" type="submit">
                  Save profile
                </button>
              </>
            ) : (
              <button
                type="button"
                className="primary"
                onClick={() => {
                  onAssign(current.id);
                  onClose();
                }}
              >
                Use this domain
              </button>
            )}
          </div>
        </footer>
      </form>
    </dialog>
  );
}

export function FindingLinksDialog({ domain, annotation, onApply, onClose }) {
  const [conceptIds, setConceptIds] = useState(annotation.conceptIds);
  const [ruleIds, setRuleIds] = useState(annotation.ruleIds);
  const [error, setError] = useState("");
  const headingId = useId();
  const ref = useDialog();
  return (
    <dialog
      ref={ref}
      className="import-dialog domain-dialog links-dialog"
      onCancel={onClose}
      aria-labelledby={headingId}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          try {
            onApply({ conceptIds, ruleIds });
            onClose();
          } catch (err) {
            setError(err.message);
          }
        }}
      >
        <header>
          <div>
            <span className="eyebrow">
              {domain.name} · v{domain.version}
            </span>
            <h2 id={headingId}>Link finding to domain</h2>
          </div>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </header>
        <blockquote className="finding-context">
          {annotation.note || "Untitled finding"}
        </blockquote>
        <p>
          Select the meanings and review rules this finding concerns. These are
          reviewer mappings, supported by the finding’s source region and OCR
          lines.
        </p>
        <div className="link-columns">
          <fieldset>
            <legend>Ontology concepts</legend>
            {domain.ontology.concepts.map((concept) => (
              <label className="link-choice" key={concept.id}>
                <input
                  type="checkbox"
                  checked={conceptIds.includes(concept.id)}
                  onChange={() => setConceptIds(toggle(conceptIds, concept.id))}
                />
                <span>
                  <strong>{concept.label}</strong>
                  <small>{concept.description}</small>
                </span>
              </label>
            ))}
            {!domain.ontology.concepts.length && <p>No concepts defined.</p>}
          </fieldset>
          <fieldset>
            <legend>Specification rules</legend>
            {domain.specification.rules.map((rule) => (
              <label className="link-choice" key={rule.id}>
                <input
                  type="checkbox"
                  checked={ruleIds.includes(rule.id)}
                  onChange={() => setRuleIds(toggle(ruleIds, rule.id))}
                />
                <span>
                  <strong>{rule.title}</strong>
                  <small>{rule.description}</small>
                </span>
              </label>
            ))}
            {!domain.specification.rules.length && <p>No rules defined.</p>}
          </fieldset>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <footer>
          <span>
            {conceptIds.length} concepts · {ruleIds.length} rules linked
          </span>
          <button className="primary" type="submit">
            Apply links
          </button>
        </footer>
      </form>
    </dialog>
  );
}
