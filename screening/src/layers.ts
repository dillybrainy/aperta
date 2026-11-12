import { similarity } from "./phash";
import type { CameraMeta, LayerResult, PhashRecord } from "./types";

/** Thresholds (PLAN.md KTD9). Tune here only. */
export const THRESHOLDS = {
  rawMatch: 0.85, // RAW preview vs submitted JPEG: colour edits allowed, content changes not
  duplicate: 0.9, // same photo as an earlier APERTA entry
  aiReject: 0.7, // AI likelihood that rejects when metadata is also empty
  aiReview: 0.85, // AI likelihood that alone asks for review
  neighborMin: 0.5, // neighbour frames: similar scene...
  neighborMax: 0.97, // ...but not the exact same frame
  neighborGapMs: 120_000,
};

/** Layer 1: the RAW's embedded preview must show the same picture as the submitted JPEG. */
export function checkRaw(jpegHash: string, rawPreviewHash: string | null): LayerResult {
  if (!rawPreviewHash) {
    return { layer: "raw", severity: "reject", reason: "No RAW file, or its preview could not be read" };
  }
  const s = similarity(jpegHash, rawPreviewHash);
  const pct = Math.round(s * 100);
  if (s < THRESHOLDS.rawMatch) {
    return { layer: "raw", severity: "reject", reason: `RAW preview does not match the JPEG (${pct}% similar)`, value: s };
  }
  return { layer: "raw", severity: "ok", reason: `RAW preview matches the JPEG (${pct}%)`, value: s };
}

/** Layer 4: AI likelihood is one supporting signal, never the only reason to reject. */
export function checkAi(likelihood: number | null, metaEmpty: boolean): LayerResult {
  if (likelihood === null) {
    return { layer: "ai", severity: "ok", reason: "AI score unavailable" };
  }
  const pct = Math.round(likelihood * 100);
  if (likelihood >= THRESHOLDS.aiReject && metaEmpty) {
    return { layer: "ai", severity: "reject", reason: `Likely AI-generated (${pct}%)`, value: likelihood };
  }
  if (likelihood >= THRESHOLDS.aiReview) {
    return { layer: "ai", severity: "review", reason: `Likely AI-generated (${pct}%)`, value: likelihood };
  }
  return { layer: "ai", severity: "ok", reason: `Low AI likelihood (${pct}%)`, value: likelihood };
}

/** Layer 5: compare against every earlier APERTA entry. The earliest close match is the likely owner. */
export function checkDuplicate(
  phash: string,
  registry: PhashRecord[],
  self: { participant: string; submittedAtMs: number },
): LayerResult & { match?: PhashRecord } {
  const matches = registry
    .filter((r) => r.submitted_at_ms < self.submittedAtMs && r.participant !== self.participant)
    .map((r) => ({ r, s: similarity(phash, r.phash) }))
    .filter((m) => m.s >= THRESHOLDS.duplicate)
    .sort((a, b) => a.r.submitted_at_ms - b.r.submitted_at_ms);
  if (matches.length === 0) {
    return { layer: "duplicate", severity: "ok", reason: "No match with earlier entries" };
  }
  const { r, s } = matches[0];
  const when = new Date(r.submitted_at_ms).toISOString().slice(0, 16).replace("T", " ");
  return {
    layer: "duplicate",
    severity: "review",
    reason: `Possible stolen photo: ${Math.round(s * 100)}% match with ${ownerName(r.participant)}'s entry, registered ${when} UTC`,
    value: s,
    match: r,
  };
}

/** Layer 2 (P1): neighbour frames from the same session. */
export function checkNeighbors(
  main: { meta: CameraMeta; phash: string },
  neighbors: { meta: CameraMeta; phash: string }[],
): LayerResult {
  if (neighbors.length === 0) {
    return { layer: "neighbors", severity: "ok", reason: "No neighbor frames attached" };
  }
  for (const n of neighbors) {
    if (main.meta.model && n.meta.model && main.meta.model !== n.meta.model) {
      return { layer: "neighbors", severity: "review", reason: "Neighbor frames come from a different camera" };
    }
    if (main.meta.takenAt && n.meta.takenAt) {
      const gap = Math.abs(Date.parse(main.meta.takenAt) - Date.parse(n.meta.takenAt));
      if (gap > THRESHOLDS.neighborGapMs) {
        return { layer: "neighbors", severity: "review", reason: "Neighbor frames were taken too far apart" };
      }
    }
    const s = similarity(main.phash, n.phash);
    if (s < THRESHOLDS.neighborMin || s > THRESHOLDS.neighborMax) {
      return { layer: "neighbors", severity: "review", reason: "Neighbor frames do not look like the same session" };
    }
  }
  return { layer: "neighbors", severity: "ok", reason: `${neighbors.length} neighbor frame(s) match the same session` };
}

/** "alif.testnet" -> "Alif" for display. */
export function ownerName(account: string): string {
  const first = account.split(".")[0] ?? account;
  return first.charAt(0).toUpperCase() + first.slice(1);
}
