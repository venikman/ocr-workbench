import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import {
  createOcrServer,
  runCommand,
  processDocument,
  sniffType,
  imageDimensions,
  OCR_LIMITS,
  checkDependencies,
} from "../server/local-ocr.mjs";

const png = Buffer.alloc(32);
Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(png);
png.writeUInt32BE(100, 16);
png.writeUInt32BE(100, 20);
const healthy = async () => ({
  tesseract: { available: true, version: "test" },
  pdfinfo: { available: true },
  pdftoppm: { available: true },
});
const origin = "http://127.0.0.1:4317";
const headers = {
  Origin: origin,
  "X-OCR-Request": "local-review",
  "Content-Type": "image/png",
};
async function withServer(options, check) {
  const server = createOcrServer({ dependencyCheck: healthy, ...options });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await check(base, server);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
}
function syntheticPdf(pages = 1) {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  const kids = [];
  for (let p = 0; p < pages; p++) {
    const pageId = objects.length + 1,
      streamId = pageId + 1;
    const stream = `BT /F1 24 Tf 72 700 Td (SYNTHETIC OCR TEST) Tj 0 -40 Td (No real patient information.) Tj 0 -40 Td (Temperature 37.2 C) Tj ET`;
    kids.push(`${pageId} 0 R`);
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${streamId} 0 R >>`,
    );
    objects.push(
      `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    );
  }
  objects[1] = `<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${pages} >>`;
  let output = "%PDF-1.4\n",
    offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(output));
    output += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(output);
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1))
    output += `${String(offset).padStart(10, "0")} 00000 n \n`;
  output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(output);
}

test("signature and dimensions reject unsupported and huge images", () => {
  assert.equal(sniffType(png), "image/png");
  assert.deepEqual(imageDimensions(png, "image/png"), {
    width: 100,
    height: 100,
  });
  assert.throws(() => sniffType(Buffer.from("<svg/>")), /valid PNG/);
  const huge = Buffer.from(png);
  huge.writeUInt32BE(100_000, 16);
  assert.throws(() => imageDimensions(huge, "image/png"), /dimensions/);
});

test("endpoint restricts origin, Host, CSRF header, and content type", async () => {
  let calls = 0;
  await withServer(
    {
      processor: async () => {
        calls++;
        return [];
      },
    },
    async (base) => {
      const hostile = await fetch(`${base}/api/ocr`, {
        method: "POST",
        headers: { ...headers, Origin: "https://evil.example" },
        body: png,
      });
      assert.equal(hostile.status, 403);
      const noToken = await fetch(`${base}/api/ocr`, {
        method: "POST",
        headers: { Origin: origin, "Content-Type": "image/png" },
        body: png,
      });
      assert.equal(noToken.status, 403);
      const noOrigin = await fetch(`${base}/api/ocr`, {
        method: "POST",
        headers: {
          "X-OCR-Request": "local-review",
          "Content-Type": "image/png",
        },
        body: png,
      });
      assert.equal(noOrigin.status, 403);
      const unsupported = await fetch(`${base}/api/ocr`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "text/plain" },
        body: "path=/etc/passwd",
      });
      assert.equal(unsupported.status, 415);
      const wrongHost = await new Promise((resolve) => {
        const request = http.get(
          `${base}/api/health`,
          { headers: { Host: "evil.example" } },
          (response) => {
            response.resume();
            resolve(response.statusCode);
          },
        );
        request.on("error", (error) => {
          throw error;
        });
      });
      assert.equal(wrongHost, 403);
      assert.equal(calls, 0);
    },
  );
});

test("upload bounds and invalid signature never reach the processor", async () => {
  let calls = 0;
  await withServer(
    {
      processor: async () => {
        calls++;
        return [];
      },
    },
    async (base) => {
      const large = await fetch(`${base}/api/ocr`, {
        method: "POST",
        headers,
        body: Buffer.alloc(OCR_LIMITS.bytes + 1),
      });
      assert.equal(large.status, 413);
      const invalid = await fetch(`${base}/api/ocr`, {
        method: "POST",
        headers,
        body: "not an image",
      });
      assert.equal(invalid.status, 415);
      assert.equal(calls, 0);
    },
  );
});

