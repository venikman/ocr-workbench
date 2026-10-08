> Current UI scope: see **Next.js component verification (2026-10-07)** below. Healthcare workflow evidence is in **Healthcare and local OCR verification (2026-10-07)**. Earlier sections record prior iterations and are not current capability counts or browser state.

Repository note: historical exported review JSON files named below remain local verification artifacts and are excluded from Git. Source fixtures, screenshots, and layout measurements are included.

# Visual and interaction verification

final result: passed

Scope: functional local review prototype using the supplied screenshot's three-pane interaction pattern. This is not a pixel-identical reproduction of the original author's app or its model outputs.

## Visual evidence

- Source visual: `verification/reference.png` (1633 × 859 pixels, includes browser chrome).
- Intermediate desktop: `verification/desktop.png` (1599 × 770 pixels; CSS viewport 1600 × 770, observed DPR 1.1).
- Final implementation: `verification/desktop-final.png` (1476 × 1185 pixels; CSS viewport 1476 × 1185, DPR 1, default browser sizing restored).
- Narrow layout: `verification/narrow.png`; CSS viewport 390 × 800, scrollWidth 390. The full-page screenshot API cropped the right edge at DPR 1.1; a separate native capture was inspected and showed the complete controls without page overflow.
- State: Alameda page 1 / Tesseract PSM 3 / raw output / error 2 selected / review open. Reference uses Chandra and a different selected error; content differences are intentional and not evidence of exact model-output fidelity.
- Source and implementation were emitted together in one comparison input, both before and after the note-readability fix. Browser chrome was excluded mentally; panel fractions and UI hierarchy were compared rather than raw pixels across different viewports. No image resampling was performed.
- Full-view comparison: preserved compact toolbar, raw/rendered toggle, line gutter, yellow range highlight, white source page on warm canvas, orange numbered boxes, and right-hand notes.
- Focus review: line numbers/highlight, annotation cards, selection border/resize handle, toolbar controls, and document table were inspected in the final native-resolution capture. Separate crops were unnecessary because these areas were legible at that resolution.

## Findings and fixes

- [P2, fixed] Starter notes were too long for compact cards. Shortened all four seeded observations; recaptured and inspected the final state. Full notes now fit the ordinary card view.
- [P1, fixed] Startup could overwrite an edit made while stored data was loading. Loading now gates controls and shortcuts; writes require a completed validated read.
- [P1, fixed] Initial exports referenced bundled image paths. Exports now embed the image bytes. A browser-produced JSON file was validated and restored.
- [P2, fixed] Escape did not clear selection while a button held focus. Escape now clears selection and drawing state; keyboard navigation also works after clicking toolbar buttons.
- [P2, fixed] Active HTML was parsed through DOMParser before sanitization. It now uses inert template content, a restricted element list, an empty iframe sandbox, and a restrictive CSP. Rendering is lazy and recursion is bounded.

## Required visual surfaces

- Typography: system monospace for output, toolbar, and metadata; Georgia for review notes. Family roles, compact density, and line-number hierarchy follow the source. Source browser antialiasing differs; exact font identity is not claimed.
- Spacing/layout: approximately 42% output width; flexible source pane; 194-pixel review rail. Rail is intentionally wider than the reference to accommodate category/range/correction controls. Independent pane scrolling and fit/zoom verified. Desktop and narrow layouts retain access to controls.
- Colors/tokens: warm off-white surfaces, low-contrast beige dividers, orange selection/errors, pale yellow line highlight. Selected, hover, focus, resolved, and reviewed states remain distinguishable.
- Image quality: actual 180 dpi PDF renders, no fabricated document image; source page remains proportional. Small text is inspectable with zoom.
- Copy/content: actual Tesseract outputs are labelled with execution origin; imported output is labelled unverified. Original text, correction proposal, review completion, local save, and export remain distinct.

## Performed checks

