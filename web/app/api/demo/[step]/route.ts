import { NextResponse } from "next/server";
import { loadConfig } from "@/lib/config";
import { STEPS, runStep, type DemoState, type Step } from "@/lib/demo";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request, { params }: { params: Promise<{ step: string }> }) {
  const step = (await params).step as Step;
  if (!STEPS.includes(step)) return NextResponse.json({ error: "Unknown step" }, { status: 404 });
  const loaded = loadConfig();
  if ("missing" in loaded) {
    return NextResponse.json({ error: "The wallet-free demo is not configured on this server.", missing: loaded.missing }, { status: 503 });
  }
  const state = ((await req.json().catch(() => ({}))) as { state?: DemoState }).state ?? {};
  try {
    return NextResponse.json(await runStep(step, state, loaded.config));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message, state }, { status: 500 });
  }
}
