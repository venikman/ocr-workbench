import type { ReviewBundle } from "./index";
/** Legacy sample input. Call validateBundle before passing it to OcrWorkbench in TypeScript. */
export declare const demoBundle: Omit<ReviewBundle, "schemaVersion"> & {
  schemaVersion: 2;
};