- Build: `npm run build` passed after final code edits.
- Core: `node --test tests/review.test.mjs` passed 19/19 after the domain extension.
- Source assets: two PNGs visually inspected; four OCR text files checked against bundled strings exactly; provenance and hashes recorded in `SAMPLE-SOURCES.md`.
- Browser: annotation edits, line click/Shift-click, draw, pointer move, corner resize, arrow-key adjustment, delete/undo, zoom/fit, model switching, previous/next, keyboard navigation, completion and automatic reopening, reload persistence, resolved filter, new pair import, additional output import, raw/rendered toggle, JSON restore and undo all exercised.
- Browser export file: 895679 bytes, two embedded PNGs, two cases, four outputs. `validateBundle` accepted it and every raw OCR string matched the seed exactly. The exact file is `verification/exported-review.json`.
- Restore: that browser-produced file was loaded through the in-app file chooser; images and reviews reappeared. Temporary test pairs were undone; final workspace contains the four sample runs.
- Hostile preview fixture: HTML table rendered; script and remote image removed from the generated iframe document; no warning/error logs observed. The fixture was then removed with Undo.
- Final in-app console check: no warning/error entries returned.

## Remaining limits

- Forced IndexedDB failure injection was blocked by the browser tool's unsupported CDP method. Failure branches were reviewed in code; normal save/reload was tested. Quota exhaustion and corrupt-store recovery are not browser-verified.
- Download-event waits timed out in the automation layer, although Chrome created the exported file in Downloads. Artifact presence, schema, embedded data, and restore were verified directly. In-app download completion alone is not established.
- Chrome's automated file chooser could not set files because extension file-URL access is disabled. The in-app chooser completed both pair import and bundle restore successfully; no browser permission was changed.
- No performance benchmark, production deployment, OCR-provider integration, multi-user editing, or full Markdown/LaTeX fidelity claim.

## Follow-up polish

- [P3] Larger-scale review queues could benefit from searchable cases and virtualized output rows.
- [P3] A richer rendered Markdown/table view could supplement the deliberately limited safe preview.

## Domain extension verification

Final result: passed within the local prototype scope. The original three-pane review layout is retained, with a compact domain bar and separate profile/mapping dialogs. No new runtime dependencies were added.

- Food inspection profile: 12 concepts, 9 directed relations, and 6 source-fidelity review rules. Domain types and document evidence elements remain distinct; no extracted entity or conformance claim is inferred.
- Browser migration: both existing in-app and Chrome v1 workspaces loaded with their original annotations intact and unassigned domains. A food-inspection profile was then explicitly created and assigned through the UI.
- Custom domain: created a temporary shipping-slip profile through the editor, including two concepts, a relation, and a rule linked to a concept. Assigned it to a document, marked a review complete, edited the profile, and observed version 2 with the review reopened. Undid the four workspace changes; no temporary profile remains in the delivered in-app workspace.
- Finding mapping: linked all four example findings through the concept/rule dialog. Verified persisted chips and selected domain after reload. Both sample documents are assigned to food inspection in the final in-app workspace.
- Concept-removal check: attempted to remove a concept used by a draft rule/relation. The editor kept it and showed an actionable error. Review also fixed modal behavior so failed finding-link validation retains the open dialog and selections.
- Core review fixed an aggregate text-limit edge: accepted edits cannot create a saved bundle that fails reload/export because of total text size. The regression test passed.
- Actual browser export: Chrome saved `verification/exported-domain-review.json` (905458 bytes). Validation confirmed schema v2, one profile, 12 concepts, 9 relations, 6 rules, two embedded PNGs, and four unchanged OCR runs. One mapped finding from the independent Chrome workspace was present. This file restored successfully through the in-app file chooser; its domain and mapping were visible. Undo restored the final workspace with all four mapped examples.
- Narrow view: at 390 CSS pixels, both the page and dialog had no horizontal overflow (document scrollWidth 390; dialog clientWidth/scrollWidth 352). The profile cards stack and all controls remain accessible through scrolling. Default desktop sizing was restored.
- Rendered evidence inspected: `verification/domain-specification.png`, `verification/domain-ontology.png`, `verification/domain-relations.png`, `verification/domain-narrow.png`, and `verification/domain-workbench.png`. The beige/orange palette, compact monospace controls, serif explanatory text, and source-image fidelity remain consistent with the reference.
- Final browser warning/error log query returned no entries. The temporary Chrome test tab was closed; the in-app deliverable remains open.

Profile version numbers track current edits only. There is no durable profile revision archive, per-rule assessment checklist, automatic ontology extraction, or compliance engine. Existing storage-failure and in-app download limitations above remain; the Chrome download plus in-app restore path was verified.

## Healthcare and local OCR verification (2026-10-07)

Result: passed for the tested local synthetic-document workflow. No clinical accuracy, production PHI readiness, or compliance certification is established.

