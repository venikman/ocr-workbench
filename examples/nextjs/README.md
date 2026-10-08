# Next.js component example

A runnable App Router host for `@local/ocr-workbench`. The host navigation and
review status remain outside the component. The server page passes a serializable
document/domain bundle to a small Client Component that owns the edit callback.

## Run

Requires Node.js 20.9 or later. Next.js 16.4.0 and React 19.2.0 are pinned. The
local package is linked with `file:../..` and compiled with `transpilePackages`.

From a fresh repository checkout, install the root dependencies before the
linked example dependencies:

```sh
npm ci
cd examples/nextjs
npm ci
npm run dev
```

Open `http://127.0.0.1:4319`. For a production-mode check:

```sh
npm run build
npm run typecheck
npm start
```

The asset preparation step copies the parent package's public document fixtures
into `public/assets`. They are generated example assets; do not commit this copy.

## Integration

- `app/layout.tsx` imports the component stylesheet once, followed by host styles.
- `app/page.tsx` is a Server Component. Load an authorized schema-3 bundle there
  instead of `demoBundle`. It must contain at least one document and OCR run.
- `app/review-workspace.tsx` is a Client Component because it receives `onChange`.
  The callback updates the host's in-memory state and its visible change count.
  It is not a server save, and no callback is expected on initial mount.
- The workbench fills `.host-review-panel`. Give this container a definite height
  or a flex parent with a definite height and `min-height: 0`.
- `initialBundle` seeds a mounted instance. Ordinary parent rerenders do not reset
  in-progress work. To replace it with a different host workspace, change the
  React `key` after resolving any unsaved changes. This example preserves the
  last callback bundle when hiding and showing the component.
- Omit `storageKey` to keep browser persistence disabled, as this example does.
  If you opt in, scope the key to the authorized user and workspace, and account
  for unencrypted browser storage in your deployment policy.
- Omit `ocrBaseUrl` to disable OCR execution, as this example does. The component
  can review OCR text supplied by the host without an OCR server. To enable OCR,
  supply a same-origin API path implementing the local OCR protocol described in
  the parent package. Do not expose the unauthenticated local worker directly.
- `showExamples` exposes the public/synthetic sample actions for this demo.
  Omit it in a production host.

## Match the host design

The example starts with `appearance="host"`. Open **Design settings** in the host
header to switch between **Match app** and **Classic**, change the host's light or
dark appearance, or choose a custom accent. These settings update the mounted
component without resetting the review or calling `onChange`.

`globals.css` defines the host's semantic CSS variables on `.host-app`:
`--background`, `--foreground`, `--card`, `--card-foreground`, `--muted`,
`--muted-foreground`, `--border`, `--primary`, `--primary-foreground`, `--ring`,
`--radius`, `--font-sans`, and `--font-mono`. Use full CSS values such as
`#2563eb`, `oklch(0.55 0.2 260)`, or `6px`. The workbench's host appearance reads
these inherited tokens; Classic retains the original workbench design.

The native color control sets the host's primary and focus colors. The example
chooses black or white primary text to maintain contrast against that accent.
The source document keeps its original image colors in either appearance.

For a design specification such as a `DESIGN.md` obtained from getdesign.md, map
the approved color, typography, and shape decisions to these host tokens or the
component's `theme` prop. This example does not fetch or execute design documents.
See the package's [design integration guide](../../DESIGN.md) for the token
contract and per-component overrides.

Source image URLs are resolved by the browser, not by the npm package. The bundle
validator accepts local `/assets/` PNG/JPEG/WebP paths or base64 PNG/JPEG/WebP
data URLs. Remote image URLs and SVG are not supported. For these examples the
host serves public fixtures at `/assets/...` after asset preparation. A real host
must serve protected images behind authorized `/assets/` routes or supply image
data in its authorized bundle; do not place patient images in Next.js's public
directory. Loading a package does not copy its public directory automatically.

The host owns authentication, authorization, persistent storage, audit, retention,
and OCR access control. The component handles document comparison, domain rules,
annotations, and human review. This demo is for public/synthetic data only and
does not establish readiness for real patient data or clinical decisions.

## References

- [Next.js Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [Next.js transpilePackages](https://nextjs.org/docs/app/api-reference/config/next-config-js/transpilePackages)
- [Next.js installation requirements](https://nextjs.org/docs/app/getting-started/installation)

Next.js 16.4.0 was checked against the official documentation and npm registry on
2026-10-07. Dependency versions are intentionally pinned for reproducible checks.
