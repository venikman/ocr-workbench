import test from "node:test";
import assert from "node:assert/strict";
import { THEME_TOKENS, themeStyle } from "../src/theme.js";

test("appearance selection leaves CSS defaults and host inheritance intact", () => {
  assert.deepEqual(themeStyle(), {});
  assert.deepEqual(themeStyle("host"), {});
  assert.throws(() => themeStyle("auto"), /appearance/);
});

test("theme overrides create only namespaced CSS variables without mutating input", () => {
  const input = Object.freeze({
    accent: "var(--brand-primary)",
    fontFamily: '"Inter", sans-serif',
    radius: "0.5rem",
  });
  assert.deepEqual(themeStyle("host", input), {
    "--ocr-accent": "var(--brand-primary)",
    "--ocr-font-family": '"Inter", sans-serif',
    "--ocr-radius": "0.5rem",
  });
  assert.equal(
    Object.keys(
      themeStyle(
        "classic",
        Object.fromEntries(THEME_TOKENS.map((k) => [k, "inherit"])),
      ),
    ).length,
    THEME_TOKENS.length,
  );
});

test("invalid token names and stylesheet or URL content are rejected", () => {
  for (const input of [
    null,
    [],
    "dark",
    new Date(),
    { accent: 123 },
    { accent: "" },
    { accent: "red; display:none" },
    { accent: "url(https://example.com/a)" },
    { accent: "expression(alert(1))" },
    { fontFamily: "<style>" },
    { unknown: "red" },
  ])
    assert.throws(() => themeStyle("host", input));
});

test("modern color values and token references are accepted", () => {
  for (const accent of [
    "#2463eb",
    "rgb(20 80 210)",
    "oklch(0.55 0.2 255)",
    "hsl(var(--brand-hsl))",
    "color-mix(in srgb, var(--primary) 90%, black)",
  ])
    assert.equal(themeStyle("host", { accent })["--ocr-accent"], accent);
});
