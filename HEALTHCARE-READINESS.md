# Healthcare readiness — clinical document abstraction

Evidence review date: 2026-10-07. Intended use: local evaluation with synthetic documents, producing source-linked abstractions for human review. This is an engineering readiness assessment, not a compliance certificate, clinical validation report, or regulatory classification.

The present release boundary is **synthetic-data evaluation only**. A review flag, successful OCR run, or passing software test does not establish readiness for production patient information or patient-care decisions. No diagnosis, treatment recommendation, or autonomous clinical write-back is authorized by this document.

## What the controls can establish

The existing workbench preserves original OCR, links findings to page regions/output lines and domain concepts/rules, records separate proposed corrections, reopens reviews after relevant changes, and exports review snapshots. Domain definitions describe concepts and relations; they are not extracted patient facts. A statement in a source note remains a documented assertion, not independent confirmation that a condition or event occurred.

The inspected UI starts with browser autosave off. Enabling it writes the workspace to IndexedDB without application-level encryption. Previously saved browser data is still loaded and retained; disabling autosave does not delete it. Session-only operation is a storage choice, not an assurance that the browser, operating system, or exports contain no sensitive data.

Schema 3 code was inspected in `src/healthcare.js` and `src/review.js`. `domain.reviewPolicy: "clinical"` activates the additional completion gate. `review.clinicalReview` stores an identity disposition, a self-entered reviewer label, a note, and checks for subject, negation, temporality, values, and completeness. An optional `annotation.clinical` stores subject, assertion, temporality, event status, value, unit, and a mapping decision; defaults are unknown/unreviewed.

Healthcare completion requires matched identity, a nonblank reviewer label, every critical check, resolved findings, and accepted/rejected decisions for any clinical mappings. Accepted mappings require an image region, note, and domain concept. Annotation changes reset identity/checks; supporting-content changes reset a mapping decision; domain changes reset affected clinical review state. These are local reviewer statements: imported flags and typed labels do not authenticate an actor or prove the source is true.

The table defines the bounded claims and further checks. It is not a claim that every browser, failure, or clinical-evaluation check has passed:

| Local control | What must be checked | What it does not establish |
| --- | --- | --- |
| Healthcare profile marker | Selecting a healthcare profile activates its additional review requirements; legacy data does not acquire invented attestations. | Sensitive-data detection or an access-control boundary; an editable profile cannot enforce organizational policy. |
| Page identity check | A reviewer explicitly checks the page against the intended synthetic subject/document; unchecked or unknown state cannot complete a healthcare review. | Patient matching, reviewer authentication, or correct linkage across a multipage record. |
| Critical review checks | Completion requires all five checks and disposition of findings/mappings; failed/missing checks prevent the local completion action. Relevant edits invalidate completion. | Independent clinical review, exhaustive error detection, or satisfaction of every domain rule. |
| Clinical context | Findings can retain subject, polarity/negation, temporality, value, and unit without overwriting the source. Unknowns remain explicit. | Terminology coding, medication reconciliation, diagnostic truth, or unit conversion. |
| Local OCR | A bounded local extraction request produces an identifiable original output; failures are visible and temporary data is cleaned up. | Clinically acceptable accuracy, no information exposure under every host configuration, or secure production hosting. |
| Snapshot export | Source images, original outputs, domain definitions, findings, and review states survive export/restore. | An authenticated approval, tamper-evident history, or permission to publish into an EHR. |

For critical fields, preserve the source spelling, punctuation, decimal separator, unit, and contextual qualifiers. A missing value is not zero; an absent statement is not a negative finding; family history is not the patient's condition; historical or planned care is not current or performed care. Human review must resolve or retain these distinctions without inventing missing facts.

## Verification that can happen here

Use synthetic fixtures for wrong-page/wrong-subject association, patient versus family history, negated and uncertain findings, past versus current/planned events, omitted text, decimal/unit substitutions, conflicting entries, and blank fields. Exercise gates before and after annotation edits, domain changes, save/reload, migration, export/restore, failed OCR, malformed uploads, and failed persistence.

