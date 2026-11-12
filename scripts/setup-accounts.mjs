#!/usr/bin/env node
// Create every testnet account APERTA needs and write their keys to web/.env.local (never committed).
//
//   node scripts/setup-accounts.mjs <name>          e.g. node scripts/setup-accounts.mjs aperta-dilly
//
// 1. <name>.testnet is created by the testnet faucet (needs near-cli-rs: `near --version`).
//    It holds the contract.
// 2. Sub-accounts are created and funded from it in one transaction each:
//    panitia (organizer), juri1, juri2, budi, citra, dewi, eko, fajar (demo participants), alif.
// 3. agent.<name>.testnet gets ONLY a Function Call key limited to record_verdict on the contract.
//    It has no full-access key at all, so it can never move NEAR or close a contest (PLAN.md KTD4).
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Account, JsonRpcProvider, KeyPair, actions } from "near-api-js";

const name = process.argv[2];
if (!name || !/^[a-z0-9-]{2,40}$/.test(name)) {
  console.error("Usage: node scripts/setup-accounts.mjs <name>   (lowercase letters, digits, dashes)");
  process.exit(1);
}
const ROOT = path.join(import.meta.dirname, "..");
const ENV = path.join(ROOT, "web", ".env.local");
if (existsSync(ENV) && readFileSync(ENV, "utf8").includes("ORGANIZER_PRIVATE_KEY=ed25519")) {
  console.error("web/.env.local already has keys. Delete it first if you really want new accounts.");
  process.exit(1);
}

const RPC = "https://test.rpc.fastnear.com";
const NEAR = 10n ** 24n;
const near = (s) => BigInt(Math.round(Number(s) * 1000)) * (NEAR / 1000n);
const main = `${name}.testnet`;
const mainKey = KeyPair.fromRandom("ed25519");

console.log(`\n1/3 Creating ${main} with the testnet faucet…`);
const r = spawnSync(
  "near",
  ["account", "create-account", "sponsor-by-faucet-service", main, "use-manually-provided-public-key", mainKey.getPublicKey().toString(), "network-config", "testnet", "create"],
  { stdio: "inherit" },
);
if (r.status !== 0) {
  console.error("Faucet account creation failed. Is near-cli-rs installed, and is the name free?");
  process.exit(1);
}
await new Promise((res) => setTimeout(res, 3000));

const provider = new JsonRpcProvider({ url: RPC });
const mainAcc = new Account(main, provider, mainKey.toString());

const PEOPLE = [
  ["ORGANIZER", "panitia", "2.5"],
  ["JUROR1", "juri1", "0.3"],
  ["JUROR2", "juri2", "0.3"],
  ["P1", "budi", "0.3"],
  ["P2", "citra", "0.3"],
  ["P3", "dewi", "0.3"],
  ["P4", "eko", "0.3"],
  ["P5", "fajar", "0.3"],
  ["ALIF", "alif", "0.3"],
];
const keys = {};
console.log(`\n2/3 Creating ${PEOPLE.length} sub-accounts…`);
for (const [key, sub, amount] of PEOPLE) {
  const id = `${sub}.${main}`;
  const kp = KeyPair.fromRandom("ed25519");
  await mainAcc.signAndSendTransaction({
    receiverId: id,
    actions: [actions.createAccount(), actions.transfer(near(amount)), actions.addFullAccessKey(kp.getPublicKey())],
  });
  keys[key] = { id, sk: kp.toString() };
  console.log(`   ✓ ${id} (${amount} NEAR)`);
}

console.log("\n3/3 Creating the screening agent with a restricted key…");
const agentId = `agent.${main}`;
const agentKey = KeyPair.fromRandom("ed25519");
await mainAcc.signAndSendTransaction({
  receiverId: agentId,
  actions: [actions.createAccount(), actions.transfer(near("1")), actions.addFunctionCallAccessKey(agentKey.getPublicKey(), main, ["record_verdict"], near("1"))],
});
console.log(`   ✓ ${agentId}: Function Call key, receiver ${main}, methods [record_verdict], no full-access key`);

const p = ["P1", "P2", "P3", "P4", "P5"].map((k) => keys[k]);
const env = `# Written by scripts/setup-accounts.mjs on ${new Date().toISOString()}
# NEVER commit this file. Copy the same values into Vercel → Project → Settings → Environment Variables.
NEXT_PUBLIC_CONTRACT_ID=${main}
NEXT_PUBLIC_RPC_URL=${RPC}
# Deployer / contract account (full access; only scripts/deploy.mjs uses it)
CONTRACT_PRIVATE_KEY=${mainKey.toString()}
ORGANIZER_ACCOUNT_ID=${keys.ORGANIZER.id}
ORGANIZER_PRIVATE_KEY=${keys.ORGANIZER.sk}
JUROR1_ACCOUNT_ID=${keys.JUROR1.id}
JUROR1_PRIVATE_KEY=${keys.JUROR1.sk}
JUROR2_ACCOUNT_ID=${keys.JUROR2.id}
JUROR2_PRIVATE_KEY=${keys.JUROR2.sk}
PARTICIPANT_ACCOUNTS=${p.map((x) => x.id).join(",")}
PARTICIPANT_PRIVATE_KEYS=${p.map((x) => x.sk).join(",")}
ALIF_ACCOUNT_ID=${keys.ALIF.id}
ALIF_PRIVATE_KEY=${keys.ALIF.sk}
AGENT_ACCOUNT_ID=${agentId}
AGENT_PRIVATE_KEY=${agentKey.toString()}
# Fill these in yourself:
MEDIA_SECRET=${KeyPair.fromRandom("ed25519").toString().slice(8, 40)}
NEARAI_API_KEY=
NEARAI_MODEL=
BLOB_READ_WRITE_TOKEN=
`;
writeFileSync(ENV, env, { mode: 0o600 });
console.log(`\nDone. Keys written to web/.env.local (gitignored).\nNext: node scripts/deploy.mjs`);