- `npm test`: 30/30 passed (19 review/domain, 8 clinical, 3 fixture checks).
- `npm run test:ocr`: 12/12 passed, none skipped; includes actual two-page synthetic PDF extraction, type/size/pixel/page bounds, origin/Host/custom-header checks, bounded filename header, subprocess output/time limits, one-job concurrency, total deadline, and temporary cleanup after success/failure/in-flight cancellation.
- `npm run build`: passed after the final CSS correction. `npm run test:sites`: 4/4 passed; static hosting has no local OCR execution service.
- Browser: added the healthcare example without replacing existing work. Confirmed unchecked and mismatched identity blocked completion. Entered a patient/negated/current mapping with an image box, note, and concept links. Resolved the eight synthetic prompts, explicitly entered five checks and a test reviewer label, then marked reviewed. These attestations were marked UI TEST ONLY, not clinical review evidence.
- Edited the accepted mapping's supporting note; the UI returned it to unreviewed and cleared review completion and clinical checks. Core tests also cover source-box/context/rule changes and domain revision/reassignment invalidation.
- Actual in-app download succeeded. `verification/healthcare-export.json` validated as schema3 with three cases, embedded images, reviewed clinical state, and the negation mapping. Restored it via the file chooser and observed the saved completion state. This supersedes the earlier in-app download limitation for this tested environment.
- Actual browser PDF upload completed with two pages and unchanged OCR text beside each source image. Cancelled a second PDF job; the dialog confirmed no pages added. Retried with the synthetic clinical PNG successfully. Backend manual checks additionally exercised JPEG and WebP.
- A second actual export, `verification/healthcare-end-to-end.json`, validated with six cases/eight runs, including three newly executed OCR pages assigned to the clinical domain and still unreviewed. This is a test snapshot, not a clinical data export standard.
- Browser autosave remained off. A final reload recovered the pre-existing saved workspace, confirming the new session had not overwritten it. Added a fresh healthcare example again so the delivered view contains no test attestations or accepted clinical mappings. No saved user review was deleted or replaced.
- At 390 CSS pixels, found horizontal overflow in the new clinical dialog. Fixed grid child sizing, select width, fieldset minimum sizing, and footer wrapping. Rechecked: dialog scrollWidth equals clientWidth (325 CSS pixels); vertical scrolling remains available. Reset viewport to normal afterward.
- Personally inspected `verification/healthcare-workbench.png`, `healthcare-context.png`, `healthcare-checks.png`, `healthcare-local-ocr.png`, and the corrected `healthcare-narrow.png`. The original compact beige/orange three-pane layout is retained.
- Browser log capture contains one earlier Vite development WebSocket reconnect error (2026-10-07T23:26:16.413Z), with no additional warnings/errors after final reload. Actual final source changes and workflow were verified after reload; no application exception was observed.

Limits: one synthetic clinical note is not a representative clinical corpus. No production benchmarks, clinician adjudication, patient matching system, authenticated review, durable audit, encrypted data service, EHR/FHIR integration, or deployment-specific security assessment. Browser quota exhaustion/corrupt-store recovery and abrupt host-failure temporary-data recovery remain unverified. See `HEALTHCARE-READINESS.md`.

## Laptop layout verification (2026-10-07)

Result: passed for the tested laptop layouts and navigation. Laptops are now the primary design target, recorded in `AGENTS.md`.

- Compact single-row toolbar; import/example/export/restore grouped under **Files**. Autosave and its data-handling explanation remain accessible under **Workspace settings**.
- Default **Width** source fitting uses the pane width for reading. **Page** provides a whole-sheet overview. The findings rail is wider, with independent scrolling. Dialog headings and footer actions remain visible on short screens.
- Replaced whole-page `scrollIntoView` behavior with scrolling inside the raw-output and findings panes. Selected source boxes scroll into view unless a pointer gesture is active. Changing documents resets source scroll. The workbench remains anchored to the viewport.
- `npm test`: 30/30 passed. `npm run build`: passed. `npm run test:sites`: 4/4 passed. OCR execution code was unchanged; its earlier 12/12 run above was not repeated for this layout change.

The browser was at 110% zoom. Requested viewport dimensions and the actual measured CSS workspace are reported separately in `verification/laptop-layout-checks.json`:

| Requested viewport | Actual CSS viewport | Source image width | Findings width | Toolbar height |
| --- | --- | --- | --- | --- |
| 1280×720 | 1164×655 | 511 | 232 | 43 |
| 1366×768 | 1242×698 | 563 | 232 | 43 |
| 1440×900 | 1309×818 | 607 | 232 | 43 |

