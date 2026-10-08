"use client";

import { WorkbenchSession } from "./Workbench.jsx";
import { componentOptions } from "./component-options.js";

/** Uncontrolled review session. Change React key to load another workspace/revision. */
export function OcrWorkbench({
  initialBundle,
  onChange,
  storageKey = null,
  ocrBaseUrl = null,
  showExamples = false,
  className = "",
  style,
}) {
  const options = componentOptions({ storageKey, ocrBaseUrl });
  if (onChange !== undefined && typeof onChange !== "function")
    throw new Error("onChange must be a function.");
  return (
    <div className={`ocr-workbench-container ${className}`} style={style}>
      <WorkbenchSession
        key={
          options.storageKey === null
            ? "storage:none"
            : `storage:${options.storageKey}`
        }
        initialBundle={initialBundle}
        onChange={onChange}
        {...options}
        showExamples={showExamples}
      />
    </div>
  );
}
