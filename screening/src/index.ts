import { dhash } from "./phash";
import { checkAi, checkDuplicate, checkNeighbors, checkRaw } from "./layers";
import { checkMetadata, isEmpty } from "./metadata";
import type { CameraMeta, LayerResult, PhashRecord, ScreeningResult, Severity, Verdict } from "./types";

export * from "./types";
export { extractLargestJpeg } from "./raw";
export { readMeta, checkMetadata, isEmpty } from "./metadata";
export { dhash, similarity } from "./phash";
export { aiLikelihood, parseLikelihood } from "./ai";
export { THRESHOLDS, checkRaw, checkAi, checkDuplicate, checkNeighbors, ownerName } from "./layers";

export interface ScreenInput {
  /** Submitted JPEG (may be downscaled by the browser). */
  jpeg: Buffer | Uint8Array;
  /** Preview extracted from the RAW in the browser, or null when no RAW was given. */
  rawPreview: Buffer | Uint8Array | null;
  jpegMeta: CameraMeta;
  rawMeta: CameraMeta | null;
  /** 0..1 from NEAR AI Cloud, or null when unavailable. */
  aiLikelihood: number | null;
  /** Result of the contract view `list_phashes`. */
  registry: PhashRecord[];
  participant: string;
  submittedAtMs: number;
  /** P1: neighbour frames from the same session. */
  neighbors?: { jpeg: Buffer | Uint8Array; meta: CameraMeta }[];
}

const RANK: Record<Severity, number> = { ok: 0, review: 1, reject: 2 };

/** Combine layer results: any reject -> Rejected, else any review -> NeedsReview, else Passed. */
export function decide(layers: LayerResult[]): { verdict: Verdict; reasons: string[] } {
  const worst = layers.reduce<Severity>((w, l) => (RANK[l.severity] > RANK[w] ? l.severity : w), "ok");
  const verdict: Verdict = worst === "reject" ? "Rejected" : worst === "review" ? "NeedsReview" : "Passed";
  const flagged = layers.filter((l) => l.severity !== "ok").map((l) => l.reason);
  return { verdict, reasons: flagged.length ? flagged : layers.map((l) => l.reason) };
}

export async function screenEntry(input: ScreenInput): Promise<ScreeningResult> {
  const phash = await dhash(input.jpeg);
  const rawHash = input.rawPreview ? await dhash(input.rawPreview) : null;
  const layers: LayerResult[] = [
    checkRaw(phash, rawHash),
    checkMetadata(input.jpegMeta, input.rawMeta),
    checkAi(input.aiLikelihood, isEmpty(input.jpegMeta)),
    checkDuplicate(phash, input.registry, { participant: input.participant, submittedAtMs: input.submittedAtMs }),
  ];
  if (input.neighbors && input.neighbors.length) {
    const neighbors = await Promise.all(input.neighbors.map(async (n) => ({ meta: n.meta, phash: await dhash(n.jpeg) })));
    layers.splice(1, 0, checkNeighbors({ meta: input.jpegMeta, phash }, neighbors));
  }
  const { verdict, reasons } = decide(layers);
  return {
    verdict,
    phash,
    reasons,
    layers: layers.map(({ layer, severity, reason, value }) => ({ layer, severity, reason, value })),
  };
}
