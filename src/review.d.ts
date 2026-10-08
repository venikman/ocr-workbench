import type { ReviewBundle, RunReview, DomainProfile, Finding } from "./index";
export declare function validateBundle(input: unknown): ReviewBundle;
export declare function exportBundle(bundle: ReviewBundle): string;
export declare function updateReview(
  bundle: ReviewBundle,
  caseId: string,
  runId: string,
  update: (review: RunReview) => void,
): ReviewBundle;
export declare function markReviewed(
  bundle: ReviewBundle,
  caseId: string,
  runId: string,
  done: boolean,
): ReviewBundle;
export declare function assignDomain(
  bundle: ReviewBundle,
  caseId: string,
  domainId: string | null,
): ReviewBundle;
export declare function saveDomain(
  bundle: ReviewBundle,
  profile: DomainProfile,
): ReviewBundle;
export declare function createAnnotation(
  lines?: Finding["lines"],
  box?: Finding["box"],
): Finding;
export declare function normalizeBox(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): NonNullable<Finding["box"]>;
