# OCR workbench

Local OCR and document review with editable domain specifications and ontologies. The compact source/OCR/finding layout follows the supplied reference and [Isaac Flath’s gallery](https://isaacflath.com/writing/ocr-examples-gallery).

## Current readiness

**Ready for local synthetic-data evaluation of clinical document abstraction. Not released for real patient data or clinical decisions.** See [HEALTHCARE-READINESS.md](HEALTHCARE-READINESS.md) for the implemented controls, test scope, integration plan, and remaining production requirements.

The standalone browser preview is [http://127.0.0.1:4317/](http://127.0.0.1:4317/). The reusable React Client Component also runs inside the included [Next.js example](http://127.0.0.1:4319/). See [NEXTJS.md](NEXTJS.md) for installation, typed props, host responsibilities, and optional OCR integration.

`OcrWorkbench` accepts a document/domain bundle and an edit callback. Its styles and shortcuts stay inside the component, and the host allocates its size. Browser storage, sample actions, and OCR execution are disabled unless configured. The standalone Vite host opts into its existing local storage namespace and OCR API.

Use `appearance="host"` to follow your app's design tokens and typography, or pass a typed `theme` for custom colors, fonts, and radii. Classic remains the component default. The Next.js example includes live Design settings for Match app/Classic, Light/Dark, and accent color. See [DESIGN.md](DESIGN.md) for the design reference, token contract, and how to adapt a getdesign.md-style reference.

## Use

1. **Files → Healthcare example** adds a wholly synthetic clinical note, actual captured Tesseract output, and a clinical domain profile without replacing your existing work. It contains eight anchored review prompts. See [HEALTHCARE-SAMPLE.md](HEALTHCARE-SAMPLE.md).
2. **Run local OCR** sends a PNG/JPEG/WebP or PDF to Tesseract on this computer. Limits: 8 MiB upload, 10 PDF pages, English, one active job, bounded rendering and execution. Progress names the current stage. Cancel stops the job and triggers temporary-file cleanup. No cloud OCR is used.
3. Assign a domain. Compare source and raw OCR; click line numbers, Shift-click to extend, and draw/move/resize a source box. Record findings, scoped concept/rule links, and separate correction proposals.
4. For clinical documents, **Clinical context** records subject, assertion/negation, temporal and event status, exact value/unit strings, and an explicit reviewer mapping decision. Unknown remains unknown. Acceptance requires a source image box, a note, and a domain concept; it does not independently verify clinical truth.
5. **Review healthcare checks** records patient/document matching, five source-comparison checks, a self-entered reviewer label, and a note. All findings must be resolved and any clinical mappings accepted or rejected before marking the clinical run reviewed. These are local review statements, not an authenticated signature or clinical approval. General domain reviews may still contain documented open findings.
6. The **Files** menu provides export and restore. Export produces a JSON snapshot with embedded page images, unchanged OCR, domains, findings, clinical context, and review state. Export all includes unfinished work with its draft states; export completed filters by review completion, not clinical authorization. Restore replaces the workspace; session **Undo** can recover the previous one.

**Browser autosave starts off** and is available under **Workspace settings**. Session changes need export to survive closing/reloading. Existing browser saves are read and preserved until you explicitly enable autosave. Autosave stores document contents in IndexedDB without app-level encryption. Turning it off does not erase existing saves. JSON exports are also unencrypted. Local processing and session-only mode do not establish HIPAA compliance or erase operating-system traces.

**Files → Import pair** accepts a page image plus existing OCR text, and **Add output** allows comparison with another extraction. Imported execution labels are not verified.

## Laptop layout

Laptops are the primary screen target: 1280×720, 1366×768, and 1440×900. The compact toolbar preserves room for all three independently scrolling panes. The findings rail is 232 CSS pixels wide at the tested sizes.

The source opens in **Width** mode for reading, with vertical scrolling. **Page** fits the whole sheet for an overview; zoom controls remain available. Selecting a finding brings its source box, raw lines, and editing card into view without moving the toolbar. Changing documents resets the source position. Dialog headings and footer actions stay reachable on short screens. Narrow/mobile layouts are secondary.

## Domains and evidence

Each domain has a versioned ontology of concepts/relations and review rules linked to concepts. The clinical template enables the additional clinical review policy; food inspection and custom general profiles retain ordinary review behavior. Templates are available in **Specification & ontology**.

A finding records source evidence and a reviewer observation. A rule link records relevance, not a rule assessment result. No automatic domain extraction or conformance score is claimed. Clinical review checks cover fixed source-comparison concerns and do not automatically assess every custom rule.

Domain edits advance the version and reopen assigned reviews. Domain reassignment also clears scoped links. Evidence/context changes reopen the run and clear clinical checks; changes supporting an accepted mapping reset its decision. Original OCR is never rewritten. Bundle schema 3 migrates earlier schemas without inventing patient matches or clinical assessments. Versions are current snapshots; prior revisions require exports or available session Undo.

## Boundaries

- The original public demo remains two Alameda form pages and four real OCR runs ([SAMPLE-SOURCES.md](SAMPLE-SOURCES.md)); these and the clinical fixture are examples, not a benchmark or gallery-wide coverage.
- PDF pages become separate review cases. The browser retains rendered page images, not the original uploaded PDF or a document-level patient/encounter object.
- No diagnosis, care-gap inference, treatment recommendation, automatic coding, EHR write, FHIR-conformant export, or external document synchronization.
- No authenticated accounts, tenant isolation, durable audit, encrypted server repository, or production backup/retention system. Do not use real patient data.
- Source-rendered HTML is restricted and sandboxed. Scripts, images, links, and embedded content cannot execute in the preview. Documents are data, never instructions.
- Handwriting, complex tables, languages other than English, large-document performance, and clinical extraction accuracy require representative evaluation.
- Undo is session-local. Concurrent editing in multiple tabs is unsupported; the last enabled autosave wins.
- Static Sites builds retain the review interface; local OCR requires the separate loopback service and is unavailable on static hosting.

## Development

```sh
npm install
npm run local
npm test
npm run test:ocr
npm run build
npm run test:sites
```

`npm run local` starts Vite on 127.0.0.1:4317 and the OCR service on 127.0.0.1:4318. Tesseract and Poppler tools must already be installed; the app reports missing dependencies. The component uses React/React DOM as peer dependencies; Next.js and TypeScript are confined to the example host. `npm run dev` alone starts the standalone UI; it can connect to an already-running local service.

See [SPEC.md](SPEC.md) for the data and validation contract and [design-qa.md](design-qa.md) for performed browser checks.
