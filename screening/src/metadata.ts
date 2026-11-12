import exifr from "exifr";
import type { CameraMeta, LayerResult } from "./types";

/** Read camera metadata from a JPEG or a TIFF-based RAW (ARW, CR2, NEF, DNG). Works in browser and Node. */
export async function readMeta(bytes: Uint8Array | ArrayBuffer | Buffer): Promise<CameraMeta> {
  let t: Record<string, unknown> | undefined;
  try {
    t = await exifr.parse(bytes as ArrayBuffer, { tiff: true, exif: true, makerNote: false });
  } catch {
    t = undefined;
  }
  if (!t) return {};
  const date = (t.DateTimeOriginal ?? t.CreateDate) as Date | string | undefined;
  return clean({
    make: str(t.Make),
    model: str(t.Model),
    lens: str(t.LensModel),
    serial: str(t.BodySerialNumber ?? t.SerialNumber),
    takenAt: date instanceof Date ? date.toISOString() : str(date),
    iso: num(t.ISO),
    exposureTime: num(t.ExposureTime),
    fNumber: num(t.FNumber),
  });
}

export function isEmpty(m: CameraMeta): boolean {
  return !m.make && !m.model && !m.takenAt;
}

/** Layer 3: metadata must exist and agree between the JPEG and its RAW. */
export function checkMetadata(jpeg: CameraMeta, raw: CameraMeta | null): LayerResult {
  if (isEmpty(jpeg)) {
    return { layer: "metadata", severity: "review", reason: "Camera metadata in the JPEG is empty" };
  }
  if (raw && !isEmpty(raw)) {
    if (raw.model && jpeg.model && raw.model !== jpeg.model) {
      return {
        layer: "metadata",
        severity: "reject",
        reason: `Camera model differs: JPEG ${jpeg.model}, RAW ${raw.model}`,
      };
    }
    if (raw.takenAt && jpeg.takenAt) {
      const gap = Math.abs(Date.parse(raw.takenAt) - Date.parse(jpeg.takenAt));
      if (gap > 2000) {
        return { layer: "metadata", severity: "reject", reason: "Capture time differs between the JPEG and the RAW" };
      }
    }
  }
  return {
    layer: "metadata",
    severity: "ok",
    reason: `Metadata consistent (${[jpeg.make, jpeg.model].filter(Boolean).join(" ")})`,
  };
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}
function num(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}
function clean<T extends object>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;
}