All measured dimensions are CSS pixels except requested viewport dimensions. Each tested layout had no horizontal or vertical whole-page overflow, toolbar top at zero, and all three panes available. At the 1366×768 setting, the source image grew from approximately 315 to 563 CSS pixels wide; the toolbar decreased from approximately 80 to 43 CSS pixels tall.

- Browser checks: Width/Page switching, selected finding/source visibility, toolbar anchoring, document-switch scroll reset, Files menu closing after a selection, and the visible disabled autosave setting. No new clinical attestations or accepted mappings were entered.
- At the 1280×720 setting, the healthcare checks and domain library dialogs had no horizontal overflow; Close and footer actions remained visible. Pointer geometry was code-reviewed, including the active-drag scroll guard; full drag/resize browser regression was not repeated in this pass.
- Personally inspected the laptop workbench captures and short-screen clinical/domain dialogs. Evidence: `verification/laptop-1280-workbench.png`, `laptop-1366-workbench.png`, `laptop-1440-workbench.png`, and `laptop-1280-dialog.png`.
- Reset the browser viewport override after verification. Browser autosave stayed off, existing saved reviews were preserved, and the delivered view contains the synthetic healthcare example without test approvals.

This verifies the listed viewport settings and interactions, not every laptop/browser/zoom combination or large-document performance. Healthcare release boundaries remain unchanged.

## Next.js component verification (2026-10-07)

Result: passed for the included Next.js App Router host and standalone regression checks. This is an embeddable review component, not an authenticated document service or a healthcare production release.

Changed:

- `src/index.jsx` exposes `OcrWorkbench` with a preserved client boundary and typed `initialBundle`, `onChange`, optional storage/API configuration, and container styling props. The editor lives in `src/Workbench.jsx`; `src/App.jsx` configures the standalone demo.
- Scoped styles and shortcuts to the component. Container queries respond to allocated width. Standalone viewport styles moved to `src/standalone.css`. Explicit non-submit buttons and instance-unique field/dialog IDs avoid integration collisions.
- Defaults perform no component browser persistence and expose no OCR execution control. Existing standalone storage key and local OCR URL remain explicit opt-ins. Changing storage configuration remounts the session using distinct tagged keys.
- Added `NEXTJS.md`, package exports/declarations, and an actual TypeScript Next.js 16.4.0 / React 19.2.0 example. The example uses the local package, authorized-data loading placeholder, host-owned memory state, and independent navigation. It has no authentication or durable saving.

Validated:

- Final `npm test`: 38/38 passed, including eight new configuration and stylesheet-isolation checks. `npm run build` passed; `npm run test:sites`: 4/4 passed.
- In `examples/nextjs`, final `npm run typecheck` and `npm run build` passed, including server prerender and TypeScript checking against package declarations. Production `next start` runs at `http://127.0.0.1:4319/`. These builds used the explicit Webpack scripts in the example; Turbopack was not separately tested.
- Browser: changing a note updated the host change counter exactly once. Hide/Show unmounted and remounted the workbench while retaining the host's edited snapshot, without an extra initial callback. Restored the original note after testing.
- Pressing `n` on host navigation left findings unchanged; pressing it inside the workbench added a finding and notified the host. Undo removed that finding and notified the host. Raw/rendered switching displayed the original OCR inside the sandboxed preview.
- On the final production build, added the synthetic healthcare example and inspected the review-checks dialog. At 1280×720, the dialog had no horizontal overflow and Save/Close remained visible. No clinical checks, identity match, reviewer label, or clinical approval was entered.
- Next.js settings showed browser storage disabled with no autosave checkbox. No Run local OCR control was present with omitted API configuration. Browser warning/error log query returned no entries.
- The standalone preview still loads pre-existing reviews without enabling autosave. Its OCR health check reported `Ready · Tesseract 5.5.2 · English` after restarting the stopped local service. Extraction code was unchanged; the earlier 12-test extraction run was not repeated in this pass.
- Package dry-run included the client entry, declarations, scoped stylesheet, review logic, docs, and fixture assets without runtime Vite/Next.js dependencies.

Measured final Next.js layouts (CSS pixels):

