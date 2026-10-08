"use client";

import { useCallback, useState } from "react";
import { OcrWorkbench } from "@local/ocr-workbench";
import type { ReviewBundle } from "@local/ocr-workbench";

export default function ReviewWorkspace({ initialBundle }: { initialBundle: ReviewBundle }) {
  const [visible, setVisible] = useState(true);
  const [details, setDetails] = useState(false);
  const [latestBundle, setLatestBundle] = useState(initialBundle);
  const [changeCount, setChangeCount] = useState(0);

  const handleChange = useCallback((bundle: ReviewBundle) => {
    setLatestBundle(bundle);
    setChangeCount((count) => count + 1);
  }, []);

  const reviewedCount = latestBundle.cases.reduce(
    (count, document) =>
      count + Object.values(document.reviews ?? {}).filter((review) => review.done).length,
    0,
  );

  return (
    <div className="host-app">
      <header className="host-header">
        <a className="host-brand" href="/">Document workspace</a>
        <span className="host-framework">Next.js component example</span>
        <nav className="host-navigation" aria-label="Host application">
          <button
            type="button"
            aria-expanded={details}
            aria-controls="host-integration-details"
            onClick={() => setDetails((value) => !value)}
          >
            Integration details
          </button>
          <button type="button" onClick={() => setVisible((value) => !value)}>
            {visible ? "Hide review" : "Show review"}
          </button>
        </nav>
      </header>
      {details && (
        <aside className="host-details" id="host-integration-details">
          The host supplies documents and domains and receives review changes.
          This example keeps changes in memory. Browser persistence and OCR
          execution are disabled. Use public or synthetic documents only.
        </aside>
      )}
      <main className="host-main">
        <div className="host-workspace-heading">
          <h1>Document review</h1>
          <output className="host-review-status" aria-live="polite">
            {changeCount} {changeCount === 1 ? "change" : "changes"} received · {reviewedCount} reviewed · Session only
          </output>
        </div>
        <section className="host-review-panel" aria-label="Embedded OCR review">
          {visible ? (
            <OcrWorkbench
              initialBundle={latestBundle}
              onChange={handleChange}
              showExamples
            />
          ) : (
            <div className="host-empty">
              <h2>Review hidden</h2>
              <p>The host still holds your changes. Show the review to continue.</p>
              <button type="button" onClick={() => setVisible(true)}>Show review</button>
            </div>
          )}
        </section>
      </main>
      <footer className="host-footer">Host application shell · public and synthetic sample documents</footer>
    </div>
  );
}
