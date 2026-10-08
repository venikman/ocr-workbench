"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  validateBundle,
  updateReview,
  markReviewed,
  normalizeBox,
  createAnnotation,
  exportBundle,
  assignDomain,
  saveDomain,
} from "./review.js";
import { previewDocument } from "./preview.js";
import { DomainDialog, FindingLinksDialog } from "./DomainDialog.jsx";
import {
  ClinicalReviewDialog,
  ClinicalContextDialog,
} from "./HealthcareDialog.jsx";
import { healthcareDomain } from "./healthcare-domain.js";
import { createHealthcareCases } from "./healthcare-demo.js";
import { RunOcrDialog } from "./RunOcrDialog.jsx";
const blankReview = () => ({ annotations: [], done: false, reviewedAt: null });
const uid = (prefix) => `${prefix}-${crypto.randomUUID()}`;
const pairList = (b) =>
  b.cases.flatMap((c) => c.runs.map((r) => ({ caseId: c.id, runId: r.id })));
const readFile = (f) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error("Could not read this file."));
    r.readAsDataURL(f);
  });
function ImportDialog({ mode, onClose, onAdd, currentCase, domains }) {
  const [title, setTitle] = useState(""),
    [model, setModel] = useState("Imported OCR"),
    [raw, setRaw] = useState(""),
    [file, setFile] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [domainId, setDomainId] = useState(""),
    ref = useRef(null);
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (!raw.trim()) throw new Error("Add the original OCR text.");
      if (raw.length > 500000)
        throw new Error("Keep each output below 500,000 characters.");
      let source;
      if (mode === "pair") {
        if (
          !file ||
          !["image/png", "image/jpeg", "image/webp"].includes(file.type)
        )
          throw new Error("Choose a PNG, JPEG, or WebP page image.");
        if (file.size > 8 * 1024 * 1024)
          throw new Error("Choose a page image smaller than 8 MB.");
        const image = await readFile(file),
          bitmap = await createImageBitmap(file);
        source = { image, page: 1, width: bitmap.width, height: bitmap.height };
        bitmap.close();
      }
      const run = {
        id: uid("run"),
        model: model.trim() || "Imported OCR",
        raw,
        origin: "Imported by reviewer; execution not verified",
      };
      onAdd(
        mode === "pair"
          ? {
              id: uid("case"),
              title: title.trim() || file.name,
              domainId: domainId || null,
              source,
              runs: [run],
              reviews: { [run.id]: blankReview() },
            }
          : run,
      );
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }
  return (
    <dialog ref={ref} className="import-dialog" onCancel={onClose}>
      <form onSubmit={submit}>
        <header>
          <h2>
            {mode === "pair"
              ? "Import a document pair"
              : "Add another OCR output"}
          </h2>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </header>
        <p>
          {mode === "pair"
            ? "Choose a page image and its existing OCR output. Files stay in this browser."
            : `Compare another output against ${currentCase.title}.`}
        </p>
        {mode === "pair" && (
          <>
            <label>
              Document name
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Inspection report · page 1"
                maxLength={160}
              />
            </label>
            <label>
              Page image (PNG, JPEG, WebP)
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => setFile(e.target.files[0])}
              />
            </label>
            <label>
              Document domain
              <select
                value={domainId}
                onChange={(e) => setDomainId(e.target.value)}
              >
                <option value="">Unassigned</option>
                {domains.map((domain) => (
                  <option key={domain.id} value={domain.id}>
                    {domain.name} · v{domain.version}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        <label>
          Model or extraction method
          <input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            maxLength={160}
            required
          />
        </label>
        <label>
          Load text file (optional)
          <input
            type="file"
            accept=".txt,.md,.html,.htm"
            onChange={async (e) => {
              const f = e.target.files[0];
              if (!f) return;
              if (f.size > 500000) {
                setError("Text file must be below 500 kB.");
                return;
              }
              setRaw(await f.text());
            }}
          />
        </label>
        <label>
          Original OCR text
          <textarea
            autoFocus
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            rows={9}
            placeholder="Paste plain text, Markdown, or HTML here…"
            spellCheck="false"
          />
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <footer>
          <span>Each import creates an independent output.</span>
          <button type="submit" className="primary" disabled={busy}>
            {busy ? "Importing…" : "Import for review"}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
export function WorkbenchSession({
  initialBundle,
  onChange,
  storageKey,
  ocrBaseUrl,
  showExamples,
}) {
  const [bundle, setBundle] = useState(() => validateBundle(initialBundle)),
    [revision, setRevision] = useState(0),
    [loaded, setLoaded] = useState(false),
    [autosave, setAutosave] = useState(false),
    [clinicalModal, setClinicalModal] = useState(null),
    [saveState, setSaveState] = useState("Loading…"),
    [pairIndex, setPairIndex] = useState(0),
    [selected, setSelected] = useState(null),
    [range, setRange] = useState(null),
    [tab, setTab] = useState("raw"),
    [zoom, setZoom] = useState(1),
    [fitMode, setFitMode] = useState("width"),
    [drawing, setDrawing] = useState(false),
    [draftBox, setDraftBox] = useState(null),
    [modal, setModal] = useState(null),
    [domainLibrary, setDomainLibrary] = useState(false),
    [linking, setLinking] = useState(null),
    [notice, setNotice] = useState(""),
    [filter, setFilter] = useState("all"),
    [history, setHistory] = useState([]),
    [help, setHelp] = useState(false),
    [storageWarning, setStorageWarning] = useState(""),
    [fitWidth, setFitWidth] = useState(600);
  const instanceId = useId();
  const rootRef = useRef(null),
    deliveredRevision = useRef(0),
    pageRef = useRef(null),
    rawRef = useRef(null),
    stageRef = useRef(null),
    findingsRef = useRef(null),
    drag = useRef(null),
    dbRef = useRef(null),
    jsonInput = useRef(null);
  const pairs = useMemo(() => pairList(bundle), [bundle]),
    pair = pairs[Math.min(pairIndex, pairs.length - 1)],
    doc = bundle.cases.find((c) => c.id === pair.caseId),
    domain = bundle.domains.find((d) => d.id === doc.domainId),
    run = doc.runs.find((r) => r.id === pair.runId),
    review = doc.reviews[run.id],
    annotation = review.annotations.find((a) => a.id === selected),
    lines = useMemo(() => run.raw.split("\n"), [run.raw]),
    preview = useMemo(
      () =>
        tab === "rendered" && typeof document !== "undefined"
          ? previewDocument(run.raw)
          : "",
      [run.raw, tab],
    ),
    reviewed = pairs.filter(
      (p) => bundle.cases.find((c) => c.id === p.caseId).reviews[p.runId]?.done,
    ).length;
  useEffect(() => {
    if (!storageKey) {
      setLoaded(true);
      return;
    }
    let active = true;
    let failed = false;
    let connection = null;
    const fallback = (message) => {
      if (!active || failed) return;
      failed = true;
      dbRef.current = null;
      connection?.close();
      setSaveState("Not saved");
      setStorageWarning(message);
      setLoaded(true);
    };
    try {
      const request = indexedDB.open(storageKey, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains("reviews"))
          request.result.createObjectStore("reviews");
      };
      request.onerror = () =>
        fallback(
          "Browser storage is unavailable. Export your review to keep it.",
        );
      request.onblocked = () =>
        fallback(
          "Browser storage is blocked by another tab. Existing data has not been overwritten. Export new work before closing.",
        );
      request.onsuccess = () => {
        const opened = request.result;
        if (!active || failed) {
          opened.close();
          return;
        }
        connection = opened;
        connection.onversionchange = () =>
          fallback(
            "Browser storage changed in another tab. Export your current review before reloading.",
          );
        try {
          const tx = connection.transaction("reviews", "readonly");
          const get = tx.objectStore("reviews").get("bundle");
          let restored;
          get.onsuccess = () => {
            if (!active || failed) return;
            if (get.result !== undefined) {
              try {
                restored = validateBundle(get.result);
              } catch {
                fallback(
                  "Saved data could not be read and has not been overwritten. Export new work before closing.",
                );
              }
            }
          };
          tx.onerror = tx.onabort = () =>
            fallback(
              "Could not read the local review. Existing data has not been overwritten. Export new work before closing.",
            );
          tx.oncomplete = () => {
            if (!active || failed) return;
            // Enable writes only after the stored bundle has been read and validated.
            dbRef.current = connection;
            if (restored) setBundle(restored);
            setLoaded(true);
          };
        } catch {
          fallback(
            "Could not open the local review store. Existing data has not been overwritten. Export new work before closing.",
          );
        }
      };
    } catch {
      fallback(
        "Browser storage is unavailable. Export your review to keep it.",
      );
    }
    return () => {
      active = false;
      connection?.close();
      if (dbRef.current === connection) dbRef.current = null;
    };
  }, [storageKey]);
  useEffect(() => {
    if (!revision || deliveredRevision.current === revision) return;
    deliveredRevision.current = revision;
    if (!onChange) return;
    let active = true;
    // The host receives its own snapshot, never mutable access to internal state.
    Promise.resolve()
      .then(() => onChange(structuredClone(bundle)))
      .catch(() => {
        if (active)
          setNotice(
            "The host could not accept the review update. Export your work before leaving.",
          );
      });
    return () => {
      active = false;
    };
  }, [bundle, revision, onChange]);
  useEffect(() => {
    if (!loaded) return;
    if (!autosave) {
      setSaveState(onChange && !storageKey ? "Host-managed" : "Session only");
      return;
    }
    if (!dbRef.current) {
      setSaveState("Not saved");
      return;
    }
    setSaveState("Saving…");
    let active = true;
    let failed = false;
    const failSave = () => {
      failed = true;
      if (!active) return;
      setSaveState("Save failed");
      setStorageWarning("Local save failed. Export before closing this page.");
    };
    try {
      const database = dbRef.current;
      const tx = database.transaction("reviews", "readwrite");
      tx.oncomplete = () => {
        if (active && !failed && dbRef.current === database) {
          setSaveState("Saved locally");
          setStorageWarning("");
        }
      };
      tx.onerror = tx.onabort = failSave;
      tx.objectStore("reviews").put(bundle, "bundle");
    } catch {
      failSave();
    }
    return () => {
      active = false;
    };
  }, [bundle, loaded, autosave, onChange, storageKey]);
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      const ratio = (doc.source.width || 612) / (doc.source.height || 792);
      const style = getComputedStyle(el);
      const width =
        el.clientWidth -
        parseFloat(style.paddingLeft) -
        parseFloat(style.paddingRight);
      const height =
        el.clientHeight -
        parseFloat(style.paddingTop) -
        parseFloat(style.paddingBottom);
      setFitWidth(
        Math.max(
          100,
          fitMode === "width" ? width : Math.min(width, height * ratio),
        ),
      );
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [doc.id, doc.source.width, doc.source.height, loaded, fitMode]);
  useEffect(() => {
    drag.current = null;
    setSelected(null);
    setRange(null);
    setDraftBox(null);
    setZoom(1);
    setFilter("all");
    setDrawing(false);
  }, [pair.caseId, pair.runId]);
  useEffect(() => {
    const container = rawRef.current;
    const line =
      annotation?.lines &&
      tab === "raw" &&
      container?.querySelector(`[data-line="${annotation.lines.start}"]`);
    if (line) {
      const bounds = line.getBoundingClientRect();
      const view = container.getBoundingClientRect();
      container.scrollTo({
        top:
          container.scrollTop +
          bounds.top -
          view.top -
          (container.clientHeight - bounds.height) / 2,
        behavior: "smooth",
      });
    }
    const list = findingsRef.current;
    const card = selected && list?.querySelector(".annotation-card.selected");
    if (card) {
      const bounds = card.getBoundingClientRect();
      const view = list.getBoundingClientRect();
      if (bounds.top < view.top || bounds.bottom > view.bottom)
        list.scrollTo({
          top: list.scrollTop + bounds.top - view.top,
          behavior: "smooth",
        });
    }
  }, [selected, tab]);
  useEffect(() => {
    if (drag.current) return; // Never move the source coordinate frame during a pointer gesture.
    const stage = stageRef.current;
    const target =
      selected && stage?.querySelector(`[data-box-id="${selected}"]`);
    if (!target) return;
    const bounds = target.getBoundingClientRect();
    const view = stage.getBoundingClientRect();
    if (
      bounds.top < view.top ||
      bounds.bottom > view.bottom ||
      bounds.left < view.left ||
      bounds.right > view.right
    ) {
      stage.scrollTo({
        top:
          stage.scrollTop +
          bounds.top -
          view.top -
          (stage.clientHeight - bounds.height) / 2,
        left:
          stage.scrollLeft +
          bounds.left -
          view.left -
          (stage.clientWidth - bounds.width) / 2,
        behavior: "smooth",
      });
    }
  }, [selected, pair.caseId, pair.runId, fitWidth, zoom]);
  useEffect(() => {
    stageRef.current?.scrollTo({ top: 0, left: 0, behavior: "instant" });
    rawRef.current?.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [doc.id]);
  function commit(next) {
    setHistory((h) => [...h.slice(-19), bundle]);
    setBundle(next);
    setRevision((value) => value + 1);
    setNotice("");
  }
  function editReview(fn) {
    try {
      commit(updateReview(bundle, doc.id, run.id, fn));
    } catch (e) {
      setNotice(e.message);
    }
  }
  function updateAnnotation(id, patch) {
    editReview((r) =>
      Object.assign(
        r.annotations.find((a) => a.id === id),
        patch,
      ),
    );
  }
  function addAnnotation(box = null) {
    const item = createAnnotation(range, box);
    editReview((r) => r.annotations.push(item));
    setSelected(item.id);
    setDrawing(false);
    setFilter("all");
  }
  function removeAnnotation(id) {
    editReview((r) => {
      r.annotations = r.annotations.filter((a) => a.id !== id);
    });
    if (selected === id) setSelected(null);
    setNotice("Annotation removed. Undo is available.");
  }
  function undo() {
    if (!history.length) return;
    setBundle(history.at(-1));
    setRevision((value) => value + 1);
    setHistory((h) => h.slice(0, -1));
    setSelected(null);
    setNotice("Last edit undone.");
  }
  function changePair(index) {
    setPairIndex((index + pairs.length) % pairs.length);
  }
  function complete() {
    try {
      commit(markReviewed(bundle, doc.id, run.id, !review.done));
      setNotice(
        review.done
          ? "Review reopened."
          : "Review complete. Known errors and original OCR are preserved.",
      );
    } catch (e) {
      setNotice(e.message);
    }
  }
  function clickLine(n, shift) {
    const start = shift ? (annotation?.lines?.start ?? range?.start ?? n) : n,
      next = { start: Math.min(start, n), end: Math.max(start, n) };
    setRange(next);
    if (annotation) updateAnnotation(annotation.id, { lines: next });
  }
  async function exportReview(onlyDone = false) {
    try {
      const snapshot = structuredClone(bundle);
      if (onlyDone) {
        snapshot.cases = snapshot.cases
          .map((c) => ({
            ...c,
            runs: c.runs.filter((r) => c.reviews[r.id].done),
            reviews: Object.fromEntries(
              Object.entries(c.reviews).filter(([, r]) => r.done),
            ),
          }))
          .filter((c) => c.runs.length);
        if (!snapshot.cases.length)
          throw new Error("Mark at least one pair reviewed first.");
      }
      for (const c of snapshot.cases) {
        if (!c.source.image.startsWith("data:")) {
          const response = await fetch(c.source.image);
          if (!response.ok)
            throw new Error("Source image could not be bundled.");
          c.source.image = await readFile(await response.blob());
        }
      }
      const href = URL.createObjectURL(
          new Blob([exportBundle(snapshot)], { type: "application/json" }),
        ),
        link = document.createElement("a");
      link.href = href;
      link.download = `ocr-review${onlyDone ? "-completed" : ""}-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(href), 30000);
      setNotice("Review bundle prepared; download requested.");
    } catch (e) {
      setNotice(e.message);
    }
  }
  async function importReview(e) {
    const f = e.target.files[0];
    e.target.value = "";
    if (!f) return;
    try {
      if (f.size > 50 * 1024 * 1024)
        throw new Error("Review bundles must be smaller than 50 MB.");
      commit(validateBundle(JSON.parse(await f.text())));
      setPairIndex(0);
      setSelected(null);
      setNotice(
        "Review bundle restored. Undo returns to the previous workspace.",
      );
    } catch (e) {
      setNotice(`Import failed: ${e.message}`);
    }
  }
  function imported(value) {
    const next = structuredClone(bundle);
    if (modal === "pair") {
      next.cases.push(value);
      commit(validateBundle(next));
      setPairIndex(pairs.length);
    } else {
      const c = next.cases.find((c) => c.id === doc.id);
      c.runs.push(value);
      c.reviews[value.id] = blankReview();
      commit(validateBundle(next));
      setPairIndex(
        pairList(next).findIndex(
          (p) => p.caseId === doc.id && p.runId === value.id,
        ),
      );
    }
    setModal(null);
    setNotice("Imported for review.");
  }
  function addOcrCases(cases) {
    const next = validateBundle({
      ...bundle,
      cases: [...bundle.cases, ...cases],
    });
    commit(next);
    setPairIndex(pairs.length);
    setModal(null);
    setNotice(
      `Local OCR finished for ${cases.length} page${cases.length === 1 ? "" : "s"}. Verify the source before relying on any reading.`,
    );
  }
  function loadHealthcareExample() {
    try {
      const cases = createHealthcareCases();
      const existing = bundle.cases.find((c) => c.id === cases[0].id);
      if (existing) {
        setPairIndex(pairs.findIndex((p) => p.caseId === existing.id));
        setNotice(
          "Opened the existing synthetic example; your review is preserved.",
        );
        return;
      }
      const next = bundle.domains.some((d) => d.id === healthcareDomain.id)
        ? bundle
        : saveDomain(bundle, healthcareDomain);
      commit(validateBundle({ ...next, cases: [...next.cases, ...cases] }));
      setPairIndex(pairs.length);
      setNotice(
        "Synthetic healthcare example added. Check its source, review rules, and clinical context. Undo removes this addition.",
      );
    } catch (e) {
      setNotice(e.message);
    }
  }
  function saveClinicalContext(annotationId, value) {
    let next = updateReview(bundle, doc.id, run.id, (r) => {
      r.annotations.find((a) => a.id === annotationId).clinical = value;
    });
    // A deliberate decision in this dialog applies to the newly entered context.
    next = updateReview(next, doc.id, run.id, (r) => {
      r.annotations.find((a) => a.id === annotationId).clinical.decision =
        value.decision;
    });
    commit(next);
  }
  function changeDomain(domainId) {
    try {
      if (doc.domainId === domainId) return;
      commit(assignDomain(bundle, doc.id, domainId));
      setNotice(
        "Document domain changed. Its reviews reopened and prior domain links cleared; source anchors and notes are preserved. Undo is available.",
      );
    } catch (e) {
      setNotice(e.message);
    }
  }
  function saveProfile(profile) {
    const next = saveDomain(bundle, profile);
    commit(next);
    return next.domains.find((d) => d.id === profile.id);
  }
  function point(e) {
    const rect = pageRef.current.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
    };
  }
  function pointerDown(e) {
    if (e.button !== 0) return;
    const target = e.target.closest("[data-box-id]"),
      p = point(e);
    if (target && !drawing) {
      const a = review.annotations.find((a) => a.id === target.dataset.boxId);
      setSelected(a.id);
      drag.current = {
        mode: e.target.dataset.resize ? "resize" : "move",
        id: a.id,
        start: p,
        original: a.box,
      };
    } else if (drawing) {
      drag.current = { mode: "draw", start: p };
      setDraftBox({ x: p.x, y: p.y, w: 0, h: 0 });
    } else return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function pointerMove(e) {
    if (!drag.current) return;
    const d = drag.current,
      p = point(e);
    let b;
    if (d.mode === "draw") b = normalizeBox(d.start.x, d.start.y, p.x, p.y);
    else if (d.mode === "move")
      b = {
        ...d.original,
        x: Math.max(
          0,
          Math.min(1 - d.original.w, d.original.x + p.x - d.start.x),
        ),
        y: Math.max(
          0,
          Math.min(1 - d.original.h, d.original.y + p.y - d.start.y),
        ),
      };
    else
      b = {
        ...d.original,
        w: Math.max(
          0.005,
          Math.min(1 - d.original.x, d.original.w + p.x - d.start.x),
        ),
        h: Math.max(
          0.005,
          Math.min(1 - d.original.y, d.original.h + p.y - d.start.y),
        ),
      };
    drag.current.current = b;
    setDraftBox(b);
  }
  function pointerUp() {
    const d = drag.current;
    if (!d) return;
    const b = d.current;
    drag.current = null;
    if (b?.w >= 0.005 && b?.h >= 0.005) {
      if (d.mode === "draw") addAnnotation(b);
      else updateAnnotation(d.id, { box: b });
    }
    setDraftBox(null);
  }
  function boxKey(e, a) {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
      e.preventDefault();
      const dx =
          e.key === "ArrowLeft" ? -0.002 : e.key === "ArrowRight" ? 0.002 : 0,
        dy = e.key === "ArrowUp" ? -0.002 : e.key === "ArrowDown" ? 0.002 : 0,
        b = a.box;
      updateAnnotation(a.id, {
        box: e.shiftKey
          ? {
              ...b,
              w: Math.max(0.005, Math.min(1 - b.x, b.w + dx)),
              h: Math.max(0.005, Math.min(1 - b.y, b.h + dy)),
            }
          : {
              ...b,
              x: Math.max(0, Math.min(1 - b.w, b.x + dx)),
              y: Math.max(0, Math.min(1 - b.h, b.y + dy)),
            },
      });
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      removeAnnotation(a.id);
    }
  }
  useEffect(() => {
    function handle(e) {
      if (!loaded || e.defaultPrevented || !rootRef.current?.contains(e.target))
        return;
      if (e.key === "Escape") {
        drag.current = null;
        setDraftBox(null);
        setDrawing(false);
        setSelected(null);
        setRange(null);
        setHelp(false);
        return;
      }
      if (
        e.target.closest(
          "input,textarea,select,dialog,[contenteditable=true]",
        ) ||
        e.metaKey ||
        e.ctrlKey ||
        e.altKey
      )
        return;
      if (e.key === "j") {
        e.preventDefault();
        changePair(pairIndex + 1);
      }
      if (e.key === "k") {
        e.preventDefault();
        changePair(pairIndex - 1);
      }
      if (e.key === "n") {
        e.preventDefault();
        addAnnotation();
      }
    }
    const root = rootRef.current;
    root?.addEventListener("keydown", handle);
    return () => root?.removeEventListener("keydown", handle);
  });
  const boxStyle = (b) => ({
    left: `${b.x * 100}%`,
    top: `${b.y * 100}%`,
    width: `${b.w * 100}%`,
    height: `${b.h * 100}%`,
  });
  if (!loaded)
    return (
      <div className="ocr-workbench loading-screen" role="status">
        Loading reviews…
      </div>
    );
  return (
    <div
      className="ocr-workbench workbench"
      ref={rootRef}
      tabIndex={-1}
      aria-label="OCR review workbench"
    >
      <header className="toolbar">
        <div className="brand">OCR review</div>
        <select
          aria-label="Document"
          value={doc.id}
          onChange={(e) =>
            setPairIndex(pairs.findIndex((p) => p.caseId === e.target.value))
          }
        >
          {bundle.cases.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
        <span className="separator">/</span>
        <select
          aria-label="OCR model"
          value={run.id}
          onChange={(e) =>
            setPairIndex(
              pairs.findIndex(
                (p) => p.caseId === doc.id && p.runId === e.target.value,
              ),
            )
          }
        >
          {doc.runs.map((r) => (
            <option key={r.id} value={r.id}>
              {r.model}
            </option>
          ))}
        </select>
        <span className="progress">
          {reviewed}/{pairs.length} pairs reviewed
        </span>
        <button
          type="button"
          className={review.done ? "done-button" : ""}
          onClick={complete}
        >
          {review.done ? "Reopen review" : "Mark reviewed"}
        </button>
        <div className="pair-nav">
          <button
            type="button"
            aria-label="Previous pair"
            onClick={() => changePair(pairIndex - 1)}
          >
            Prev <kbd>k</kbd>
          </button>
          <button
            type="button"
            aria-label="Next pair"
            onClick={() => changePair(pairIndex + 1)}
          >
            Next <kbd>j</kbd>
          </button>
        </div>
        <span
          className={`save-state ${saveState.includes("failed") ? "error" : ""}`}
          role="status"
        >
          {saveState}
        </span>
        {ocrBaseUrl && (
          <button
            type="button"
            className="primary"
            onClick={() => setModal("ocr")}
          >
            Run local OCR
          </button>
        )}
        <details className="export-menu">
          <summary>Files</summary>
          <div
            onClick={(e) => {
              if (e.target.closest("button"))
                e.currentTarget.parentElement.open = false;
            }}
          >
            <button type="button" onClick={() => setModal("pair")}>
              Import pair
            </button>
            {showExamples && (
              <button type="button" onClick={loadHealthcareExample}>
                Healthcare example
              </button>
            )}
            <button type="button" onClick={() => exportReview()}>
              Export all reviews
            </button>
            <button type="button" onClick={() => exportReview(true)}>
              Export completed reviews
            </button>
            <button type="button" onClick={() => jsonInput.current.click()}>
              Restore review bundle
            </button>
          </div>
        </details>
        <input
          ref={jsonInput}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={importReview}
        />
      </header>
      <div className="domain-bar">
        <label>
          Domain
          <select
            aria-label="Document domain"
            value={doc.domainId || ""}
            onChange={(e) => changeDomain(e.target.value || null)}
          >
            <option value="">Unassigned</option>
            {bundle.domains.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} · v{d.version}
              </option>
            ))}
          </select>
        </label>
        <span>
          {domain
            ? `${domain.specification.rules.length} review rules · ${domain.ontology.concepts.length} concepts · ${domain.ontology.relations.length} relations`
            : "Assign a domain to link findings to its rules and concepts."}
        </span>
        <button type="button" onClick={() => setDomainLibrary(true)}>
          Specification & ontology
        </button>
        <details className="workspace-options">
          <summary>Workspace settings</summary>
          <div className="data-bar">
            {storageKey && (
              <label>
                <input
                  type="checkbox"
                  checked={autosave}
                  onChange={(e) => setAutosave(e.target.checked)}
                />
                Browser autosave
              </label>
            )}
            <span>
              {!storageKey
                ? onChange
                  ? "Review changes are sent to the host application. Check its save status; browser storage is disabled."
                  : "Browser storage is disabled. Export to keep this session’s changes."
                : autosave
                  ? "Documents are saved in this browser without app-level encryption."
                  : "Session changes are not saved. Export to keep them; previous browser saves remain intact."}
            </span>
            <strong>Synthetic data only · healthcare evaluation</strong>
          </div>
        </details>
        <strong className="evaluation-label">Synthetic data only</strong>
      </div>
      {domain?.reviewPolicy === "clinical" && (
        <div className="clinical-bar">
          <span>
            <strong>Clinical review</strong> ·{" "}
            {review.clinicalReview?.identity === "matched"
              ? "Identity checked"
              : review.clinicalReview?.identity === "mismatch"
                ? "Identity mismatch"
                : review.clinicalReview?.identity === "unverifiable"
                  ? "Identity unverifiable"
                  : "Identity not verified"}{" "}
            ·{" "}
            {
              Object.values(review.clinicalReview?.checks || {}).filter(Boolean)
                .length
            }
            /5 source checks
          </span>
          <button type="button" onClick={() => setClinicalModal("review")}>
            Review healthcare checks
          </button>
          <span>Human review required · no clinical release</span>
        </div>
      )}
      {storageWarning && (
        <div className="notice error" role="alert">
          <span>{storageWarning}</span>
        </div>
      )}
      {notice && (
        <div className="notice" role="status">
          <span>{notice}</span>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            Dismiss
          </button>
        </div>
      )}
      <section className="workspace">
        <section className="ocr-panel" aria-label="OCR output">
          <div className="pane-toolbar">
            <div className="tabs">
              <button
                type="button"
                className={tab === "raw" ? "active" : ""}
                onClick={() => setTab("raw")}
              >
                raw
              </button>
              <button
                type="button"
                className={tab === "rendered" ? "active" : ""}
                onClick={() => setTab("rendered")}
              >
                rendered
              </button>
            </div>
            <span>
              {tab === "raw"
                ? "Click a line; shift-click to extend."
                : "Safe preview of original output"}
            </span>
            <button
              type="button"
              className="quiet"
              onClick={() => setModal("run")}
            >
              Add output
            </button>
          </div>
          <div className="run-info" title={run.origin}>
            <span>Original OCR</span>
            <span>{run.origin}</span>
          </div>
          {tab === "raw" ? (
            <div className="raw-output" ref={rawRef}>
              {lines.map((text, i) => {
                const n = i + 1,
                  active = annotation?.lines ?? range,
                  highlight = active && n >= active.start && n <= active.end;
                return (
                  <div
                    key={n}
                    data-line={n}
                    className={`code-line ${highlight ? "highlight" : ""}`}
                  >
                    <button
                      type="button"
                      aria-label={`Line ${n}`}
                      className="line-number"
                      onClick={(e) => clickLine(n, e.shiftKey)}
                    >
                      {n}
                    </button>
                    <code>{text || " "}</code>
                  </div>
                );
              })}
            </div>
          ) : (
            <iframe
              title="Rendered OCR output"
              sandbox=""
              srcDoc={preview}
              className="rendered-output"
            />
          )}
          <footer className="pane-footer">
            <span>
              {lines.length} lines · {run.raw.length.toLocaleString()}{" "}
              characters
            </span>
            <span>
              {(annotation?.lines ?? range)
                ? `L${(annotation?.lines ?? range).start}–L${(annotation?.lines ?? range).end}`
                : "No line range selected"}
            </span>
          </footer>
        </section>
        <section className="document-panel" aria-label="Source document">
          <div className="pane-toolbar">
            <span className="pane-title">Source page {doc.source.page}</span>
            <button
              type="button"
              className={drawing ? "active draw-button" : "draw-button"}
              onClick={() => {
                setDrawing((v) => !v);
                setSelected(null);
              }}
            >
              {drawing ? "Cancel drawing" : "Draw source box"}
            </button>
            <div className="zoom">
              <button
                type="button"
                aria-label="Zoom out"
                disabled={zoom <= 1}
                onClick={() => setZoom((z) => Math.max(1, z - 0.25))}
              >
                −
              </button>
              <span>{Math.round(zoom * 100)}%</span>
              <button
                type="button"
                aria-label="Zoom in"
                disabled={zoom >= 3}
                onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
              >
                +
              </button>
              <button
                type="button"
                aria-label="Fit to width"
                aria-pressed={fitMode === "width" && zoom === 1}
                className={fitMode === "width" && zoom === 1 ? "active" : ""}
                onClick={() => {
                  setFitMode("width");
                  setZoom(1);
                }}
              >
                Width
              </button>
              <button
                type="button"
                aria-label="Fit entire page"
                aria-pressed={fitMode === "page" && zoom === 1}
                className={fitMode === "page" && zoom === 1 ? "active" : ""}
                onClick={() => {
                  setFitMode("page");
                  setZoom(1);
                }}
              >
                Page
              </button>
            </div>
          </div>
          <div
            className={`document-stage ${drawing ? "drawing" : ""}`}
            ref={stageRef}
          >
            <div
              ref={pageRef}
              className="page-image"
              style={{ width: fitWidth * zoom }}
              onPointerDown={pointerDown}
              onPointerMove={pointerMove}
              onPointerUp={pointerUp}
              onPointerCancel={() => {
                drag.current = null;
                setDraftBox(null);
              }}
            >
              <img
                src={doc.source.image}
                alt={`${doc.title}, source page ${doc.source.page}`}
                draggable="false"
              />
              {review.annotations
                .filter((a) => a.box)
                .map((a) => {
                  const n =
                      review.annotations.findIndex((x) => x.id === a.id) + 1,
                    b =
                      drag.current?.id === a.id && draftBox ? draftBox : a.box;
                  return (
                    <button
                      type="button"
                      key={a.id}
                      data-box-id={a.id}
                      className={`annotation-box ${selected === a.id ? "selected" : ""} ${a.status === "resolved" ? "resolved" : ""}`}
                      style={boxStyle(b)}
                      aria-label={`Finding box ${n}: ${a.note || "Untitled annotation"}`}
                      onClick={() => {
                        setSelected(a.id);
                        setFilter("all");
                      }}
                      onKeyDown={(e) => boxKey(e, a)}
                    >
                      <span className="box-number">{n}</span>
                      {selected === a.id && (
                        <span data-resize="true" className="resize-handle" />
                      )}
                    </button>
                  );
                })}
              {draftBox && drag.current?.mode === "draw" && (
                <div
                  className="annotation-box draft"
                  style={boxStyle(draftBox)}
                />
              )}
            </div>
          </div>
          <footer className="pane-footer">
            <span>
              {drawing
                ? "Drag on the page to create a box."
                : "Select a box to move it; drag its corner to resize."}
            </span>
            {doc.source.url && (
              <a href={doc.source.url} target="_blank" rel="noreferrer">
                Source PDF
              </a>
            )}
          </footer>
        </section>
        <aside className="annotations-panel" aria-label="Review findings">
          <div className="pane-toolbar">
            <span className="pane-title">
              Findings{" "}
              <span className="count">{review.annotations.length}</span>
            </span>
            <button type="button" onClick={() => addAnnotation()}>
              Add
            </button>
          </div>
          <div className="review-status">
            <span className={`status-chip ${review.done ? "complete" : ""}`}>
              {review.done ? "Review complete" : "In review"}
            </span>
            <button
              type="button"
              className="quiet"
              onClick={undo}
              disabled={!history.length}
            >
              Undo
            </button>
          </div>
          <label className="filter">
            <span>Show</span>
            <select
              aria-label="Filter annotations"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">All annotations</option>
              <option value="open">Open</option>
              <option value="resolved">Resolved</option>
            </select>
          </label>
          <div className="annotation-list" ref={findingsRef}>
            {review.annotations.length === 0 && (
              <div className="empty-state">
                <h3>Start a review</h3>
                <p>
                  Select OCR lines, or draw a box on the source. Then describe
                  what differs.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setDrawing(true);
                    setSelected(null);
                  }}
                >
                  Draw first box
                </button>
              </div>
            )}
            {review.annotations
              .filter((a) => filter === "all" || a.status === filter)
              .map((a) => {
                const n = review.annotations.indexOf(a) + 1,
                  isSelected = selected === a.id;
                return (
                  <article
                    key={a.id}
                    className={`annotation-card ${isSelected ? "selected" : ""}`}
                    onClick={() => setSelected(a.id)}
                  >
                    <div className="annotation-heading">
                      <button
                        type="button"
                        className="annotation-number"
                        aria-label={`Select annotation ${n}`}
                        onClick={() => setSelected(a.id)}
                      >
                        {n}
                      </button>
                      <span>
                        {a.box ? "1 box" : "No box"} ·{" "}
                        {a.lines
                          ? `L${a.lines.start}${a.lines.end !== a.lines.start ? "–" + a.lines.end : ""}`
                          : "No lines"}
                      </span>
                      <button
                        type="button"
                        className="delete"
                        aria-label={`Delete annotation ${n}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          removeAnnotation(a.id);
                        }}
                      >
                        ×
                      </button>
                    </div>
                    <label
                      className="sr-only"
                      htmlFor={`${instanceId}-note-${a.id}`}
                    >
                      Annotation {n} note
                    </label>
                    <textarea
                      id={`${instanceId}-note-${a.id}`}
                      className="note-input"
                      value={a.note}
                      placeholder="Describe the finding or review question…"
                      rows={Math.max(
                        2,
                        Math.min(5, Math.ceil(a.note.length / 23)),
                      )}
                      onFocus={() => setSelected(a.id)}
                      onChange={(e) =>
                        updateAnnotation(a.id, { note: e.target.value })
                      }
                    />
                    {domain &&
                      (a.conceptIds.length > 0 || a.ruleIds.length > 0) && (
                        <div
                          className="finding-tags"
                          aria-label={`Annotation ${n} domain links`}
                        >
                          {a.conceptIds.map((id) => (
                            <span key={id}>
                              {
                                domain.ontology.concepts.find(
                                  (c) => c.id === id,
                                ).label
                              }
                            </span>
                          ))}
                          {a.ruleIds.length > 0 && (
                            <span className="rule-tag">
                              {a.ruleIds.length}{" "}
                              {a.ruleIds.length === 1 ? "rule" : "rules"}
                            </span>
                          )}
                        </div>
                      )}
                    {isSelected && (
                      <div className="annotation-details">
                        {domain ? (
                          <button
                            type="button"
                            className="domain-link-button"
                            onClick={() => setLinking(a.id)}
                          >
                            Link concepts & rules
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="domain-link-button"
                            onClick={() => setDomainLibrary(true)}
                          >
                            Assign a domain
                          </button>
                        )}
                        {(domain?.reviewPolicy === "clinical" ||
                          a.clinical) && (
                          <>
                            <button
                              type="button"
                              className="domain-link-button"
                              onClick={() => setClinicalModal(a.id)}
                            >
                              Clinical context
                            </button>
                            {a.clinical && (
                              <p className="clinical-summary">
                                {a.clinical.subject} · {a.clinical.assertion} ·{" "}
                                {a.clinical.temporality}
                                <br />
                                {a.clinical.decision === "accepted"
                                  ? "Mapping accepted by reviewer"
                                  : `Mapping: ${a.clinical.decision}`}
                              </p>
                            )}
                          </>
                        )}
                        <label>
                          Type
                          <select
                            value={a.category}
                            onChange={(e) =>
                              updateAnnotation(a.id, {
                                category: e.target.value,
                              })
                            }
                          >
                            <option value="structure">Structure</option>
                            <option value="omission">Omission</option>
                            <option value="text">Text recognition</option>
                            <option value="order">Reading order</option>
                            <option value="other">Other</option>
                          </select>
                        </label>
                        <label>
                          Original lines
                          <div className="line-range">
                            <input
                              aria-label={`Annotation ${n} start line`}
                              type="number"
                              min="1"
                              max={lines.length}
                              value={a.lines?.start ?? ""}
                              placeholder="from"
                              onChange={(e) => {
                                const start = Math.max(
                                  1,
                                  Math.min(
                                    lines.length,
                                    Number(e.target.value) || 1,
                                  ),
                                );
                                updateAnnotation(a.id, {
                                  lines: {
                                    start,
                                    end: Math.max(start, a.lines?.end ?? start),
                                  },
                                });
                              }}
                            />
                            <span>to</span>
                            <input
                              aria-label={`Annotation ${n} end line`}
                              type="number"
                              min={a.lines?.start ?? 1}
                              max={lines.length}
                              value={a.lines?.end ?? ""}
                              placeholder="to"
                              onChange={(e) => {
                                const end = Math.max(
                                  1,
                                  Math.min(
                                    lines.length,
                                    Number(e.target.value) || 1,
                                  ),
                                );
                                updateAnnotation(a.id, {
                                  lines: {
                                    start: Math.min(a.lines?.start ?? end, end),
                                    end,
                                  },
                                });
                              }}
                            />
                          </div>
                        </label>
                        {a.lines && (
                          <button
                            type="button"
                            className="quiet"
                            onClick={() =>
                              updateAnnotation(a.id, { lines: null })
                            }
                          >
                            Clear line range
                          </button>
                        )}
                        <label>
                          Proposed correction
                          <textarea
                            value={a.correction}
                            rows="3"
                            placeholder="Optional; original stays unchanged"
                            onChange={(e) =>
                              updateAnnotation(a.id, {
                                correction: e.target.value,
                              })
                            }
                          />
                        </label>
                        <label className="resolve">
                          <input
                            type="checkbox"
                            checked={a.status === "resolved"}
                            onChange={(e) =>
                              updateAnnotation(a.id, {
                                status: e.target.checked ? "resolved" : "open",
                              })
                            }
                          />
                          Resolved
                        </label>
                      </div>
                    )}
                    {!isSelected && a.status === "resolved" && (
                      <span className="resolved-label">Resolved</span>
                    )}
                  </article>
                );
              })}
            {review.annotations.length > 0 &&
              !review.annotations.some(
                (a) => filter === "all" || a.status === filter,
              ) && <p className="empty-state">No {filter} annotations.</p>}
          </div>
          <footer className="pane-footer">
            <button
              type="button"
              className="quiet"
              onClick={() => setHelp((v) => !v)}
            >
              Shortcuts & help
            </button>
          </footer>
        </aside>
      </section>
      {help && (
        <section className="help-panel">
          <button type="button" onClick={() => setHelp(false)}>
            Close
          </button>
          <h3>Review controls</h3>
          <p>
            <kbd>j</kbd> next pair · <kbd>k</kbd> previous pair · <kbd>n</kbd>{" "}
            add annotation · <kbd>Esc</kbd> clear selection
          </p>
          <p>
            Click line numbers to anchor an error. Shift-click extends the
            range. Focus a box and use arrows to move it; Shift + arrows resizes
            it. Delete removes it; Undo restores it.
          </p>
          <p>
            Source pages open at Fit width for reading. Use Page for an
            overview; selecting a finding brings its source box into view. Zoom
            stays available in either mode.
          </p>
          <p>
            Review completion records inspection, not accuracy. Further edits
            reopen the review. Export includes unchanged originals and separate
            correction proposals.
          </p>
          <p>
            Rendered view supports plain text and restricted HTML. Scripts,
            images, links, and embedded content are removed.
          </p>
        </section>
      )}
      {modal && modal !== "ocr" && (
        <ImportDialog
          mode={modal}
          onClose={() => setModal(null)}
          onAdd={imported}
          currentCase={doc}
          domains={bundle.domains}
        />
      )}
      {modal === "ocr" && (
        <RunOcrDialog
          apiBaseUrl={ocrBaseUrl}
          domains={bundle.domains}
          initialDomainId={doc.domainId}
          onAdd={addOcrCases}
          onClose={() => setModal(null)}
        />
      )}
      {clinicalModal === "review" && (
        <ClinicalReviewDialog
          review={review}
          onSave={(value) =>
            commit(
              updateReview(bundle, doc.id, run.id, (r) => {
                r.clinicalReview = value;
              }),
            )
          }
          onClose={() => setClinicalModal(null)}
        />
      )}
      {clinicalModal &&
        clinicalModal !== "review" &&
        review.annotations.some((a) => a.id === clinicalModal) && (
          <ClinicalContextDialog
            annotation={review.annotations.find((a) => a.id === clinicalModal)}
            onSave={(value) => saveClinicalContext(clinicalModal, value)}
            onClose={() => setClinicalModal(null)}
          />
        )}
      {domainLibrary && (
        <DomainDialog
          domains={bundle.domains}
          initialId={doc.domainId}
          onSave={saveProfile}
          onAssign={changeDomain}
          onClose={() => setDomainLibrary(false)}
        />
      )}
      {linking &&
        domain &&
        review.annotations.some((a) => a.id === linking) && (
          <FindingLinksDialog
            domain={domain}
            annotation={review.annotations.find((a) => a.id === linking)}
            onApply={(patch) =>
              commit(
                updateReview(bundle, doc.id, run.id, (r) =>
                  Object.assign(
                    r.annotations.find((a) => a.id === linking),
                    patch,
                  ),
                ),
              )
            }
            onClose={() => setLinking(null)}
          />
        )}
    </div>
  );
}
