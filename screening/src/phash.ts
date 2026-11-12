import sharp from "sharp";

/**
 * Perceptual "difference hash": grayscale, resize to 17x16, compare neighbouring pixels.
 * 256 bits -> 64 hex chars (fits the contract's phash limit). Robust to resizing,
 * recompression and moderate colour edits; changes a lot when the content changes.
 */
export async function dhash(image: Buffer | Uint8Array): Promise<string> {
  const W = 17;
  const H = 16;
  const { data } = await sharp(Buffer.from(image))
    .rotate()
    .grayscale()
    .resize(W, H, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });
  let bits = "";
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W - 1; x++) {
      bits += data[y * W + x] > data[y * W + x + 1] ? "1" : "0";
    }
  }
  let hex = "";
  for (let i = 0; i < bits.length; i += 4) hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  return hex;
}

/** Similarity 0..1 between two hashes of equal length (1 = identical). */
export function similarity(a: string, b: string): number {
  if (a.length !== b.length) return 0;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (x) {
      diff += x & 1;
      x >>= 1;
    }
  }
  return 1 - diff / (a.length * 4);
}
