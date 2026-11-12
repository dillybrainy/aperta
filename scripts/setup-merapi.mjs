#!/usr/bin/env node
// Register Alif's original Merapi photo in an earlier contest, so the stolen copy in the demo
// has an owner to point to (PLAN.md U3). Run this Thursday night, two days before the demo.
//
//   node scripts/setup-merapi.mjs <web url>     e.g. http://localhost:3000 or https://aperta.vercel.app
//
// Uses the same path as a real participant: upload to /api/entries/prepare, sign submit_entry
// with Alif's key, then /api/screen records the verdict with the restricted agent key.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { Account, JsonRpcProvider, actions } from "near-api-js";
import { loadEnv } from "./env.mjs";

const web = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const env = loadEnv();
const DEMO = path.join(import.meta.dirname, "..", "web", "demo");
// Use the real photo if you added one (see web/demo/README.md), else the placeholder.
const pick = (real, ph) => {
  try {
    readFileSync(path.join(DEMO, real));
    return real;
  } catch {
    return ph;
  }
};
const jpegPath = pick("real/alif-merapi.jpg", "placeholder/alif-merapi.jpg");
const previewPath = pick("real/alif-merapi.preview.jpg", "placeholder/alif-merapi.preview.jpg");
const jpeg = readFileSync(path.join(DEMO, jpegPath));
const preview = readFileSync(path.join(DEMO, previewPath));
const sha256 = createHash("sha256").update(jpeg).digest("hex");
const meta = { make: "SONY", model: "ILCE-7M4", lens: "FE 70-200mm F4 G OSS II", takenAt: "2026-11-07T23:05:00.000Z", fNumber: 8, exposureTime: 1 / 500, iso: 100 };

const provider = new JsonRpcProvider({ url: env.NEXT_PUBLIC_RPC_URL || "https://test.rpc.fastnear.com" });
const contract = env.NEXT_PUBLIC_CONTRACT_ID;
const TGAS = 10n ** 12n;
const outcome = (res) => JSON.parse(Buffer.from(res.status.SuccessValue, "base64").toString());

console.log(`1/4 Creating "Merapi Photo Contest 2026" as ${env.ORGANIZER_ACCOUNT_ID}…`);
const org = new Account(env.ORGANIZER_ACCOUNT_ID, provider, env.ORGANIZER_PRIVATE_KEY);
const c = await org.signAndSendTransaction({
  receiverId: contract,
  actions: [
    actions.functionCall(
      "create_contest",
      { title: "Merapi Photo Contest 2026", description: "Mount Merapi at first light.", jurors: [env.JUROR1_ACCOUNT_ID], closes_at_ms: Date.now() + 2 * 86_400_000 },
      30n * TGAS,
      10n ** 24n,
    ),
  ],
});
const contestId = outcome(c);
console.log(`   ✓ contest #${contestId}  https://testnet.nearblocks.io/txns/${c.transaction.hash}`);

console.log(`2/4 Uploading Alif's photo (${jpegPath}) to ${web}…`);
const fd = new FormData();
fd.append("contestId", String(contestId));
fd.append("sha256", sha256);
fd.append("jpeg", new Blob([jpeg], { type: "image/jpeg" }), "photo.jpg");
fd.append("rawPreview", new Blob([preview], { type: "image/jpeg" }), "raw-preview.jpg");
fd.append("jpegMeta", JSON.stringify(meta));
fd.append("rawMeta", JSON.stringify(meta));
const up = await fetch(`${web}/api/entries/prepare`, { method: "POST", body: fd });
if (!up.ok) throw new Error(`prepare failed: ${await up.text()}`);

console.log(`3/4 Signing submit_entry as ${env.ALIF_ACCOUNT_ID}…`);
const alif = new Account(env.ALIF_ACCOUNT_ID, provider, env.ALIF_PRIVATE_KEY);
const s = await alif.signAndSendTransaction({
  receiverId: contract,
  actions: [actions.functionCall("submit_entry", { contest_id: contestId, sha256, title: "Merapi Morning" }, 30n * TGAS, 0n)],
});
const entryId = outcome(s);
console.log(`   ✓ entry #${entryId}  https://testnet.nearblocks.io/txns/${s.transaction.hash}`);

console.log("4/4 Screening with the agent key…");
const sc = await fetch(`${web}/api/screen`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entryId }) });
const result = await sc.json();
if (!sc.ok) throw new Error(`screen failed: ${result.error}`);
console.log(`   ✓ ${result.verdict}  https://testnet.nearblocks.io/txns/${result.txHash}`);
console.log("\nAlif's original is now in the fingerprint registry. Any later copy will point to Alif.");
