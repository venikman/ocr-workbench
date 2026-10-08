import { OcrWorkbench } from "./index.jsx";
import { demoBundle } from "./demo.js";

// Standalone conveniences are opt-in; they are not component defaults.
export function App() {
  return (
    <OcrWorkbench
      initialBundle={demoBundle}
      storageKey="ocr-workbench-v1"
      ocrBaseUrl="/api"
      showExamples
    />
  );
}
