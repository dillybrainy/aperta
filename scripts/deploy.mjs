#!/usr/bin/env node
// Build the contract and deploy it to NEXT_PUBLIC_CONTRACT_ID with new(agent).
//
//   node scripts/deploy.mjs            build + deploy + init (first time)
//   node scripts/deploy.mjs --no-init  redeploy code only (state must still match!)
//
// Reads web/.env.local written by scripts/setup-accounts.mjs. Needs Rust + cargo-near.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { Account, JsonRpcProvider, actions } from "near-api-js";
import { loadEnv } from "./env.mjs";

const ROOT = path.join(import.meta.dirname, "..");
const env = loadEnv();
const init = !process.argv.includes("--no-init");

console.log("1/2 Building the contract (cargo near build)…");
const b = spawnSync("cargo", ["near", "build", "non-reproducible-wasm"], { cwd: path.join(ROOT, "contract"), stdio: "inherit" });
if (b.status !== 0) process.exit(1);
const wasm = readFileSync(path.join(ROOT, "contract", "target", "near", "aperta.wasm"));
console.log(`   wasm: ${(wasm.length / 1024).toFixed(0)} KB`);

console.log(`2/2 Deploying to ${env.NEXT_PUBLIC_CONTRACT_ID}${init ? " with new(agent)" : ""}…`);
const provider = new JsonRpcProvider({ url: env.NEXT_PUBLIC_RPC_URL || "https://test.rpc.fastnear.com" });
const acc = new Account(env.NEXT_PUBLIC_CONTRACT_ID, provider, env.CONTRACT_PRIVATE_KEY);
const acts = [actions.deployContract(wasm)];
if (init) acts.push(actions.functionCall("new", { agent: env.AGENT_ACCOUNT_ID }, 30n * 10n ** 12n, 0n));
const res = await acc.signAndSendTransaction({ receiverId: env.NEXT_PUBLIC_CONTRACT_ID, actions: acts });
const hash = res?.transaction?.hash;
console.log(`   ✓ deployed. https://testnet.nearblocks.io/txns/${hash}`);
const agent = await provider.callFunction({ contractId: env.NEXT_PUBLIC_CONTRACT_ID, method: "get_agent", args: {} });
console.log(`   agent on-chain: ${agent}`);
console.log("\nNext: npm run dev, then node scripts/setup-merapi.mjs http://localhost:3000");
