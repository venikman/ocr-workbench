import http from "node:http";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";

export const OCR_LIMITS = Object.freeze({
  bytes: 8 * 1024 * 1024,
  pages: 10,
  pixels: 22_000_000,
  text: 2_000_000,
  totalText: 8_000_000,
  totalImages: 30_000_000,
  deadlineMs: 180_000,
});
export class OcrError extends Error {
  constructor(message, status = 422) {
    super(message);
    this.name = "OcrError";
    this.status = status;
  }
}
const aborted = () => new OcrError("OCR was cancelled.", 499);
// Prefer an installed Poppler pdfinfo when an older Xpdf executable shadows it on macOS.
const popplerPdfinfo =
  process.platform === "darwin"
    ? [
        "/opt/homebrew/opt/poppler/bin/pdfinfo",
        "/usr/local/opt/poppler/bin/pdfinfo",
      ].find(existsSync)
    : undefined;

/** Never invokes a shell; bounded output, deadline, and process cleanup apply to every tool. */
export function runCommand(
  command,
  args,
  {
    signal,
    timeoutMs = 60_000,
    maxOutput = 2_000_000,
    allowedExitCodes = [0],
  } = {},
) {
  return new Promise((accept, reject) => {
    if (signal?.aborted) return reject(aborted());
    let settled = false,
      failure,
      stdout = [],
      length = 0,
      killer;
    const child = spawn(
      command === "pdfinfo" && popplerPdfinfo ? popplerPdfinfo : command,
      args,
      {
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env, OMP_THREAD_LIMIT: "2" },
      },
    );
    const stop = (error) => {
      if (failure) return;
      failure = error;
      child.kill("SIGTERM");
      killer = setTimeout(() => child.kill("SIGKILL"), 300);
      killer.unref();
    };
    const onAbort = () => stop(aborted());
    signal?.addEventListener("abort", onAbort, { once: true });
    const timer = setTimeout(
      () =>
        stop(
          new OcrError(
            "The local OCR tool exceeded its time limit. Try fewer pages or a smaller image.",
          ),
        ),
      timeoutMs,
    );
    timer.unref();
    child.stdout.on("data", (chunk) => {
      length += chunk.length;
      if (length > maxOutput)
        stop(
          new OcrError(
            "The OCR output exceeded the review limit. Split the document.",
          ),
        );
      else stdout.push(chunk);
    });
    // Drain diagnostics without logging document contents, metadata, or local paths.
    child.stderr.on("data", () => {});
    child.on("error", (error) => {
      failure = new OcrError(
        error.code === "ENOENT"
          ? `Required local tool ${command} is unavailable.`
          : "A local OCR tool could not start.",
        503,
      );
    });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearTimeout(killer);
      signal?.removeEventListener("abort", onAbort);
      if (failure) reject(failure);
      else if (!allowedExitCodes.includes(code))
        reject(
          new OcrError(
            "The local tool could not read this file. Check that it is a supported, unencrypted document.",
          ),
        );
      else accept(Buffer.concat(stdout).toString("utf8"));
    });
  });
}

export function imageDimensions(bytes, type) {
  let width, height;
  if (type === "image/png" && bytes.length >= 24) {
    width = bytes.readUInt32BE(16);
    height = bytes.readUInt32BE(20);
  } else if (type === "image/jpeg") {
    let offset = 2;
    while (offset + 9 <= bytes.length) {
      if (bytes[offset++] !== 0xff) break;
      while (bytes[offset] === 0xff) offset++;
      const marker = bytes[offset++];
      if (marker === 0xd9 || marker === 0xda) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      const size = bytes.readUInt16BE(offset);
      if (size < 2 || offset + size > bytes.length) break;
      if (
        [
          0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd,
          0xce, 0xcf,
        ].includes(marker)
      ) {
        height = bytes.readUInt16BE(offset + 3);
        width = bytes.readUInt16BE(offset + 5);
        break;
      }
      offset += size;
    }
  } else if (type === "image/webp" && bytes.length >= 30) {
    const kind = bytes.toString("ascii", 12, 16);
    if (kind === "VP8X") {
      width = bytes.readUIntLE(24, 3) + 1;
      height = bytes.readUIntLE(27, 3) + 1;
    } else if (
      kind === "VP8 " &&
      bytes[23] === 0x9d &&
      bytes[24] === 0x01 &&
      bytes[25] === 0x2a
    ) {
      width = bytes.readUInt16LE(26) & 0x3fff;
      height = bytes.readUInt16LE(28) & 0x3fff;
    } else if (kind === "VP8L" && bytes[20] === 0x2f) {
      const bits = bytes.readUInt32LE(21);
      width = (bits & 0x3fff) + 1;
      height = ((bits >>> 14) & 0x3fff) + 1;
    }
  }
  if (
    !width ||
    !height ||
    width > 10_000 ||
    height > 10_000 ||
    width * height > OCR_LIMITS.pixels
  )
    throw new OcrError(
      "The image dimensions are unsupported or exceed 22 million pixels. Resize the page before OCR.",
    );
  return { width, height };
}

