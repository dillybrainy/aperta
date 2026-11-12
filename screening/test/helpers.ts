import sharp from "sharp";

/** Synthetic "photos": different scenes rendered from SVG so tests run without real files. */
export function sceneSvg(kind: "senja" | "merapi" | "ai", w = 1200, h = 800): Buffer {
  const scenes = {
    senja: `<rect width="100%" height="100%" fill="url(#g)"/>
      <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6a04d"/><stop offset="1" stop-color="#3b1d5a"/></linearGradient></defs>
      <circle cx="${w * 0.7}" cy="${h * 0.45}" r="${h * 0.12}" fill="#ffd27a"/>
      <polygon points="0,${h} ${w * 0.3},${h * 0.55} ${w * 0.55},${h} " fill="#1b1030"/>
      <rect x="${w * 0.1}" y="${h * 0.75}" width="${w * 0.8}" height="${h * 0.05}" fill="#2a1840"/>
      <rect x="${w * 0.2}" y="${h * 0.6}" width="${w * 0.05}" height="${h * 0.25}" fill="#120a20"/>`,
    merapi: `<rect width="100%" height="100%" fill="#bcd7ee"/>
      <polygon points="${w * 0.1},${h} ${w * 0.5},${h * 0.2} ${w * 0.9},${h}" fill="#6b5b4b"/>
      <polygon points="${w * 0.42},${h * 0.32} ${w * 0.5},${h * 0.2} ${w * 0.58},${h * 0.32}" fill="#f2f2f2"/>
      <rect y="${h * 0.85}" width="${w}" height="${h * 0.15}" fill="#3d6b35"/>
      <circle cx="${w * 0.2}" cy="${h * 0.2}" r="${h * 0.08}" fill="#ffffff"/>`,
    ai: `<rect width="100%" height="100%" fill="#101820"/>
      <circle cx="${w * 0.3}" cy="${h * 0.6}" r="${h * 0.3}" fill="#e83e8c"/>
      <rect x="${w * 0.55}" y="${h * 0.1}" width="${w * 0.35}" height="${h * 0.7}" fill="#20c997"/>
      <polygon points="${w * 0.1},${h * 0.1} ${w * 0.4},${h * 0.05} ${w * 0.2},${h * 0.35}" fill="#ffc107"/>`,
  };
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${scenes[kind]}</svg>`);
}

export async function jpeg(
  kind: "senja" | "merapi" | "ai",
  opts: { quality?: number; width?: number; exif?: boolean; takenAt?: string; model?: string } = {},
): Promise<Buffer> {
  let img = sharp(sceneSvg(kind));
  if (opts.width) img = img.resize(opts.width);
  if (opts.exif) {
    img = img.withExif({
      IFD0: { Make: "SONY", Model: opts.model ?? "ILCE-7M4" },
      IFD2: { DateTimeOriginal: opts.takenAt ?? "2026:11:10 17:45:12" },
    });
  }
  return img.jpeg({ quality: opts.quality ?? 90 }).toBuffer();
}

/** A fake TIFF-based RAW: header + small thumbnail + large preview + filler bytes. */
export async function fakeRaw(kind: "senja" | "merapi" | "ai"): Promise<Buffer> {
  const header = Buffer.from([0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00]);
  const thumb = await jpeg(kind, { width: 160, quality: 70 });
  const preview = await jpeg(kind, { width: 1600, quality: 95 });
  const filler = Buffer.alloc(4096, 0x5a);
  return Buffer.concat([header, filler, thumb, filler, preview, filler]);
}