Code tests can establish schema validation, reference integrity, completion conditions, invalidation, and snapshot preservation for their tested inputs. Browser checks can establish the rendered workflow, error messages, keyboard controls, persistence, and request behavior in the inspected environment. A successful synthetic end-to-end run establishes only that bounded execution, not clinical performance.

Performed independent check on 2026-10-07: an in-memory Node assertion probe against the schema 3 functions passed for (a) unchecked identity blocking completion, (b) complete reviewer attestations allowing completion, and (c) a unit edit resetting mapping acceptance, identity, checks, and completion while preserving original OCR and the earlier bundle. This probe did not exercise the UI, a real OCR process, access control, or clinical accuracy.

The inspected `server/local-ocr.mjs` includes loopback binding, host/origin checks, an upload header check, size/page/pixel/output limits, one active job, process deadlines, direct process arguments without a shell, and temporary-directory cleanup. This source inspection is not a security test. Execution tests subsequently passed for the endpoint bounds, subprocess deadlines, failure/cancellation cleanup, and redacted error handling; see the verification record below. Broader deployment logging and security testing remain separate requirements. Binding to loopback alone is not evidence that arbitrary web pages cannot reach a local endpoint. Local browser storage, exports, operating-system temporary files, screenshots, and backups remain data locations to account for; abrupt process/host failure may need recovery cleanup beyond normal `finally` handling.

Before clinical evaluation, a clinical owner must define a representative authorized corpus and adjudicated reference data. Measure clinically consequential omissions and false additions separately from general character accuracy. Evaluate subject, polarity, time, numeric value/unit, and entity/relationship fidelity; report uncertainty and abstention, reviewer burden, disagreements, and performance across document families, scan quality, language, and source institutions. Acceptance thresholds must follow the intended workflow and harm analysis; no threshold or measured clinical accuracy is claimed here.

## Completed engineering verification

The final local check set passed 30 review/schema/fixture tests, 12 OCR tests (none skipped), 4 static-hosting adapter tests, and a production build. The OCR tests include real extraction of a synthetic two-page PDF. Browser verification exercised identity gates, explicit mapping, invalidation, actual export/restore, PDF extraction, cancellation and PNG retry. A 390 CSS-pixel dialog overflow was corrected and rechecked. Exact commands, exported test artifacts, screenshots, and residual limitations are recorded in `design-qa.md` under Healthcare and local OCR verification. These checks establish the tested engineering behavior, not clinical accuracy or production safeguards.

## Proposed document-to-domain integration

The implemented local OCR path can turn supported image/PDF uploads into per-page images and original Tesseract outputs for review. It stops at manual findings/context and JSON snapshots. For PDF uploads, the returned workspace retains rendered page images, not the original PDF bytes or a durable multipage document container. Execution accuracy, original-document retention, typed clinical records, and downstream writes remain separate concerns.

1. **Source:** retain the original document, version/content identity, page order, and independently checked subject association. Keep semantic domain separate from document structure such as table, form, or narrative. The current case/page model does not resolve mixed-domain sections or multipage identity automatically.
2. **Candidate:** an extraction adapter uses a pinned ontology/specification version to propose typed entities, attributes, and relations. Each candidate retains exact source locations, original text, OCR-run identity, context, and uncertainty. The current findings/context fields are a review representation, not a complete typed clinical-record model.
3. **Decision:** a reviewer accepts, rejects, or defers a particular candidate revision, with reasons and source evidence. A future release decision must bind actor identity, candidate/source/profile versions, required check results, time, and destination. The workbench's local completion flag is not this release decision.
4. **Destination:** a separate adapter validates the target contract and sends only records authorized for that destination, with duplicate prevention, acknowledgement handling, reconciliation, and correction/retraction behavior. Keep draft and unresolved exports distinguishable. No EHR or FHIR write integration is established by the current JSON snapshot format.

Potential FHIR mappings below are design options, **not implemented exports**. Select the receiving system's FHIR release, implementation guide, terminology bindings, identifier policy, and authorization contract before implementing them. The linked examples are deliberately pinned to HL7 FHIR R4, not claimed to be the latest release.

