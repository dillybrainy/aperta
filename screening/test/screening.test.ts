import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  checkDuplicate,
  checkNeighbors,
  dhash,
  extractLargestJpeg,
  parseLikelihood,
  readMeta,
  screenEntry,
  similarity,
  type PhashRecord,
} from "../src/index";
import { fakeRaw, jpeg } from "./helpers";

const DAY = 24 * 3600 * 1000;
const NOW = Date.parse("2026-11-14T09:00:00Z");

describe("Lapis 1 - RAW preview extraction", () => {
  it("finds the largest embedded JPEG, not the thumbnail", async () => {
    const raw = await fakeRaw("senja");
    const preview = extractLargestJpeg(raw)!;
    expect(preview).not.toBeNull();
    const meta = await sharp(Buffer.from(preview)).metadata();
    expect(meta.width).toBe(1600);
  });

  it("returns null for bytes without a JPEG", () => {
    expect(extractLargestJpeg(new Uint8Array(5000).fill(7))).toBeNull();
  });
});

describe("perceptual hash", () => {
  it("survives recompression, resizing and colour edits", async () => {
    const a = await dhash(await jpeg("senja", { quality: 95 }));
    const b = await dhash(await jpeg("senja", { quality: 40, width: 600 }));
    const graded = await dhash(
      await sharp(await jpeg("senja")).modulate({ brightness: 1.1, saturation: 1.3 }).jpeg().toBuffer(),
    );
    expect(similarity(a, b)).toBeGreaterThanOrEqual(0.9);
    expect(similarity(a, graded)).toBeGreaterThanOrEqual(0.9);
  });

  it("separates different scenes", async () => {
    const a = await dhash(await jpeg("senja"));
    const b = await dhash(await jpeg("merapi"));
    expect(similarity(a, b)).toBeLessThan(0.75);
  });

  it("produces 64 hex chars (fits the contract)", async () => {
    expect(await dhash(await jpeg("senja"))).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("Lapis 3 - metadata", () => {
  it("reads make, model and capture time written by the camera", async () => {
    const meta = await readMeta(await jpeg("senja", { exif: true }));
    expect(meta.make).toBe("SONY");
    expect(meta.model).toBe("ILCE-7M4");
    expect(meta.takenAt).toBeTruthy();
  });

  it("returns an empty object when there is no EXIF", async () => {
    expect(await readMeta(await jpeg("ai"))).toEqual({});
  });
});

async function genuine(kind: "senja" | "merapi", participant: string, registry: PhashRecord[] = [], at = NOW) {
  const j = await jpeg(kind, { exif: true });
  const raw = await fakeRaw(kind);
  return screenEntry({
    jpeg: j,
    rawPreview: extractLargestJpeg(raw),
    jpegMeta: await readMeta(j),
    rawMeta: await readMeta(j),
    aiLikelihood: 0.08,
    registry,
    participant,
    submittedAtMs: at,
  });
}

describe("decision (demo story R2-R3)", () => {
  it("genuine photo with matching RAW passes", async () => {
    const r = await genuine("senja", "peserta1.testnet");
    expect(r.verdict).toBe("Passed");
  });

  it("AE1: AI image without RAW and without metadata is rejected with several reasons", async () => {
    const j = await jpeg("ai");
    const r = await screenEntry({
      jpeg: j,
      rawPreview: null,
      jpegMeta: await readMeta(j),
      rawMeta: null,
      aiLikelihood: 0.93,
      registry: [],
      participant: "peserta4.testnet",
      submittedAtMs: NOW,
    });
    expect(r.verdict).toBe("Rejected");
    expect(r.reasons.join(" | ")).toMatch(/No RAW file/);
    expect(r.reasons.join(" | ")).toMatch(/Camera metadata in the JPEG is empty/);
    expect(r.reasons.join(" | ")).toMatch(/Likely AI-generated/);
  });

  it("RAW from a different photo is rejected", async () => {
    const j = await jpeg("senja", { exif: true });
    const otherRaw = await fakeRaw("merapi");
    const r = await screenEntry({
      jpeg: j,
      rawPreview: extractLargestJpeg(otherRaw),
      jpegMeta: await readMeta(j),
      rawMeta: await readMeta(j),
      aiLikelihood: 0.05,
      registry: [],
      participant: "x.testnet",
      submittedAtMs: NOW,
    });
    expect(r.verdict).toBe("Rejected");
    expect(r.reasons[0]).toMatch(/RAW preview does not match/);
  });

  it("AE2: a recompressed copy of Alif's earlier entry is flagged with Alif as owner", async () => {
    const alif = await genuine("merapi", "alif.aperta-demo.testnet", [], NOW - 2 * DAY);
    const registry: PhashRecord[] = [
      {
        entry_id: 0,
        contest_id: 0,
        participant: "alif.aperta-demo.testnet",
        phash: alif.phash,
        submitted_at_ms: NOW - 2 * DAY,
      },
    ];
    // The thief has the JPEG only: recompressed and resized, metadata copied.
    const copy = await jpeg("merapi", { quality: 60, width: 1000, exif: true });
    const r = await screenEntry({
      jpeg: copy,
      rawPreview: extractLargestJpeg(await fakeRaw("merapi")),
      jpegMeta: await readMeta(copy),
      rawMeta: await readMeta(copy),
      aiLikelihood: 0.1,
      registry,
      participant: "peserta5.testnet",
      submittedAtMs: NOW,
    });
    expect(r.verdict).toBe("NeedsReview");
    expect(r.reasons[0]).toMatch(/Possible stolen photo: \d+% match with Alif's entry/);
  });

  it("the original owner re-entering their own photo is not flagged as stolen", async () => {
    const reg: PhashRecord[] = [
      { entry_id: 0, contest_id: 0, participant: "alif.testnet", phash: (await genuine("merapi", "alif.testnet")).phash, submitted_at_ms: NOW - DAY },
    ];
    const r = checkDuplicate(reg[0].phash, reg, { participant: "alif.testnet", submittedAtMs: NOW });
    expect(r.severity).toBe("ok");
  });

  it("AI score alone never rejects a photo that has metadata", async () => {
    const j = await jpeg("senja", { exif: true });
    const r = await screenEntry({
      jpeg: j,
      rawPreview: extractLargestJpeg(await fakeRaw("senja")),
      jpegMeta: await readMeta(j),
      rawMeta: await readMeta(j),
      aiLikelihood: 0.9,
      registry: [],
      participant: "x.testnet",
      submittedAtMs: NOW,
    });
    expect(r.verdict).toBe("NeedsReview");
  });
});

describe("Lapis 2 (P1) - neighbour frames", () => {
  it("frames from another camera ask for review", async () => {
    const main = { meta: { model: "ILCE-7M4", takenAt: "2026-11-10T17:45:12Z" }, phash: await dhash(await jpeg("senja")) };
    const other = { meta: { model: "EOS R6", takenAt: "2026-11-10T17:45:20Z" }, phash: await dhash(await jpeg("senja", { width: 900 })) };
    expect(checkNeighbors(main, [other]).severity).toBe("review");
  });

  it("an identical frame does not count as a neighbour", async () => {
    const h = await dhash(await jpeg("senja"));
    const main = { meta: { model: "ILCE-7M4", takenAt: "2026-11-10T17:45:12Z" }, phash: h };
    expect(checkNeighbors(main, [{ meta: main.meta, phash: h }]).severity).toBe("review");
  });
});

describe("AI score parsing", () => {
  it("reads ai_likelihood from model JSON and clamps it", () => {
    expect(parseLikelihood('{"ai_likelihood": 0.82, "reason": "smooth"}')).toBe(0.82);
    expect(parseLikelihood('{"ai_likelihood": 7}')).toBe(1);
    expect(parseLikelihood("no json")).toBeNull();
  });
});
