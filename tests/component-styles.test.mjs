import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import postcss from "postcss";

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
