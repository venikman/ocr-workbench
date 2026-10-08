import { useEffect, useId, useRef, useState } from "react";

const MAX_BYTES = 8 * 1024 * 1024;
const TYPES = ["image/png", "image/jpeg", "image/webp", "application/pdf"];

export function RunOcrDialog({
  domains,
  initialDomainId,
  onAdd,
  onClose,
  apiBaseUrl,
}) {
  const headingId = useId();
  const ref = useRef(null);
  const controller = useRef(null);
  const [health, setHealth] = useState(null);
  const [file, setFile] = useState(null);
  const [domainId, setDomainId] = useState(initialDomainId || "");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("Checking local OCR tools…");
  const [error, setError] = useState("");
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    const probe = new AbortController();
    fetch(`${apiBaseUrl}/health`, { signal: probe.signal, cache: "no-store" })
      .then(async (response) => {
        if (
          !response.ok ||
          !response.headers.get("content-type")?.includes("application/json")
        )
          throw new Error(
            "Local OCR is unavailable in this preview. The local OCR service must be running; importing existing OCR text is still available.",
          );
        const result = await response.json();
        if (result.mode !== "local")
          throw new Error("Local OCR service is unavailable.");
        setHealth(result);
        setStage(
          result.available
            ? `Ready · Tesseract ${result.tools.tesseract.version} · English`
            : "Tesseract is unavailable on this machine.",
        );
      })
      .catch((e) => {
        if (e.name !== "AbortError") {
          setError(
            e.message === "Failed to fetch"
              ? "Could not reach the local OCR service. Importing existing OCR text is still available."
              : e.message,
          );
          setStage("Local OCR unavailable");
        }
      });
    return () => {
      probe.abort();
      controller.current?.abort();
      dialog.close();
    };
  }, [apiBaseUrl]);
  function cancel() {
    controller.current?.abort();
    setStage("Cancelled. Temporary server files are being removed.");
  }
  function close() {
    controller.current?.abort();
    onClose();
  }
  async function submit(event) {
    event.preventDefault();
    setError("");
    if (!file) {
      setError("Choose a document first.");
      return;
    }
    if (
      !TYPES.includes(file.type) &&
      !/\.(png|jpe?g|webp|pdf)$/i.test(file.name)
    ) {
      setError("Choose a PNG, JPEG, WebP, or PDF document.");
      return;
    }
    if (!file.size || file.size > MAX_BYTES) {
      setError("Choose a nonempty file no larger than 8 MiB.");
      return;
    }
    if (/\.pdf$/i.test(file.name) && !health?.pdfAvailable) {
      setError("PDF tools are unavailable. Choose a page image instead.");
      return;
    }
    const abort = new AbortController();
    controller.current = abort;
    setBusy(true);
    setStage("Uploading to the OCR service on this computer…");
    try {
      const response = await fetch(`${apiBaseUrl}/ocr`, {
        method: "POST",
        body: file,
        signal: abort.signal,
        headers: {
          "Content-Type": TYPES.includes(file.type)
            ? file.type
            : "application/octet-stream",
          "X-OCR-Request": "local-review",
          "X-OCR-Filename": encodeURIComponent(file.name),
        },
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(
          result.error ||
            `Local OCR could not start (HTTP ${response.status}).`,
        );
      }
      if (
        !response.body ||
        !response.headers.get("content-type")?.includes("application/x-ndjson")
      )
        throw new Error("The preview does not have a local OCR endpoint.");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "",
        result;
      while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        let newline;
        while ((newline = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, newline);
          buffer = buffer.slice(newline + 1);
          if (!line) continue;
          const message = JSON.parse(line);
          if (message.type === "error") throw new Error(message.error);
          if (message.type === "stage") setStage(message.stage);
          if (message.type === "result") result = message.cases;
        }
        if (done) break;
      }
      if (!Array.isArray(result) || !result.length)
        throw new Error(
          "OCR ended without reviewable pages. Retry with a page image.",
        );
      onAdd(result.map((item) => ({ ...item, domainId: domainId || null })));
    } catch (e) {
      if (e.name === "AbortError")
        setStage("OCR cancelled. No pages were added.");
      else {
        setError(e.message);
        setStage("OCR did not complete. The document can be retried.");
      }
    } finally {
      setBusy(false);
      if (controller.current === abort) controller.current = null;
    }
  }
  return (
    <dialog
      ref={ref}
      className="import-dialog"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      aria-labelledby={headingId}
    >
      <form onSubmit={submit}>
        <header>
          <h2 id={headingId}>Run local OCR</h2>
          <button type="button" onClick={close}>
            {busy ? "Cancel and close" : "Close"}
          </button>
        </header>
        <p>
          Upload a document to Tesseract on this computer. Each page opens
          beside its original OCR text for human review.
        </p>
        <p className="domain-intro">
          Healthcare evaluation: use synthetic documents. This prototype is not
          cleared for real patient data or clinical decisions. Local processing
          alone does not establish healthcare compliance.
        </p>
        <label>
          Document (PNG, JPEG, WebP, or PDF)
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,application/pdf"
            disabled={busy}
            onChange={(event) => {
              setFile(event.target.files?.[0] || null);
              setError("");
            }}
          />
        </label>
        <small>
          Up to 8 MiB; PDFs up to 10 pages. English OCR. Complex tables,
          handwriting, doses, units, and negation require source review.
        </small>
        <label>
          Document domain
          <select
            value={domainId}
            onChange={(event) => setDomainId(event.target.value)}
            disabled={busy}
          >
            <option value="">Unassigned</option>
            {domains.map((domain) => (
              <option key={domain.id} value={domain.id}>
                {domain.name} · v{domain.version}
              </option>
            ))}
          </select>
        </label>
        <p role="status" aria-live="polite">
          {stage}
        </p>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <footer>
          {busy && (
            <button type="button" onClick={cancel}>
              Cancel OCR
            </button>
          )}
          <button
            type="submit"
            className="primary"
            disabled={busy || !health?.available || !file}
          >
            {busy ? "Processing…" : "Extract and review"}
          </button>
        </footer>
        <small>
          Temporary files are removed after completion or cancellation. Adding
          pages to the workspace follows its current browser-storage setting.
          Nothing is sent to a cloud OCR provider.
        </small>
      </form>
    </dialog>
  );
}
