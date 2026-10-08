import type { CSSProperties, ReactElement } from "react";

export interface DomainProfile {
  id: string;
  name: string;
  version: number;
  description: string;
  reviewPolicy?: "clinical";
  ontology: {
    concepts: Array<{ id: string; label: string; description: string }>;
    relations: Array<{ id: string; from: string; to: string; label: string }>;
  };
  specification: {
    rules: Array<{
      id: string;
      title: string;
      description: string;
      conceptIds: string[];
    }>;
  };
}
export interface ClinicalContext {
  subject: "unknown" | "patient" | "family" | "other";
  assertion: "unknown" | "present" | "negated" | "uncertain" | "not-documented";
  temporality: "unknown" | "current" | "historical" | "planned";
  eventStatus:
    "unknown" | "ordered" | "performed" | "not-performed" | "not-applicable";
  value: string;
  unit: string;
  decision: "unreviewed" | "accepted" | "rejected" | "needs-review";
}
export interface ClinicalReview {
  identity: "unchecked" | "matched" | "mismatch" | "unverifiable";
  reviewer: string;
  note: string;
  checks: Record<
    "subject" | "negation" | "temporality" | "values" | "completeness",
    boolean
  >;
}
export interface Finding {
  id: string;
  box: { x: number; y: number; w: number; h: number } | null;
  lines: { start: number; end: number } | null;
  category: "structure" | "omission" | "text" | "order" | "other";
  note: string;
  correction: string;
  status: "open" | "resolved";
  conceptIds: string[];
  ruleIds: string[];
  clinical?: ClinicalContext;
}
export interface RunReview {
  annotations: Finding[];
  done: boolean;
  reviewedAt: string | null;
  clinicalReview?: ClinicalReview;
}
export interface DocumentCase {
  id: string;
  title: string;
  domainId: string | null;
  source: {
    image: string;
    page: number;
    width?: number;
    height?: number;
    url?: string;
  };
  runs: Array<{ id: string; model: string; raw: string; origin: string }>;
  reviews: Record<string, RunReview>;
}
export interface ReviewBundle {
  schemaVersion: 3;
  domains: DomainProfile[];
  cases: DocumentCase[];
  exportedAt?: string;
}
export interface OcrWorkbenchProps {
  /** Nonempty schema-3 bundle. Validated and copied on mount. Remount with a new React key to replace it. */
  initialBundle: ReviewBundle;
  /** Receives a separate snapshot after edits/undo/restore. Does not imply that the host has saved it. */
  onChange?: (bundle: ReviewBundle) => void | Promise<void>;
  /** Opt-in IndexedDB database name. Omit to prevent browser reads and writes. Autosave starts off. */
  storageKey?: string | null;
  /** Same-origin API path implementing the local OCR protocol; omitted disables the OCR execution UI. */
  ocrBaseUrl?: string | null;
  /** Include the synthetic healthcare example action. Defaults to false. Host must serve its assets. */
  showExamples?: boolean;
  /** Applied to the parent-sized outer container. Host must allocate an explicit height. */
  className?: string;
  style?: CSSProperties;
}
export declare function OcrWorkbench(props: OcrWorkbenchProps): ReactElement;