test("stream reports stages and bounded errors without server details", async () => {
  await withServer(
    {
      processor: async (_, { onStage }) => {
        onStage("Reading page 1 of 1");
        throw new Error("/private/patient.txt confidential");
      },
    },
    async (base) => {
      const response = await fetch(`${base}/api/ocr`, {
        method: "POST",
        headers,
        body: png,
      });
      const output = await response.text();
      assert.match(output, /Reading page 1 of 1/);
      assert.match(output, /Local OCR failed/);
      assert.doesNotMatch(output, /patient|private|confidential/);
    },
  );
});

test("missing dependencies return a useful unavailable result", async () => {
  await withServer(
    {
      dependencyCheck: async () => ({
        tesseract: { available: false },
        pdfinfo: { available: false },
        pdftoppm: { available: false },
      }),
    },
    async (base) => {
      const health = await (await fetch(`${base}/api/health`)).json();
      assert.equal(health.available, false);
      const result = await fetch(`${base}/api/ocr`, {
        method: "POST",
        headers,
        body: png,
      });
      assert.equal(result.status, 503);
      assert.match((await result.json()).error, /unavailable/);
    },
  );
});

test("one job at a time and client disconnect propagates cancellation", async () => {
  let begin, cancel;
  const started = new Promise((resolve) => {
    begin = resolve;
  });
  const cancelled = new Promise((resolve) => {
    cancel = resolve;
  });
  await withServer(
    {
      processor: async (_, { signal }) => {
        begin();
        await new Promise((resolve) =>
          signal.addEventListener(
            "abort",
            () => {
              cancel();
              resolve();
            },
            { once: true },
          ),
        );
        return [];
      },
    },
    async (base) => {
      const abort = new AbortController();
      const response = await fetch(`${base}/api/ocr`, {
        method: "POST",
        headers,
        body: png,
        signal: abort.signal,
      });
      await started;
      const busy = await fetch(`${base}/api/ocr`, {
        method: "POST",
        headers,
        body: png,
      });
      assert.equal(busy.status, 409);
      abort.abort();
      await assert.rejects(response.text());
      await Promise.race([
        cancelled,
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Cancellation not propagated")),
            1000,
          ).unref(),
        ),
      ]);
    },
  );
});

test("tool output bounds, command failure, timeout, and abort are enforced", async () => {
  await assert.rejects(
    runCommand(
      process.execPath,
      ["-e", 'process.stdout.write("x".repeat(500))'],
      { maxOutput: 10 },
    ),
    /output exceeded/,
  );
  await assert.rejects(
    runCommand("definitely-missing-ocr-tool-123", []),
    /unavailable/,
  );
  await assert.rejects(
    runCommand(process.execPath, ["-e", "setTimeout(()=>{},10000)"], {
      timeoutMs: 30,
    }),
    /time limit/,
  );
  const abort = new AbortController();
  const pending = runCommand(
    process.execPath,
    ["-e", "setTimeout(()=>{},10000)"],
    { signal: abort.signal },
  );
  abort.abort();
  await assert.rejects(pending, /cancelled/);
});