export function sniffType(bytes) {
  if (
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return "image/jpeg";
  if (
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  )
    return "image/webp";
  if (bytes.toString("ascii", 0, 5) === "%PDF-") return "application/pdf";
  throw new OcrError("Choose a valid PNG, JPEG, WebP, or PDF file.", 415);
}

export async function processDocument(
  bytes,
  {
    name = "Document",
    signal,
    onStage = () => {},
    run = runCommand,
    tempRoot = tmpdir(),
    version = "local",
  } = {},
) {
  if (!bytes.length || bytes.length > OCR_LIMITS.bytes)
    throw new OcrError("Choose a file between 1 byte and 8 MiB.", 413);
  const type = sniffType(bytes);
  if (type !== "application/pdf") imageDimensions(bytes, type);
  const directory = await mkdtemp(join(tempRoot, "ocr-review-"));
  try {
    if (signal?.aborted) throw aborted();
    const extension = {
      "application/pdf": "pdf",
      "image/png": "png",
      "image/jpeg": "jpg",
      "image/webp": "webp",
    }[type];
    const input = join(directory, `input.${extension}`);
    await writeFile(input, bytes, { mode: 0o600 });
    let pages = 1;
    if (type === "application/pdf") {
      onStage("Inspecting PDF");
      const info = await run("pdfinfo", [input], {
        signal,
        timeoutMs: 15_000,
        maxOutput: 64_000,
      });
      pages = Number(info.match(/^Pages:\s+(\d+)\s*$/m)?.[1]);
      if (!Number.isSafeInteger(pages) || pages < 1 || pages > OCR_LIMITS.pages)
        throw new OcrError(
          "PDFs must contain 1–10 pages. Split this document into smaller files.",
        );
      if (/^Encrypted:\s+yes\b/m.test(info))
        throw new OcrError(
          "Encrypted PDFs are unsupported. Use an authorized unencrypted copy.",
        );
    }
    const cases = [];
    let imageTotal = 0,
      textTotal = 0;
    for (let page = 1; page <= pages; page++) {
      if (signal?.aborted) throw aborted();
      let path = input,
        imageBytes = bytes,
        imageType = type;
      if (type === "application/pdf") {
        onStage(`Rendering page ${page} of ${pages}`);
        const prefix = join(directory, `page-${page}`);
        await run(
          "pdftoppm",
          [
            "-f",
            String(page),
            "-l",
            String(page),
            "-singlefile",
            "-r",
            "150",
            "-scale-to",
            "2200",
            "-png",
            input,
            prefix,
          ],
          { signal, timeoutMs: 30_000, maxOutput: 64_000 },
        );
        path = `${prefix}.png`;
        imageBytes = await readFile(path);
        imageType = "image/png";
      }
      const dimensions = imageDimensions(imageBytes, imageType);
      const image = `data:${imageType};base64,${imageBytes.toString("base64")}`;
      imageTotal += image.length;
      if (image.length > 20_000_000 || imageTotal > OCR_LIMITS.totalImages)
        throw new OcrError(
          "Rendered pages exceed the review image limit. Split the document.",
        );
      onStage(`Reading page ${page} of ${pages} with Tesseract`);
      const raw = await run(
        "tesseract",
        [path, "stdout", "-l", "eng", "--oem", "1", "--psm", "3"],
        { signal, maxOutput: OCR_LIMITS.text },
      );
      if (raw.split("\n").length > 10_000)
        throw new OcrError("OCR produced too many lines. Split the document.");
      textTotal += raw.length;
      if (textTotal > OCR_LIMITS.totalText)
        throw new OcrError(
          "OCR text exceeds the review limit. Split the document.",
        );
      const runId = `run-${randomUUID()}`;
      cases.push({
        id: `case-${randomUUID()}`,
        title: `${name.slice(0, 135)}${pages > 1 ? ` · page ${page}` : ""}`,
        domainId: null,
        source: { image, page, ...dimensions },
        runs: [
          {
            id: runId,
            model: `Tesseract ${version} · English · PSM 3`,
            raw,
            origin: `Executed locally with Tesseract (eng, OEM 1, PSM 3) on ${new Date().toISOString()}.${type === "application/pdf" ? " PDF rendered with Poppler at 150 dpi, capped at 2200 pixels on its longest edge." : ""} Unverified OCR output; human source review required.`,
          },
        ],
        reviews: {
          [runId]: { annotations: [], done: false, reviewedAt: null },
        },
      });
      if (type === "application/pdf") await rm(path, { force: true });
    }
    return cases;
  } finally {
    // Await child termination before this scope exits; no input or rendered page is retained by the server.
    await rm(directory, { recursive: true, force: true });
  }
}

export async function checkDependencies(run = runCommand) {
  const results = await Promise.all(
    ["tesseract", "pdfinfo", "pdftoppm"].map(async (tool) => {
      try {
        const output = await run(
          tool,
          tool === "tesseract" ? ["--version"] : ["-v"],
          {
            timeoutMs: 5000,
            maxOutput: 8000,
            allowedExitCodes: tool === "pdfinfo" ? [0, 99] : [0],
          },
        );
        return [
          tool,
          {
            available: true,
            version:
              tool === "tesseract"
                ? output.match(/^tesseract\s+(\S+)/)?.[1] || "local"
                : "installed",
          },
        ];
      } catch {
        return [tool, { available: false }];
      }
    }),
  );
  return Object.fromEntries(results);
}

async function readInput(request, limit, signal) {
  const length = Number(request.headers["content-length"]);
  if (length > limit) {
    request.resume();
    throw new OcrError("The file exceeds the 8 MiB upload limit.", 413);
  }
  return new Promise((accept, reject) => {
    const chunks = [];
    let size = 0;
    const cleanup = () => {
      request.off("data", onData);
      request.off("end", onEnd);
      request.off("error", onError);
      request.off("aborted", onAbort);
      signal.removeEventListener("abort", onAbort);
    };
    const fail = (error) => {
      cleanup();
      request.resume();
      reject(error);
    };
    const onAbort = () => fail(aborted());
    const onError = () =>
      fail(new OcrError("The upload was interrupted.", 400));
    const onEnd = () => {
      cleanup();
      size
        ? accept(Buffer.concat(chunks))
        : reject(new OcrError("The file is empty.", 400));
    };
    const onData = (chunk) => {
      size += chunk.length;
      if (size > limit)
        fail(new OcrError("The file exceeds the 8 MiB upload limit.", 413));
      else chunks.push(chunk);
    };
    if (signal.aborted) {
      reject(aborted());
      return;
    }
    request.on("data", onData);
    request.once("end", onEnd);
    request.once("error", onError);
    request.once("aborted", onAbort);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

export function createOcrServer({
  uiOrigins = ["http://127.0.0.1:4317", "http://localhost:4317"],
  processor = processDocument,
  dependencyCheck = checkDependencies,
  deadlineMs = OCR_LIMITS.deadlineMs,
} = {}) {
  let active = false,
    dependencyPromise;
  const dependencies = () =>
    (dependencyPromise ||= dependencyCheck().catch(() => {
      dependencyPromise = undefined;
      throw new OcrError("Local OCR tools could not be checked.", 503);
    }));
  const server = http.createServer(async (request, response) => {
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "no-referrer");
    const sendError = (error) => {
      const message =
        error instanceof OcrError
          ? error.message
          : "Local OCR failed. Try a smaller supported file.";
      if (!response.headersSent) {
        response.writeHead(error instanceof OcrError ? error.status : 500, {
          "Content-Type": "application/json",
        });
        response.end(JSON.stringify({ error: message }));
      } else if (!response.destroyed)
        response.end(`${JSON.stringify({ type: "error", error: message })}\n`);
    };
    const port = server.address()?.port;
    const host = request.headers.host;
    const origin = request.headers.origin;
    if (
      ![`127.0.0.1:${port}`, `localhost:${port}`].includes(host) ||
      (origin && !uiOrigins.includes(origin))
    ) {
      request.resume();
      sendError(
        new OcrError(
          "This local OCR endpoint only accepts the configured local review app.",
          403,
        ),
      );
      return;
    }
    const url = new URL(request.url, `http://${host}`);
    if (request.method === "GET" && url.pathname === "/api/health") {
      try {
        const tools = await dependencies();
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(
          JSON.stringify({
            mode: "local",
            tools,
            available: tools.tesseract.available,
            pdfAvailable: tools.pdfinfo.available && tools.pdftoppm.available,
            busy: active,
            limits: { bytes: OCR_LIMITS.bytes, pages: OCR_LIMITS.pages },
          }),
        );
      } catch (error) {
        sendError(error);
      }
      return;
    }
    if (request.method !== "POST" || url.pathname !== "/api/ocr") {
      request.resume();
      sendError(new OcrError("Endpoint not found.", 404));
      return;
    }
    if (
      !uiOrigins.includes(origin) ||
      request.headers["x-ocr-request"] !== "local-review"
    ) {
      request.resume();
      sendError(new OcrError("OCR uploads require the local review app.", 403));
      return;
    }
    if (
      ![
        "image/png",
        "image/jpeg",
        "image/webp",
        "application/pdf",
        "application/octet-stream",
      ].includes(request.headers["content-type"])
    ) {
      request.resume();
      sendError(new OcrError("Unsupported upload type.", 415));
      return;
    }
    if (active) {
      request.resume();
      sendError(
        new OcrError(
          "Another local OCR job is running. Wait for it to finish or cancel it.",
          409,
        ),
      );
      return;
    }
    active = true;
    const controller = new AbortController();
    const onDisconnect = () => {
      if (!response.writableEnded) controller.abort();
    };
    request.on("aborted", onDisconnect);
    response.on("close", onDisconnect);
    let deadlineExpired = false;
    const timeout = setTimeout(() => {
      deadlineExpired = true;
      controller.abort();
    }, deadlineMs);
    timeout.unref();
    try {
      const encodedName = request.headers["x-ocr-filename"] || "Document";
      let name;
      try {
        if (encodedName.length > 2048) throw new Error("length");
        name =
          decodeURIComponent(encodedName)
            .replace(/[\x00-\x1f\x7f]/g, "")
            .slice(0, 160) || "Document";
      } catch {
        throw new OcrError(
          "The document filename is invalid or too long.",
          400,
        );
      }
      const tools = await dependencies();
      if (controller.signal.aborted) throw aborted();
      if (!tools.tesseract.available)
        throw new OcrError(
          "Tesseract is unavailable on this machine. Existing OCR text can still be imported.",
          503,
        );
      const bytes = await readInput(
        request,
        OCR_LIMITS.bytes,
        controller.signal,
      );
      const type = sniffType(bytes);
      if (
        type === "application/pdf" &&
        (!tools.pdfinfo.available || !tools.pdftoppm.available)
      )
        throw new OcrError(
          "PDF tools are unavailable on this machine. Upload a page image instead.",
          503,
        );
      response.writeHead(200, {
        "Content-Type": "application/x-ndjson",
        "X-Accel-Buffering": "no",
      });
      const emit = (value) => {
        if (!response.destroyed && !controller.signal.aborted)
          response.write(`${JSON.stringify(value)}\n`);
      };
      emit({ type: "stage", stage: "Preparing local OCR" });
      const cases = await processor(bytes, {
        name,
        signal: controller.signal,
        onStage: (stage) => emit({ type: "stage", stage }),
        version: tools.tesseract.version,
      });
      if (controller.signal.aborted) throw aborted();
      emit({ type: "result", cases });
      response.end();
    } catch (error) {
      request.resume();
      sendError(
        deadlineExpired
          ? new OcrError(
              "The OCR job exceeded its total time limit. Try fewer pages or a smaller image.",
              408,
            )
          : error,
      );
    } finally {
      clearTimeout(timeout);
      request.off("aborted", onDisconnect);
      response.off("close", onDisconnect);
      active = false;
    }
  });
  server.requestTimeout = 30_000;
  server.headersTimeout = 10_000;
  server.keepAliveTimeout = 5000;
  return server;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const server = createOcrServer();
  server.listen(4318, "127.0.0.1", () =>
    console.log(
      "Local OCR listening on http://127.0.0.1:4318 (synthetic/de-identified evaluation only).",
    ),
  );
  server.on("error", (error) => {
    console.error(
      error.code === "EADDRINUSE"
        ? "Local OCR port 4318 is already in use."
        : "Local OCR server could not start.",
    );
    process.exitCode = 1;
  });
  const close = () => {
    server.close();
    server.closeAllConnections();
  };
  process.on("SIGINT", close);
  process.on("SIGTERM", close);
}
