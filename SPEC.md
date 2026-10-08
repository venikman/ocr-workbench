# OCR review workbench — bounded specification

## Purpose and scope

Run local OCR on bounded image/PDF uploads and review OCR output against a source page image using an optional domain ontology and review specification, preserve original text, record located observations and proposed corrections, and carry the workspace between browser sessions through a JSON snapshot.

The interaction reference is the supplied screenshot and [Isaac Flath's OCR Examples Gallery](https://isaacflath.com/writing/ocr-examples-gallery). This implementation is a local review tool, not a reproduction of the gallery's model evaluation results.

The bundled demonstration contains two Alameda County form pages and four actual Tesseract 5.5.2 outputs (PSM 3 and PSM 6). Source attribution, execution details, asset hashes, and limitations are recorded in `SAMPLE-SOURCES.md`. Starter annotations are editable observations, not exhaustive ground truth.

## Primary screen behavior

The primary layout targets laptop viewports at 1280×720, 1366×768, and 1440×900, including reduced CSS workspace from browser zoom. Keep the toolbar and three review panes available without whole-page scrolling. Source images default to width fitting with independent vertical scrolling; whole-page fitting remains selectable. Finding selection scrolls the associated source box, raw lines, and editing card within their panes. Source auto-scrolling must not change pointer coordinates during drawing, movement, or resizing. A different source document resets the source scroll position. Dialog headings and footer actions remain reachable in short viewports. Browser measurements and performed checks belong in `design-qa.md`.

## Objects kept separate

| Object | Current representation and meaning |
| --- | --- |
| Source page | Case ID; raster image; page number; optional pixel dimensions and attribution URL; nullable `domainId`. |
| OCR output | Run ID, model/method label, unchanged raw text, and origin description. An imported output does not establish that its claimed model ran. |
| Domain ontology | Named concepts and directed relations used to interpret documents in one domain. These declarations do not establish that any particular document entity was extracted. |
| Domain review specification | Checkable local reviewer guidance whose rules refer to ontology concepts; separate from observations and review completion. |
| Error annotation / finding | Run-specific ID, optional normalized image box, optional original-line range, category, note, open/resolved status, and scoped `conceptIds`/`ruleIds`. A mapping identifies relevance, not a passed rule. |
| Proposed correction | Separate annotation text; never automatically applied to the original OCR. Resolved status is a reviewer designation, not proof that OCR was corrected. |
| Review completion | Per-run `done` flag and UTC `reviewedAt`; documents the reviewer action, not OCR accuracy or domain-specification conformance. No authenticated reviewer identity is recorded. |
| Export | Version 3 JSON snapshot with export time, domains, sources, runs, annotations, and completion state. A browser download request does not prove that the user saved the file. |

## Domain profile contract

The root `domains` array stores the current version of each domain: `{id, name, version, description, ontology, specification}`. `version` is a positive integer. `ontology.concepts` contains `{id, label, description}`; `ontology.relations` contains `{id, from, to, label}` with existing concept endpoints. `specification.rules` contains `{id, title, description, conceptIds}` with existing concept references. Concept and rule IDs are local to their domain.

A case assigns one `domainId` or remains unassigned; all its OCR runs share that selection. Findings may map to concepts and rules only in that domain. The supplied food-inspection profile concerns faithful extraction of the example form, not food-safety or regulatory compliance. Users can create other domains through the visual editor.

`saveDomain` creates version 1, increments the current version on a content change, and leaves an identical save unchanged. Changes reopen reviews in every linked case. Removing a concept or rule still used by a finding is rejected. `assignDomain` changes the case's domain, clears its findings' scoped concept/rule links, preserves notes/corrections/anchors, and reopens all its runs.

Profile revisions are current snapshots, not a durable version archive. Prior versions are recoverable only through prior exports or available session Undo. Export embeds the current domain definitions. No per-custom-rule assessment results, automatic ontology extraction, or conformance score exist; manual review is the intended checking method, while the software validates structure and references.

## Implemented acceptance contract

These behaviors are present in `src/Workbench.jsx`, `src/DomainDialog.jsx`, `src/review.js`, and `src/preview.js`. `src/index.jsx` exports the embeddable client component; `src/App.jsx` configures the standalone demo. The checks below define acceptance; this document does not report that those checks ran or passed.

| ID | Required behavior | Acceptance check / harness |
| --- | --- | --- |
| R1 | Review edits and proposed corrections preserve raw OCR and source data. Reviews belong to a particular case/run pair. | Core tests compare old/new bundles; browser check switches between outputs and verifies independent annotations. |
| R2 | Boxes use image-relative `x/y/w/h` values in `[0,1]`, with positive size inside the image. Users can draw, move, and resize them. | Core tests cover reverse drags, bounds, and invalid numbers; browser check repeats selection and movement after zoom and fit. |
| R3 | Line anchors are one-based inclusive ranges inside the selected run's original text. Click sets the start; Shift-click extends the range. | Core tests reject invalid ranges; browser check selects a range and restores the same highlight through its annotation. |
| R4 | Each annotation must have a nonblank note and either a box or line range before review completion. Known open errors may remain for general domains; clinical policy adds the gates below. Subsequent annotation edits reopen the review. | Core tests exercise completion, rejected incomplete evidence, preserved raw text, and reopening after correction edits. |
| R5 | IndexedDB autosave is opt-in each session; existing saved work is restored without enabling writes. “Saved locally” follows transaction completion; failed or unavailable storage produces a visible warning. | Browser check reloads after an edit; failure-injection check verifies that unavailable storage never displays a successful save. |
| R6 | Export all or completed reviews as a validated snapshot, embedding source images. Restore replaces the workspace with a validated bundle; Undo can recover the preceding workspace. | Core tests round-trip review evidence; browser check exports, restores, and compares images, raw output, annotations, and completion. |
| R7 | Imported content is data. Raw text remains visible; rendered preview allows restricted formatting inside a sandboxed frame and removes active/embedded content. | Core tests reject unsafe image sources and attribution URLs; browser check imports hostile HTML and checks preview isolation. |
| R8 | Domain definitions, assignments, and finding links remain structurally valid and separate from assessment outcomes. Profile changes reopen affected reviews. | Core harness checks version changes, scoped references, assignment changes, and v1 migration; browser check edits a domain, maps a finding, exports, and restores it. |

Core and healthcare harness: `npm test`. Local OCR harness: `npm run test:ocr`. Build harness: `npm run build`. Hosting adapter harness: `npm run test:sites`. Browser checks cover interaction, rendering, file download/restore, and IndexedDB behavior that the core harness does not establish.

## Import and persistence boundaries

- UI pair import accepts a PNG, JPEG, or WebP page image plus pasted or loaded OCR text. Additional outputs can share an existing page. Import labels execution as unverified.
- New review bundles use `schemaVersion: 3`. Version 2 bundles migrate without invented clinical checks or mapping decisions. Version 1 imports migrate with domains unassigned and finding links empty, preserving earlier reviews without inventing domain assessments. Validation rejects unsupported fields, duplicate IDs, unknown references, invalid geometry/ranges, unsupported image sources, and data beyond bounded limits.
- Browser autosave is off by default; enabling it stores the workspace locally without application encryption. Export is an unencrypted portable backup. Restore replaces rather than merges the current workspace. Undo history is limited and does not survive reload.
- Each annotation currently has at most one box and one line range. Rendered output is a restricted preview, not a fidelity guarantee for arbitrary HTML or Markdown.

## Explicitly outside the current implementation

There is no model performance ranking, automatic correction application, repository write, multi-user synchronization, authenticated review approval, clinical release, or EHR synchronization. Uploaded PDFs produce separate page cases, not retained original document bytes or patient/encounter records.

Future requirements, if needed, are source/output content hashes, stale-anchor detection, durable domain/review revision history, per-rule assessments, richer execution provenance, and multiple regions per annotation. These are proposals, not current guarantees. Large-document performance and storage-failure recovery require measured browser validation before stronger claims.

## Healthcare extension and local OCR

Schema 3 adds optional `domain.reviewPolicy: "clinical"`. Clinical review completion additionally requires `clinicalReview.identity: "matched"`, a nonblank self-entered reviewer label, all five named boolean source checks, resolved findings, and a final accepted/rejected decision for every supplied clinical mapping. Missing, mismatched, and unverifiable identity remain distinct from matched. These are reviewer-entered statements, not authentication or proof of clinical safety.

A review may carry `clinicalReview: {identity, reviewer, note, checks}`. The five checks are `subject`, `negation`, `temporality`, `values`, and `completeness`. Annotation edits clear the checks and identity; domain changes also invalidate accepted mappings. Completion is invalidated on changes, and invalid completed imports fail validation.

An annotation may carry `clinical: {subject, assertion, temporality, eventStatus, value, unit, decision}`. Missing context defaults to unknown/unreviewed only when the user creates it. Values/units remain exact strings with no conversion. An accepted mapping must have a source box, note, and at least one scoped concept. Evidence/context changes invalidate the existing decision. Explicit decisions made in the clinical dialog apply to its newly entered context. Raw OCR remains immutable. Unknown, negated, uncertain, and not-documented are different values; an order never automatically becomes performed care.

Local OCR is implemented by `server/local-ocr.mjs` and `src/RunOcrDialog.jsx`. Requests stay on loopback, with an allowed origin/Host, a custom request header, validated content signatures, bounded input/output/subprocess execution, one active job, disconnect cancellation, and temporary-file cleanup. No patient content is logged by the OCR server. The UI appends the returned pages atomically only after bundle validation. Dependency failures and empty/failed jobs do not replace prior reviews. The service is a local evaluation process, not an authenticated multi-user API or a sandbox for hostile documents.

Healthcare checks: `tests/clinical-review.test.mjs` and `tests/healthcare-fixtures.test.mjs`. OCR checks: `tests/ocr.test.mjs`. Production release boundaries: `HEALTHCARE-READINESS.md`. The synthetic healthcare profile is a local vocabulary and review policy, not a standard clinical terminology or FHIR implementation guide.

## FPF grounding

FPF supplies the distinctions behind this contract; it does not confer project approval or establish test results. Canonical pages were read through FPF Reference:

- `A.7` — Strict Distinction: `/generated/patterns/A.7` (original, description, method, and performed work remain distinct).
- `A.10` — Evidence Graph Referring: `/generated/patterns/A.10` (provenance makes a bounded claim traceable; it does not establish correctness).
- `E.10.D2` — EntityOfConcern, Description Episteme, and Specification-Use Discipline: `/generated/patterns/E.10.D2` (checkable claims require a named checking harness for specification use).
- `A.15.4` — Work-Relevant Appearance-Based Reliance Repair: `/generated/patterns/A.15.4` (a visible status does not substitute for its underlying result).
- `C.3` — Kinds, Intent and Extent, and Typed Reasoning: `/generated/patterns/C.3` (a kind and a judgment about one candidate's membership are distinct).
- `F.9` — Alignment and Bridge across Contexts: `/generated/patterns/F.9` (matching labels across domains do not establish matching meanings; this app makes no automatic cross-domain mapping).

The index reported fresh against its hosted source when consulted for this task. Snapshot build: `2026-09-08T11:43:42Z`; source SHA-256: `1f35c51ab93aa94e1a2ce7358b5ffd06ab024be6d251b5058ffcc6f764443b32`. These are verified canonical path locators; a public hostname for those paths was not verified.
