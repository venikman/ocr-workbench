"use client";

import { useCallback, useState } from "react";
import type { CSSProperties } from "react";
import { OcrWorkbench } from "@local/ocr-workbench";
import type { ReviewBundle } from "@local/ocr-workbench";

export default function ReviewWorkspace({
  initialBundle,
}: {
  initialBundle: ReviewBundle;
}) {
  const [visible, setVisible] = useState(true);
  const [details, setDetails] = useState(false);
  const [latestBundle, setLatestBundle] = useState(initialBundle);
  const [changeCount, setChangeCount] = useState(0);
  const [workbenchDesign, setWorkbenchDesign] = useState<"host" | "classic">(
    "host",
  );
  const [appAppearance, setAppAppearance] = useState<"light" | "dark">("light");
  const [accent, setAccent] = useState("#2563eb");

  // The color control sets host design tokens. The workbench inherits them.
  const channels = accent.match(/[a-f\d]{2}/gi)!.map((value) => {
    const channel = parseInt(value, 16) / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const luminance =
    channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  const hostTokens = {
    "--primary": accent,
    "--primary-foreground": luminance > 0.179 ? "#000000" : "#ffffff",
    "--ring": accent,
  } as CSSProperties;

  const handleChange = useCallback((bundle: ReviewBundle) => {
    setLatestBundle(bundle);
    setChangeCount((count) => count + 1);
  }, []);

  const reviewedCount = latestBundle.cases.reduce(
    (count, document) =>
      count +
      Object.values(document.reviews ?? {}).filter((review) => review.done)
        .length,
    0,
  );

  return (
    <div
      className="host-app"
      data-appearance={appAppearance}
      style={hostTokens}
    >
      <header className="host-header">
        <a className="host-brand" href="/">
          Document workspace
        </a>
        <span className="host-framework">Next.js component example</span>
        <nav className="host-navigation" aria-label="Host application">
          <details className="host-design-settings">
            <summary>Design settings</summary>
            <div className="host-design-panel">
              <label>
                <span>Workbench design</span>
                <select
                  value={workbenchDesign}
                  onChange={(event) =>
                    setWorkbenchDesign(event.target.value as "host" | "classic")
                  }
                >
                  <option value="host">Match app</option>
                  <option value="classic">Classic</option>
                </select>
              </label>
              <label>
                <span>App appearance</span>
                <select
                  value={appAppearance}
                  onChange={(event) =>
                    setAppAppearance(event.target.value as "light" | "dark")
                  }
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </label>
              <label className="host-accent-setting">
                <span>Accent color</span>
                <input
                  type="color"
                  value={accent}
                  onInput={(event) => setAccent(event.currentTarget.value)}
                  onChange={(event) => setAccent(event.target.value)}
                />
                <output>{accent}</output>
              </label>
              <p>
                Match app inherits the host’s colors, typography, borders, and
                radius. Design changes preserve your review.
              </p>
            </div>
          </details>
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
            {changeCount} {changeCount === 1 ? "change" : "changes"} received ·{" "}
            {reviewedCount} reviewed · Session only
          </output>
        </div>
        <section className="host-review-panel" aria-label="Embedded OCR review">
          {visible ? (
            <OcrWorkbench
              initialBundle={latestBundle}
              onChange={handleChange}
              appearance={workbenchDesign}
              showExamples
            />
          ) : (
            <div className="host-empty">
              <h2>Review hidden</h2>
              <p>
                The host still holds your changes. Show the review to continue.
              </p>
              <button type="button" onClick={() => setVisible(true)}>
                Show review
              </button>
            </div>
          )}
        </section>
      </main>
      <footer className="host-footer">
        Host application shell · public and synthetic sample documents
      </footer>
    </div>
  );
}
