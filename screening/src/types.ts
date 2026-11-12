export type Verdict = "Passed" | "NeedsReview" | "Rejected";

/** Severity of one layer's finding. "reject" beats "review" beats "ok". */
export type Severity = "ok" | "review" | "reject";

export type LayerName = "raw" | "neighbors" | "metadata" | "ai" | "duplicate";

export interface LayerResult {
  layer: LayerName;
  severity: Severity;
  /** Short reason in English, shown in the UI and stored on-chain. */
  reason: string;
  /** Optional numeric evidence (similarity, AI likelihood, ...), 0..1. */
  value?: number;
}

export interface CameraMeta {
  make?: string;
  model?: string;
  lens?: string;
  serial?: string;
  takenAt?: string; // ISO string
  iso?: number;
  exposureTime?: number;
  fNumber?: number;
}

/** One record from the contract's `list_phashes` view. */
export interface PhashRecord {
  entry_id: number;
  contest_id: number;
  participant: string;
  phash: string;
  submitted_at_ms: number;
}

export interface ScreeningResult {
  verdict: Verdict;
  phash: string;
  reasons: string[];
  layers: LayerResult[];
}
