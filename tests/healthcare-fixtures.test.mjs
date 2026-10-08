import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { healthcareDomain } from "../src/healthcare-domain.js";
import { createHealthcareCases } from "../src/healthcare-demo.js";
import { validateBundle } from "../src/review.js";

const asset = (name) =>
  new URL(`../public/assets/healthcare/${name}`, import.meta.url);
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

test("healthcare starter validates with scoped evidence and no accepted clinical mappings", () => {
  const cases = createHealthcareCases();
  const checked = validateBundle({
    schemaVersion: 3,
    domains: [healthcareDomain],
    cases,
  });
  assert.equal(checked.domains[0].reviewPolicy, "clinical");
  const review = checked.cases[0].reviews[checked.cases[0].runs[0].id];
  assert.equal(review.done, false);
  assert.equal(review.reviewedAt, null);
  assert.equal(review.annotations.length, 8);
  for (const finding of review.annotations) {
    assert.equal(finding.status, "open");
    assert.ok(
      finding.box && finding.lines,
      "both image and OCR anchors are required in this sample",
    );
    assert.ok(finding.ruleIds.length && finding.conceptIds.length);
    assert.ok(!finding.clinical || finding.clinical.decision !== "accepted");
  }
  cases[0].reviews["tesseract-psm3"].annotations[0].note = "local edit";
  assert.notEqual(
    createHealthcareCases()[0].reviews["tesseract-psm3"].annotations[0].note,
    "local edit",
  );
});

test("bundled OCR is byte-for-byte captured output and source assets match the recorded provenance", async () => {
  const provenance = JSON.parse(
    await readFile(asset("provenance.json"), "utf8"),
  );
  assert.equal(provenance.fixtureKind, "wholly-synthetic");
  assert.equal(provenance.ocr.exitCode, 0);
  assert.deepEqual(provenance.ocr.command.slice(-6), [
    "-l",
    "eng",
    "--oem",
    "1",
    "--psm",
    "3",
  ]);
  for (const item of [
    provenance.image,
    provenance.renderer,
    provenance.authoredText,
  ]) {
    assert.equal(
      sha256(await readFile(asset(item.file))),
      item.sha256,
      item.file,
    );
  }
  const output = await readFile(asset(provenance.ocr.outputFile));
  assert.equal(sha256(output), provenance.ocr.outputSha256);
  assert.equal(createHealthcareCases()[0].runs[0].raw, output.toString("utf8"));
  const png = await readFile(asset(provenance.image.file));
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(png.readUInt32BE(16), 1530);
  assert.equal(png.readUInt32BE(20), 1980);
  assert.ok(png.length < 8_000_000);
});

test("review prompts anchor clinically significant distinctions in the actual OCR lines", async () => {
  const source = await readFile(
    asset("synthetic-clinical-note-source.txt"),
    "utf8",
  );
  assert.match(source, /SYNTHETIC \/ NOT A PATIENT RECORD/);
  assert.match(source, /All content and identifiers are fictional/);
  const example = createHealthcareCases()[0];
  const lines = example.runs[0].raw.split("\n");
  const findings = example.reviews["tesseract-psm3"].annotations;
  const anchoredText = (suffix) => {
    const finding = findings.find(
      (item) => item.id === `healthcare-seed-${suffix}`,
    );
    assert.ok(finding, suffix);
    return lines.slice(finding.lines.start - 1, finding.lines.end).join("\n");
  };
  assert.match(anchoredText("identity"), /DEMO-PATIENT-ALPHA/);
  assert.match(
    anchoredText("identity"),
    /Encounter date: 2026-01-10 Note date: 2026-01-11/,
  );
  assert.match(anchoredText("negation"), /Patient denies chest pain/);
  assert.match(
    anchoredText("family-history"),
    /Mother has diabetes mellitus[\s\S]*Patient diabetes status: not documented/,
  );
  assert.match(anchoredText("allergy"), /Allergies: unknown/);
  assert.match(anchoredText("history"), /appendectomy, documented in 2014/);
  assert.match(
    anchoredText("medication"),
    /0\.5 mg, oral, once daily[\s\S]*Current use is unverified/,
  );
  assert.match(
    anchoredText("result"),
    /104 mg\/dL[\s\S]*Specimen date: 2026-01-09[\s\S]*Result date: 2026-01-10/,
  );
  assert.match(
    anchoredText("plan"),
    /ECG ordered for 2026-01-17[\s\S]*Completion and result are not documented/,
  );
});
