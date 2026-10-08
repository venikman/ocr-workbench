# Next.js integration

The package exports `OcrWorkbench`, a React Client Component. The standalone Vite preview is an optional host. A working TypeScript App Router host is in [`examples/nextjs`](examples/nextjs/README.md).

## Install and mount

Install this folder as a local package from your Next.js app, using its actual relative path:

```sh
npm install /absolute/path/to/ocr-workbench
```

The package is private and has not been published to npm. React and React DOM are peer dependencies. It exports JSX source with a preserved `"use client"` boundary and TypeScript declarations. Add the package to your Next.js config:

```js
export default { transpilePackages: ["@local/ocr-workbench"] };
```

Import the scoped stylesheet once in your root layout:

```tsx
import "@local/ocr-workbench/styles.css";
```

Use a client wrapper for callbacks. This example keeps changes in memory; replace its handler with your application's save workflow and visible save/error state.

```tsx
"use client";

import { useState } from "react";
import { OcrWorkbench, type ReviewBundle } from "@local/ocr-workbench";

export function DocumentReview({ workspaceId, initialBundle }: {
  workspaceId: string;
  initialBundle: ReviewBundle;
}) {
  const [latest, setLatest] = useState(initialBundle);
  return (
    <section style={{ height: "calc(100dvh - 120px)", minHeight: 400 }}>
      <OcrWorkbench
        key={workspaceId}
        initialBundle={initialBundle}
        onChange={setLatest}
      />
    </section>
  );
}
```

The Server Component should load only data the signed-in user may access, validate it with `validateBundle` from `@local/ocr-workbench/review`, and pass the serializable result to the wrapper. Ordinary callback functions cannot cross a Server-to-Client boundary. See the [Next.js client boundary guidance](https://nextjs.org/docs/app/api-reference/directives/use-client) and [package transpilation guidance](https://nextjs.org/docs/app/api-reference/config/next-config-js/transpilePackages).

## Component contract

| Prop | Behavior |
| --- | --- |
| `initialBundle` | Required nonempty document/domain/review bundle. Validated and copied on mount; runtime also migrates v1/v2 to schema 3. Use `validateBundle` for typed legacy input. At least one document with an OCR run is required. |
| `onChange(bundle)` | Optional callback with an independent schema-3 snapshot after edits, undo, imports, or restore. No callback on initial mount or browser-storage restoration. Receiving a callback is not proof of a durable save. |
| `storageKey` | Omitted/null disables all component IndexedDB access. An explicit key enables reading that database; the user must still opt into autosave each session. Stored data takes precedence over `initialBundle` when present. |
| `ocrBaseUrl` | Omitted/null hides OCR execution. An explicit same-origin path, such as `/api/ocr-workbench`, enables the local OCR protocol described below. |
| `showExamples` | False by default. True exposes the synthetic healthcare example action; the host must serve its fixture assets. |
| `className`, `style` | Applied to the outer container. The host must allocate a height. No global body styles or viewport takeover. |

This is an uncontrolled editing session. Changing `initialBundle` during a mounted session does not overwrite in-progress edits. After handling unsaved work, change the React `key` to load a different workspace or server revision. Changing `storageKey` also remounts the editing session. Use a distinct storage key for each authorized user/workspace, and omit it for host-managed persistence. Browser storage is unencrypted and does not provide access control.

The host should debounce/serialize network saves, handle version conflicts, and show actual save results. Each callback contains the whole current bundle, including any embedded images. Large source data should be considered in the host's persistence design; no large-document performance guarantee is made. The component does not log document contents or introduce analytics.

Mount outside a `<form>` because its dialogs contain their own forms. Keyboard shortcuts apply only while focus is inside the workbench. Styles use `.ocr-workbench` scoping and container queries; width adapts to its allocated panel. Modern browsers with container queries, ResizeObserver, native dialog, and structuredClone are required. The tested host uses React 19.2.0 and Next.js 16.4.0.

## Documents, domains, and images

`ReviewBundle` includes `cases` and `domains`. Each case supplies its source page, unchanged OCR runs, per-run reviews, and nullable `domainId`. Each domain supplies its versioned ontology and review rules. The host chooses initial assignments; editing and invalidation behavior remains defined in [`SPEC.md`](SPEC.md). Importing a component does not automatically classify documents or synchronize an EHR.

Current source-image validation accepts local `/assets/` PNG/JPEG/WebP paths or base64 image data URLs. It does not accept arbitrary remote image URLs. Source attribution URLs are separate metadata. For private documents, use an authorized image-serving route within the supported path or provide authorized image data. Never put patient documents in Next.js's public directory. Demo images are copied by the example's asset preparation script; package installation alone does not serve them.

## Optional OCR service

The component reviews supplied OCR without any extraction server. With `ocrBaseUrl="/api/ocr-workbench"`, the host must implement:

- `GET /api/ocr-workbench/health`: JSON following the local worker's health response (`mode: "local"`, availability flags, and tool versions).
- `POST /api/ocr-workbench/ocr`: raw image/PDF request body, `Content-Type`, `X-OCR-Request: local-review`, and encoded `X-OCR-Filename`. Return the worker's `application/x-ndjson` stream with `stage`, `result` (document cases), or `error` events. Preserve abort/cancellation behavior and the existing file/execution bounds.

The reference implementation is `server/local-ocr.mjs`; `src/RunOcrDialog.jsx` is the protocol client. This is a local-worker protocol, not a universal cloud OCR interface. There is no ready-made authenticated Next.js API adapter in this package. A deployed host must authorize uploads and results, enforce tenancy and limits, and use a worker environment with Tesseract/Poppler installed. A Vite development proxy is not part of the component and is not used by Next.js. The runnable Next.js example therefore leaves extraction disabled.

## Responsibility and validation

The host owns authentication, document authorization, storage, retention, audit, conflict handling, and OCR service access. The component owns the review UI and structural/domain validation. Healthcare review gates remain available, but this package is still for synthetic-data evaluation; component integration is not healthcare production approval. See [`HEALTHCARE-READINESS.md`](HEALTHCARE-READINESS.md).

For performed checks and rendered evidence, see [`design-qa.md`](design-qa.md). No external application repository was modified.