test("temporary uploads are removed on success, failure, and cancellation", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "ocr-test-"));
  try {
    const cases = await processDocument(png, {
      tempRoot,
      run: async () => "SYNTHETIC RESULT\n",
    });
    assert.equal(cases[0].runs[0].raw, "SYNTHETIC RESULT\n");
    assert.equal(cases[0].reviews[cases[0].runs[0].id].done, false);
    assert.deepEqual(await readdir(tempRoot), []);
    await assert.rejects(
      processDocument(png, {
        tempRoot,
        run: async () => {
          throw new Error("tool failure");
        },
      }),
      /tool failure/,
    );
    assert.deepEqual(await readdir(tempRoot), []);
    const abort = new AbortController();
    let started;
    const inTool = new Promise((resolve) => {
      started = resolve;
    });
    const pending = processDocument(png, {
      tempRoot,
      signal: abort.signal,
      run: async (_, __, { signal }) => {
        started();
        await new Promise((_, reject) =>
          signal.addEventListener(
            "abort",
            () => reject(new Error("cancelled")),
            { once: true },
          ),
        );
      },
    });
    await inTool;
    assert.equal((await readdir(tempRoot)).length, 1);
    abort.abort();
    await assert.rejects(pending, /cancelled/);
    assert.deepEqual(await readdir(tempRoot), []);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("PDF page limit is checked before rendering", async () => {
  let calls = 0;
  await assert.rejects(
    processDocument(syntheticPdf(), {
      run: async (command) => {
        calls++;
        assert.equal(command, "pdfinfo");
        return "Pages: 11\nEncrypted: no\n";
      },
    }),
    /1–10 pages/,
  );
  assert.equal(calls, 1);
});

test(
  "real local OCR reads a synthetic two-page PDF and cleans files",
  { timeout: 90_000 },
  async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "ocr-real-test-"));
    try {
      const dependencies = await checkDependencies();
      assert.ok(Object.values(dependencies).every((tool) => tool.available));
      const stages = [];
      const cases = await processDocument(syntheticPdf(2), {
        tempRoot,
        name: "Synthetic healthcare evaluation",
        onStage: (stage) => stages.push(stage),
      });
      assert.equal(cases.length, 2);
      for (const [index, item] of cases.entries()) {
        assert.equal(item.source.page, index + 1);
        assert.ok(item.source.width <= 2200 && item.source.height <= 2200);
        assert.match(item.source.image, /^data:image\/png;base64,/);
        assert.match(item.runs[0].raw, /SYNTHETIC OCR TEST/);
        assert.match(item.runs[0].raw, /37\.2/);
        assert.equal(item.reviews[item.runs[0].id].done, false);
      }
      assert.ok(stages.includes("Reading page 2 of 2 with Tesseract"));
      assert.deepEqual(await readdir(tempRoot), []);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  },
);

test("filenames arrive only through a bounded encoded header", async () => {
  let seen;
  await withServer(
    {
      processor: async (_, { name }) => {
        seen = name;
        return [];
      },
    },
    async (base) => {
      const response = await fetch(`${base}/api/ocr`, {
        method: "POST",
        headers: {
          ...headers,
          "X-OCR-Filename": encodeURIComponent("Synthetic résumé.png"),
        },
        body: png,
      });
      await response.text();
      assert.equal(seen, "Synthetic résumé.png");
      const invalid = await fetch(`${base}/api/ocr`, {
        method: "POST",
        headers: { ...headers, "X-OCR-Filename": "%invalid" },
        body: png,
      });
      assert.equal(invalid.status, 400);
      assert.match((await invalid.json()).error, /filename/);
      const long = await fetch(`${base}/api/ocr`, {
        method: "POST",
        headers: { ...headers, "X-OCR-Filename": "a".repeat(2049) },
        body: png,
      });
      assert.equal(long.status, 400);
    },
  );
});

test("total job deadline reports timeout and frees the active slot", async () => {
  let cancelled = false;
  await withServer(
    {
      deadlineMs: 25,
      processor: async (_, { signal }) => {
        await new Promise((resolve) =>
          signal.addEventListener(
            "abort",
            () => {
              cancelled = true;
              resolve();
            },
            { once: true },
          ),
        );
        return [];
      },
    },
    async (base) => {
      const response = await fetch(`${base}/api/ocr`, {
        method: "POST",
        headers,
        body: png,
      });
      const output = await response.text();
      assert.match(output, /exceeded its total time limit/);
      assert.doesNotMatch(output, /was cancelled/);
      assert.equal(cancelled, true);
      const health = await (await fetch(`${base}/api/health`)).json();
      assert.equal(health.busy, false);
    },
  );
});
