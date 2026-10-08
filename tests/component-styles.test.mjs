import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import postcss from "postcss";
import { THEME_TOKENS } from "../src/theme.js";

const source = readFileSync(
  new URL("../src/styles.css", import.meta.url),
  "utf8",
);
const sheet = postcss.parse(source);

test("component selectors cannot style elements outside a workbench", () => {
  const escapes = [];
  sheet.walkRules((rule) => {
    for (const selector of rule.selectors) {
      if (!/^\.ocr-workbench(?:-container)?(?=[\s.#:[>+~]|$)/.test(selector)) {
        escapes.push(selector);
      }
      assert.doesNotMatch(
        selector,
        /(?:^|[\s,])(?:html|body|:root|#root)(?:$|[\s.:#[])/,
      );
    }
  });
  assert.deepEqual(escapes, []);
});

test("embedded width determines responsive layout independently of the viewport", () => {
  const containers = [];
  sheet.walkAtRules((rule) => {
    if (rule.name === "media") assert.doesNotMatch(rule.params, /width/);
    if (rule.name === "container") containers.push(rule.params);
  });
  assert(containers.includes("ocr-workbench (max-width: 800px)"));
  assert(containers.includes("ocr-workbench (min-width: 801px)"));
  assert(
    containers.includes(
      "ocr-workbench (min-width: 801px) and (max-width: 1100px)",
    ),
  );
});

test("the component fills its allocated height without taking over the viewport", () => {
  const roots = [];
  sheet.walkRules((rule) => {
    if (rule.selector === ".ocr-workbench.workbench") roots.push(rule);
  });
  assert(roots.length > 0);
  for (const rule of roots) {
    rule.walkDecls((declaration) => {
      if (declaration.prop === "position")
        assert.notEqual(declaration.value, "fixed");
      if (["height", "min-height"].includes(declaration.prop)) {
        assert.doesNotMatch(declaration.value, /(?:d|s|l)?vh/);
      }
    });
  }
  assert(source.includes("container: ocr-workbench / inline-size"));
  assert(source.includes(".ocr-workbench.loading-screen"));
});

test("the standalone viewport shell is confined to the demo entry", () => {
  const entry = readFileSync(
    new URL("../src/main.jsx", import.meta.url),
    "utf8",
  );
  assert(entry.includes('import "./standalone.css"'));
  assert(entry.includes('className="standalone-host"'));
  assert.doesNotMatch(source, /\.standalone-host/);
});

test("all public theme tokens have private defaults and do not shadow inherited overrides", () => {
  const defaults = new Set();
  const references = new Set();
  sheet.walkDecls((declaration) => {
    assert(
      !declaration.prop.startsWith("--ocr-"),
      "Public tokens must inherit from the host",
    );
    if (declaration.prop.startsWith("--_ocr-"))
      defaults.add(declaration.prop.slice(7));
    for (const match of declaration.value.matchAll(
      /var\(--ocr-([a-z-]+)[,)]/g,
    )) {
      references.add(match[1]);
    }
  });
  for (const token of THEME_TOKENS) {
    const name = token.replace(
      /[A-Z]/g,
      (letter) => `-${letter.toLowerCase()}`,
    );
    assert(defaults.has(name), `Missing default for ${token}`);
    assert(references.has(name), `Unused theme token ${token}`);
  }
});

test("all interface colors, fonts, and rounded corners follow semantic tokens", () => {
  const frozenColors = [];
  sheet.walkDecls((declaration) => {
    if (declaration.prop.startsWith("--_ocr-")) return;
    const sourcePaper =
      declaration.parent.selector === ".ocr-workbench .rendered-output";
    if (sourcePaper && declaration.prop === "background") return;
    if (
      /#(?:[a-f\d]{3,8})\b|\b(?:rgb|hsl|oklch|oklab)\(|\b(?:white|black|orange|red|green|blue)\b/i.test(
        declaration.value,
      )
    ) {
      frozenColors.push(
        `${declaration.parent.selector}: ${declaration.toString()}`,
      );
    }
    if (
      ["font-family", "font-size", "border-radius"].includes(declaration.prop)
    ) {
      assert.match(
        declaration.value,
        /^(?:inherit|0)$|var\(--ocr-/,
        declaration.toString(),
      );
    }
    if (declaration.prop === "font") assert.equal(declaration.value, "inherit");
  });
  assert.deepEqual(frozenColors, []);
});

test("host appearance follows inherited palette and fonts while source paper stays light", () => {
  const host = sheet.nodes.find(
    (rule) =>
      rule.selector ===
      '.ocr-workbench-container[data-ocr-appearance="host"] .ocr-workbench',
  );
  assert(host);
  const values = Object.fromEntries(
    host.nodes
      .filter((node) => node.type === "decl")
      .map((node) => [node.prop, node.value]),
  );
  assert.equal(values["color-scheme"], "inherit");
  assert.equal(values["--_ocr-font-family"], "var(--font-sans, inherit)");
  for (const token of [
    "background",
    "foreground",
    "card",
    "muted",
    "muted-foreground",
    "border",
    "primary",
    "primary-foreground",
    "ring",
    "radius",
  ]) {
    assert(
      new RegExp(`var\\(\\s*--${token},`).test(host.toString()),
      `Host ${token} is not mapped`,
    );
  }
  const paper = sheet.nodes.find(
    (rule) => rule.selector === ".ocr-workbench .rendered-output",
  );
  assert(
    paper.nodes.some(
      (node) => node.prop === "background" && node.value === "#ffffff",
    ),
  );
  assert(
    paper.nodes.some(
      (node) => node.prop === "color-scheme" && node.value === "light",
    ),
  );
});

test("native controls and review states remain themed in every appearance", () => {
  const declarations = (selector) =>
    sheet.nodes
      .filter(
        (rule) => rule.type === "rule" && rule.selectors.includes(selector),
      )
      .flatMap((rule) => rule.nodes.filter((node) => node.type === "decl"));
  for (const selector of ["select", "input", "textarea"]) {
    const values = declarations(`.ocr-workbench ${selector}`);
    assert(
      values.some(
        (node) =>
          node.prop === "background" && node.value.includes("--ocr-surface"),
      ),
      `${selector} needs a themed surface`,
    );
    assert(
      values.some(
        (node) => node.prop === "border" && node.value.includes("--ocr-border"),
      ),
      `${selector} needs a themed border`,
    );
  }
  for (const [selector, token] of [
    [".highlight", "selection"],
    [".delete:hover", "danger-surface"],
    [".done-button", "success-surface"],
    [".notice", "warning-surface"],
  ]) {
    assert(
      declarations(`.ocr-workbench ${selector}`).some(
        (node) =>
          node.prop === "background" && node.value.includes(`--ocr-${token}`),
      ),
      `${selector} does not use ${token}`,
    );
  }
  assert(
    declarations(".ocr-workbench .raw-output").some(
      (node) =>
        node.prop === "font-family" &&
        node.value.includes("--ocr-mono-font-family"),
    ),
  );
});

test("small accent labels use readable foregrounds and source boxes keep neutral halos", () => {
  const values = (selector) =>
    Object.fromEntries(
      sheet.nodes
        .filter((rule) => rule.type === "rule" && rule.selector === selector)
        .flatMap((rule) => rule.nodes.filter((node) => node.type === "decl"))
        .map((node) => [node.prop, node.value]),
    );
  assert.match(values(".ocr-workbench .active").color, /--ocr-selection-text/);
  for (const selector of ["a", ".domain-link-button", ".link-columns legend"]) {
    assert.equal(
      values(`.ocr-workbench ${selector}`).color,
      "var(--_ocr-link-text)",
    );
  }
  const host = values(
    '.ocr-workbench-container[data-ocr-appearance="host"] .ocr-workbench',
  );
  assert.match(host["--_ocr-link-text"], /--ocr-text/);
  assert.match(host["--_ocr-link-text"], /--ocr-accent/);
  const halo = values(".ocr-workbench .annotation-box")["box-shadow"];
  assert.match(halo, /--_ocr-evidence-halo-light/);
  assert.match(halo, /--_ocr-evidence-halo-dark/);
  const image = values(".ocr-workbench .page-image > img");
  assert.equal(image.filter, undefined);
  assert.equal(image["mix-blend-mode"], undefined);
});
