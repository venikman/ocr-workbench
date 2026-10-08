import test from "node:test";
import assert from "node:assert/strict";
import { componentOptions } from "../src/component-options.js";

test("embedding defaults do not enable browser persistence or OCR requests", () => {
  assert.deepEqual(componentOptions(), { storageKey: null, ocrBaseUrl: null });
});
test("explicit storage namespaces and same-origin API prefixes are accepted", () => {
  assert.deepEqual(
    componentOptions({
      storageKey: "synthetic-review-a",
      ocrBaseUrl: "/app/api/local-ocr/",
    }),
    {
      storageKey: "synthetic-review-a",
      ocrBaseUrl: "/app/api/local-ocr",
    },
  );
});
test("API configuration cannot silently target another origin or ambiguous path", () => {
  for (const ocrBaseUrl of [
    "https://example.com",
    "//example.com",
    "/api?token=x",
    "/api#ocr",
    "/api/../other",
    "/api\\other",
    "/%2fexample.com",
    "api",
    "/",
    "",
  ]) {
    assert.throws(() => componentOptions({ ocrBaseUrl }), /same-origin/);
  }
});
test("invalid storage namespaces are rejected", () => {
  for (const storageKey of ["", " ", 42, {}, "a".repeat(201)])
    assert.throws(() => componentOptions({ storageKey }), /storageKey/);
});
