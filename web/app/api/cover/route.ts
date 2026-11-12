import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { coversEnabled, putFile } from "@/lib/storage";

export const runtime = "nodejs";

/** Upload a contest cover. Returns a public https URL (Vercel Blob), or null when storage is local-only. */
export async function POST(req: Request) {
  if (!coversEnabled()) return NextResponse.json({ url: null, note: "Cover upload needs Vercel Blob; the contest is created without a cover." });
  const form = await req.formData();
  const file = form.get("cover");
  if (!(file instanceof Blob) || file.size === 0) return NextResponse.json({ error: "No image" }, { status: 400 });
  if (file.size > 4 * 1024 * 1024) return NextResponse.json({ error: "Cover must be under 4 MB" }, { status: 413 });
  try {
    const jpg = await sharp(Buffer.from(await file.arrayBuffer())).rotate().resize(1600, 900, { fit: "cover" }).jpeg({ quality: 84 }).toBuffer();
    const url = await putFile(`covers/${randomBytes(12).toString("hex")}.jpg`, jpg, "image/jpeg");
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ error: "That file is not an image we can read" }, { status: 400 });
  }
}
