# OCR workbench design system

This file is the visual reference for contributors and coding agents. It follows the portable design-reference approach described by [getdesign.md](https://getdesign.md/) and its [DESIGN.md collection](https://github.com/VoltAgent/awesome-design-md). It is authored for this review workbench; no third-party brand design is copied. Markdown describes the intent; the component's semantic CSS tokens implement it. The runtime does not parse arbitrary DESIGN.md prose or execute instructions from a document.

## Product and layout

A document review workspace for comparing original OCR with a page image and recording evidence-linked findings. Preserve the three-pane flow: OCR text, source image, findings. Laptops are primary: verify 1280×720, 1366×768, and 1440×900 with room for host navigation. Width fit is the reading default; Page fit provides an overview. Each pane scrolls independently. Controls and dialog actions must stay reachable.

Source evidence and application styling are different things. Never recolor, invert, crop, or replace source images to match a theme. The rendered OCR preview remains a neutral paper surface inside its sandbox. Domain concepts, review rules, source evidence, clinical checks, and review completion keep their existing meanings in every design.

## Appearance modes

- **Classic** is the default component preset and the standalone preview's design: warm paper surfaces, burnt-orange interaction accents, compact monospace controls, serif review notes, and small corner radii.
- **Host** follows the containing application's semantic tokens and typography. The included Next.js example uses neutral surfaces, sans-serif controls/notes, a configurable accent, and light/dark palettes. It defaults to Match app.
- **Custom overrides** refine either mode with the `theme` prop or inherited `--ocr-*` properties. Changes apply immediately without remounting the editor or changing review data.

The modes change presentation, not layout structure or workflow. There is no remote theme download, external font request, or document upload involved.

## Semantic tokens

Use full CSS values, including `#2563eb`, `oklch(0.55 0.2 255)`, or `var(--brand-primary)`. Names are scoped with `--ocr-`; `surfaceMuted` becomes `--ocr-surface-muted`. Prefer tokens over overriding internal class selectors.

| Theme property | Role |
| --- | --- |
| `background` | Overall workbench background |
| `surface`, `surfaceMuted` | Cards, fields, menus, toolbars, and supporting surfaces |
| `text`, `mutedText` | Main text and secondary metadata |
| `border` | Dividers and control borders |
| `accent`, `accentText`, `accentHover` | Primary action/selection color, its foreground, and hover state |
| `focus` | Visible keyboard focus indicator |
| `selection`, `selectionText` | Selected OCR lines and selected-content text |
| `success`, `successSurface` | Reviewed/resolved status styling |
| `danger`, `dangerSurface` | Error and destructive-action styling |
| `warningSurface`, `warningText` | Notices and clinical-review guidance |
| `canvas` | Background around the unchanged source page |
| `fontFamily`, `monoFontFamily`, `notesFontFamily` | UI, raw OCR/code, and explanatory-note font stacks |
| `radius` | Control/card corner radius as a CSS length |
| `fontSize` | Base compact UI size as a CSS length; start with `11px` or `12px` |

Keep foreground/background pairs readable. A custom accent needs a corresponding `accentText` if the inherited foreground is unsuitable. Status is always described in text; color is supplementary. Keep visible focus rings and sufficient distinction between selected, unselected, disabled, and error states. Custom themes require their own contrast and laptop-layout checks.

## Match an existing application

The host can expose common semantic variables in an ancestor. Values must be complete CSS colors rather than bare HSL channels. Light/dark switching belongs to the host, including its `color-scheme` property.

```css
.my-app {
  --background: #f0f3f7;
  --foreground: #25303d;
  --card: #ffffff;
  --card-foreground: #25303d;
  --muted: #e8eef5;
  --muted-foreground: #526476;
  --border: #c2ccd5;
  --primary: #2563eb;
  --primary-foreground: #ffffff;
  --ring: #2563eb;
  --radius: 6px;
  --font-sans: Arial, Helvetica, sans-serif;
  --font-mono: "SFMono-Regular", Consolas, monospace;
  color-scheme: light;
}
```

```tsx
<OcrWorkbench
  initialBundle={bundle}
  onChange={handleReviewChange}
  appearance="host"
/>
```

For an application with different token names, map them explicitly:

```tsx
import type { WorkbenchTheme } from "@local/ocr-workbench";

const reviewTheme = {
  accent: "var(--brand-action)",
  accentText: "var(--brand-on-action)",
  fontFamily: "var(--app-font)",
  notesFontFamily: "var(--app-font)",
  radius: "8px",
} satisfies WorkbenchTheme;

<OcrWorkbench initialBundle={bundle} appearance="host" theme={reviewTheme} />
```

For older systems whose variables contain HSL channels, use explicit mappings such as `theme={{ background: "hsl(var(--background))", text: "hsl(var(--foreground))", accent: "hsl(var(--primary))", accentText: "hsl(var(--primary-foreground))" }` and map every other color the host exposes as bare channels. There is no automatic format detection.

Precedence is: explicit `style` properties, `theme` overrides, inherited `--ocr-*` properties, then the chosen mode's defaults. Host mode uses `--background`, `--foreground`, `--card`, `--muted`, `--muted-foreground`, `--border`, `--primary`, `--primary-foreground`, `--ring`, `--radius`, `--font-sans`, and `--font-mono`, with neutral fallbacks. It cannot infer an arbitrary design system from class names or rendered pixels.

## Use another DESIGN.md reference

1. Read the host application's design reference and identify its palette, typography, corners, density, and interaction states.
2. Map these choices to the host variables above or a typed `WorkbenchTheme` object. Use local font stacks or fonts already loaded by the host.
3. Preserve the document/review layout and evidence behavior. A marketing site's oversized headings or decorative spacing do not belong in the dense review panes.
4. Check light/dark states, dialogs, selections, focus, and laptop sizes. Edit a finding, change the design, and confirm the edit and selection remain intact.

A DESIGN.md file is guidance for this mapping step, not a guarantee of runtime compatibility with every design catalog. This package does not include an AI theme interpreter or a file-import parser. The public token contract is the executable styling boundary.

## Validation and guardrails

Do not encode workflow state in a theme, replace source evidence with generated visuals, or let design changes fire review-edit callbacks. Theme tokens remain outside exported review bundles. Do not put global selectors in the component stylesheet. The standalone shell alone may control the browser viewport.

Use the Next.js example's Design settings to compare Match app/Classic, Light/Dark, and accent changes. Run the component checks and builds; inspect the actual rendered result. The performed results belong in `design-qa.md`, not in this specification.