| Future information | Possible mapping and boundary |
| --- | --- |
| Source document metadata | [DocumentReference](https://hl7.org/fhir/R4/documentreference.html), with protected content storage as appropriate. The document and its reference have distinct provenance. |
| A reviewed measurement or suitable point-in-time assertion | [Observation](https://hl7.org/fhir/R4/observation.html), only where its semantics and the target profile fit; do not put every diagnosis, medication, or extracted phrase into Observation. |
| Creation/revision lineage | [Provenance](https://hl7.org/fhir/R4/provenance.html), relating the resulting resource version to relevant agents, activities, and source entities; this differs from recording access events. |

FHIR representation does not supply the deployment's security system. HL7 separately calls for authentication, authorization, secure transport, and audit arrangements. [HL7 R4 security guidance](https://hl7.org/fhir/R4/security.html).

## Decisions and evidence still needed before production use

These are unresolved release conditions for this project, not a complete enumeration of legal obligations. The responsible organization must define the deployment, data, users, jurisdiction, and intended clinical use, then decide the required controls and evidence.

| Unresolved area | Evidence needed from the deployment owner |
| --- | --- |
| Intended use and clinical responsibility | Defined abstraction task, users, supported documents, prohibited uses, human escalation and correction process, clinical risk assessment, and sign-off on representative clinician-reviewed evaluation. |
| Access and isolation | Authenticated user/service identities, least-privilege roles, session policy, tenant/patient isolation, authorization for reads/exports/writes, and tested access-denial paths. No such controls follow from a domain selector. |
| Durable accountability | Protected audit records for access, edits, profile changes, decisions, exports, and writes, bound to immutable source/candidate revisions and attributable actors. Session Undo and editable imported flags are insufficient. |
| Confidentiality and lifecycle | Documented encryption and key management, workstation/browser protections, retention/deletion rules, temporary-file/log/backup handling, export controls, and tested deletion/restore behavior. Local storage alone does not establish these protections. |
| Service operations | Dependency and vulnerability management, upload/parser isolation, monitoring, incident response, backups, disaster recovery, change control, and an evaluated production architecture. |
| External processors and data flows | Inventory every recipient and data location, including OCR/AI vendors, hosting, analytics, support, and backups; decide permitted purposes and required contracts before any real-data transfer. |
| Interoperability and clinical release | Target profiles/codes/units/identifiers, patient matching, explicit draft-to-release criteria, authenticated approval, destination authorization, idempotent writes, error reconciliation, and rollback/correction procedures. |

For US HIPAA-regulated deployments, HHS describes required administrative, physical, and technical safeguards and an organization-specific assessment of risks to ePHI. Its summary distinguishes the Security Rule currently in effect from the proposed update. This project has not established its operator's regulated status or fulfilled deployment-specific obligations. [HHS Security Rule summary](https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html), [HHS risk-analysis guidance](https://www.hhs.gov/hipaa/for-professionals/security/guidance/final-guidance-risk-analysis/index.html), [HHS proposed-rule status](https://www.hhs.gov/hipaa/for-professionals/security/hipaa-security-rule-nprm/index.html).

HHS cloud guidance states that a provider processing or maintaining ePHI on behalf of a regulated entity may be its business associate even without a decryption key; the relevant business associate agreement and safeguards are still needed. Encryption alone is insufficient. No cloud provider assessment, contract, or real-data cloud processing was performed for this readiness work. [HHS cloud-computing guidance](https://www.hhs.gov/hipaa/for-professionals/special-topics/health-information-technology/cloud-computing/index.html).

If intended use expands toward clinical decision support, diagnosis, or treatment, obtain a function-specific regulatory assessment for the relevant jurisdiction. FDA's guidance distinguishes non-device CDS criteria from device software functions; a human-review screen alone does not settle the classification. No FDA clearance, exemption determination, or device classification is asserted here. [FDA Clinical Decision Support Software guidance](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/clinical-decision-support-software).

## Release statement

Local synthetic-data checks can support continued engineering evaluation. Production PHI processing and clinical release remain unsupported until the responsible owners resolve the deployment, security, privacy, clinical-evaluation, and destination-integration conditions above with recorded evidence. Reopen this assessment whenever intended use, data population, OCR/extraction method, domain specification, deployment, or destination changes.
