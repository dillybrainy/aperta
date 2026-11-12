import { NextResponse } from "next/server";
import type { CameraMeta } from "@aperta/screening";
import { prepareEntry } from "@/lib/entry-files";
import { contractConfigured, getContest } from "@/lib/view";

export const runtime = "nodejs";

const MAX_BYTES = 4 * 1024 * 1024;

function parseMeta(v: FormDataEntryValue | null): CameraMeta | null {
  if (typeof v !== "string" || !v) return null;
  try {
    const m = JSON.parse(v) as Record<string, unknown>;
    const s = (k: string) => (typeof m[k] === "string" ? String(m[k]).slice(0, 80) : undefined);
    const n = (k: string) => (typeof m[k] === "number" && Number.isFinite(m[k]) ? (m[k] as number) : undefined);
    return { make: s("make"), model: s("model"), lens: s("lens"), serial: s("serial"), takenAt: s("takenAt"), iso: n("iso"), exposureTime: n("exposureTime"), fNumber: n("fNumber") };
  } catch {
    return null;
  }
}

/**
 * Step 1 of a submission, before the wallet signs submit_entry: store the 1600 px JPEG copy,
 * the RAW preview and the metadata, keyed by the SHA-256 the participant is about to record.
 */
export async function POST(req: Request) {
  if (!contractConfigured()) return NextResponse.json({ error: "The contract is not configured" }, { status: 503 });
  const form = await req.formData();
  const contestId = Number(form.get("contestId"));
  const sha256 = String(form.get("sha256") ?? "").toLowerCase();
  const jpeg = form.get("jpeg");
  const rawPreview = form.get("rawPreview");
  if (!Number.isInteger(contestId) || contestId < 0) return bad("Bad contest id");
  if (!/^[0-9a-f]{64}$/.test(sha256)) return bad("Bad SHA-256");
  if (!(jpeg instanceof Blob) || jpeg.size === 0) return bad("Missing photo");
  if (jpeg.size > MAX_BYTES || (rawPreview instanceof Blob && rawPreview.size > MAX_BYTES)) return bad("Upload too large", 413);

  const contest = await getContest(contestId).catch(() => null);
  if (!contest) return bad("Contest not found", 404);
  if (contest.phase !== "Open") return bad("This contest is not accepting entries", 409);
  if (contest.closes_at_ms != null && Date.now() > contest.closes_at_ms) return bad("Entries for this contest are closed", 409);

  try {
    await prepareEntry({
      contestId,
      sha256,
      jpeg: Buffer.from(await jpeg.arrayBuffer()),
      rawPreview: rawPreview instanceof Blob && rawPreview.size > 0 ? Buffer.from(await rawPreview.arrayBuffer()) : null,
      jpegMeta: parseMeta(form.get("jpegMeta")) ?? {},
      rawMeta: parseMeta(form.get("rawMeta")),
    });
  } catch (e) {
    const msg = (e as Error).message;
    // Already prepared (for example a retry after the wallet was closed): the files are there, carry on.
    if (msg.includes("already exists") || msg.toLowerCase().includes("already")) return NextResponse.json({ ok: true, existing: true });
    return bad("Could not read that photo. Is it a JPEG?", 400);
  }
  return NextResponse.json({ ok: true });
}

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}
