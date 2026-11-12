/**
 * Find the largest embedded JPEG inside a camera RAW file (ARW, CR2, NEF, DNG...).
 * TIFF-based RAW formats store one or more JPEG previews that the camera wrote at capture time.
 * Runs in the browser and in Node: it only needs the file bytes.
 */
export function extractLargestJpeg(bytes: Uint8Array): Uint8Array | null {
  let best: { start: number; end: number } | null = null;
  for (let i = 0; i < bytes.length - 3; i++) {
    if (bytes[i] === 0xff && bytes[i + 1] === 0xd8 && bytes[i + 2] === 0xff) {
      const end = jpegEnd(bytes, i);
      if (end > 0) {
        if (!best || end - i > best.end - best.start) best = { start: i, end };
        i = end - 1; // skip past this JPEG (and any thumbnail nested inside it)
      }
    }
  }
  return best ? bytes.slice(best.start, best.end) : null;
}

/** Walk JPEG segments from SOI; return the index just after EOI, or -1 if malformed. */
function jpegEnd(b: Uint8Array, start: number): number {
  let p = start + 2;
  while (p + 4 <= b.length) {
    if (b[p] !== 0xff) return -1;
    let marker = b[p + 1];
    while (marker === 0xff && p + 2 < b.length) {
      p++;
      marker = b[p + 1];
    }
    if (marker === 0xd9) return p + 2; // EOI without scan
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      p += 2;
      continue;
    }
    const len = (b[p + 2] << 8) | b[p + 3];
    if (len < 2) return -1;
    if (marker === 0xda) {
      // Start of scan: entropy-coded data follows until a marker that is not RSTn or a stuffed 0x00.
      let q = p + 2 + len;
      while (q + 1 < b.length) {
        if (b[q] === 0xff) {
          const m = b[q + 1];
          if (m === 0x00 || (m >= 0xd0 && m <= 0xd7) || m === 0xff) {
            q += m === 0xff ? 1 : 2;
            continue;
          }
          if (m === 0xd9) return q + 2;
          // Another segment (progressive JPEG): continue the segment walk from here.
          p = q;
          break;
        }
        q++;
      }
      if (q + 1 >= b.length) return -1;
      continue;
    }
    p += 2 + len;
  }
  return -1;
}
