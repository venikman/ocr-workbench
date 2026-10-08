/** Public semantic tokens. Values stay local to one workbench container. */
export const THEME_TOKENS = Object.freeze([
  "background",
  "surface",
  "surfaceMuted",
  "text",
  "mutedText",
  "border",
  "accent",
  "accentText",
  "accentHover",
  "focus",
  "selection",
  "selectionText",
  "success",
  "successSurface",
  "danger",
  "dangerSurface",
  "warningSurface",
  "warningText",
  "canvas",
  "fontFamily",
  "monoFontFamily",
  "notesFontFamily",
  "radius",
  "fontSize",
]);

const tokenSet = new Set(THEME_TOKENS);

export function themeStyle(appearance = "classic", theme = {}) {
  if (!["classic", "host"].includes(appearance))
    throw new Error('appearance must be "classic" or "host".');
  if (
    !theme ||
    typeof theme !== "object" ||
    Array.isArray(theme) ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(theme))
  )
    throw new Error("theme must be a plain object of supported design tokens.");
  const style = {};
  for (const [name, value] of Object.entries(theme)) {
    if (!tokenSet.has(name))
      throw new Error(`Unknown workbench theme token: ${name}.`);
    if (
      typeof value !== "string" ||
      !value.trim() ||
      value.length > 240 ||
      /[;{}<>\\\u0000-\u001f\u007f]/.test(value) ||
      /(?:url|expression)\s*\(|@import/i.test(value)
    )
      throw new Error(
        `Theme token ${name} must be a CSS value without rules, URLs, or control characters.`,
      );
    const property = `--ocr-${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;
    style[property] = value;
  }
  return style;
}