| Browser viewport | Component panel | Toolbar height | Result |
| --- | --- | --- | --- |
| 1280×720 | 1254×606 | 46.4 | Inside host; no whole-page overflow |
| 1366×768 | 1340×654 | 46.4 | Inside host; no whole-page overflow |
| 1440×900 | 1414×786 | 46.4 | Inside host; no whole-page overflow |

Host navigation remained visible at each size. Its Arial typography remained independent of the workbench's monospace typography. Source images loaded successfully. Evidence: `verification/nextjs-layout-checks.json`, `nextjs-1280.png`, `nextjs-1366.png`, `nextjs-1440.png`, and `nextjs-healthcare-dialog.png`. Rendered workbench and dialog captures were personally inspected. Viewport overrides were reset after verification.

Limits: no external host repository was changed, no authenticated Next.js OCR API adapter was implemented, and no real patient data was used. The host must supply authorization, persistence, OCR service access, and save/conflict feedback. Callback failure recovery, multiple simultaneous instances, host-specific CSS resets, and all browser versions were not exhaustively tested. Existing healthcare and large-document limits remain.

## Initial repository verification (2026-10-07)

A clean copy containing only staged source files passed root `npm ci`, `npm test` (38/38), `npm run build`, `npm run test:sites` (4/4), and `npm run test:ocr` (12/12, including actual two-page PDF extraction). Its Next.js example then passed `npm ci`, `npm run typecheck`, and `npm run build`. This verifies installation from the committed lockfiles without relying on the working directory's installed dependencies or generated assets. Generated build output, copied example assets, dependencies, and historical review exports are excluded from Git. Captured OCR whitespace is preserved unchanged.

## Host design and theme verification (2026-10-07)

Result: passed for the supplied Classic preset and Next.js host's light/dark palettes. Package version is 0.2.0. This adds presentation configuration; healthcare release boundaries remain unchanged.

- Added `appearance="classic" | "host"` and a typed `theme` with 24 semantic tokens. CSS variables stay scoped to the workbench. Public overrides inherit from the host; internal defaults do not shadow them. The session key and review-data model are unchanged.
- Added `DESIGN.md` as the contributor/integration reference following getdesign.md's Markdown design-reference pattern. It explains token mapping, precedence, source-evidence boundaries, and custom-theme validation. Arbitrary Markdown is not interpreted at runtime.
- The Next.js host exposes Design settings with Match app/Classic, Light/Dark, and a native accent picker. Native input events update the accent live. Small active labels use the regular foreground; host links blend the accent with text for readability. Thin neutral halos keep source boxes distinguishable from the page.
- Final `npm test`: 47/47 passed. `npm run test:sites`: 4/4 passed. Standalone `npm run build` and Next.js `npm run typecheck` / `npm run build` passed. No dependencies were added. OCR execution was unchanged; its previous extraction tests were not repeated.
- Browser: edited a note once, selected its finding, switched Light to Dark, Match app to Classic and back, and changed the accent. The edited note and selected finding/line range survived; the host counter stayed at one change. Undo restored the test edit. Appearance changes do not notify the host of review edits.
- Verified the unchanged source image URL and computed `filter: none`; rendered OCR retains a white background and light color scheme in dark mode. The standalone preview still uses the Classic warm palette and monospace UI.
- Added the synthetic healthcare fixture in memory. Mark reviewed still rejected unchecked identity. Inspected the dark clinical dialog at 1280×720: width and scrollWidth both 648 CSS pixels; Close and Save remained visible within the viewport. No clinical attestations or approvals were entered.
- Measured the dark host at 1280×720, 1366×768, and 1440×900. All three panes and host navigation remained available; document scroll dimensions matched the viewport with no whole-page overflow. Toolbar height was 46.4 CSS pixels at every size. Measurements are in `verification/theme-layout-checks.json`.
- After the production build, reloaded the Next.js example and rechecked light/dark/accent controls. Selection survived and the host counter remained at zero changes. The warning/error log query returned no entries. Viewport reset was requested after the checks.
- Personally inspected Classic, light, dark, selected-text, rendered-output, source-box, and healthcare-dialog states. Captures: `verification/theme-classic.png`, `theme-host-light.png`, `theme-host-dark.png`, `theme-dark-dialog.png`, and the three laptop-size captures.

Limits: custom theme values need host-specific contrast and layout checks. A host with different token names or bare HSL channels needs an explicit mapping. No automatic interpretation of an arbitrary application's styles or DESIGN.md prose, exhaustive browser matrix, or new clinical readiness claim is implied.
