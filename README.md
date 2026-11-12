# APERTA

**Photo contests where every entry is proven, not trusted.**

Anyone can host a photo contest on APERTA. The prize is locked in a NEAR smart contract the moment the contest opens. Every entry is fingerprinted on-chain, then a screening agent checks it (the camera RAW file, metadata, an AI score and a fingerprint match against every earlier entry; neighbor frames are next) and records its verdict on NEAR with a key that can do nothing else. Jurors score the entries that passed, and one transaction pays the top three.

Built at NEAR HACKATHON "Build Beyond Boundaries" (November 2026). Testnet only, MIT license.

- **Live app:** `TODO: Vercel URL`
- **Demo video:** `TODO: link`
- **Contract:** `TODO.testnet` on [NearBlocks testnet](https://testnet.nearblocks.io)

## Try it in 2 minutes

**With a NEAR testnet wallet** (MyNearWallet, Meteor, HOT, …):

1. Open the app and **Connect wallet**.
2. **Host a contest** (top-right button): give it a title, add your own account as a juror, lock 0.1 NEAR. → You land on the contest page with its share link and jury link; the prize shows as locked. Your contests are under **My contests**.
3. **Submit your photo** with a JPEG and its RAW file (.ARW, .CR3, .NEF, .DNG). → The RAW is read in your browser; you see the camera, the fingerprint and whether the RAW preview matches. After you sign, the agent records **Passed / Needs review / Rejected** with a reason per check.
4. Submit a JPEG **without** its RAW, or a screenshot of someone else's entry. → **Rejected**, with the reasons on-chain. A copy of an earlier APERTA entry names the earliest owner.
5. As organizer: **Close entries and start judging** → photos un-blur. Open the **jury panel**, score, then **Close the contest and pay winners** → the results page shows who got what, paid in one transaction.
6. On any open contest, press **Try a rogue agent** → the agent's key tries to close the contest and move NEAR; the chain refuses both.

**Without a wallet:** open [`/demo`](./web/app/demo/page.tsx). The server plays organizer, five participants, two jurors and the agent with demo testnet accounts and runs the whole story: 3 genuine entries pass, an AI image is rejected, a stolen copy of Alif's earlier photo is flagged with Alif as the owner, winners are paid, and the rogue agent is refused.

## How it works

```
Browser ──reads RAW locally──▶ 1600px JPEG + RAW preview + metadata + SHA-256 ──▶ /api/entries/prepare
   │
   └─wallet signs submit_entry(sha256) ──▶ APERTA contract (time-stamped proof of possession)
                                              ▲
/api/screen ── 5 checks + NEAR AI Cloud ──────┘ record_verdict  (agent key: Function Call, record_verdict only)
Jurors ── submit_score ──▶ contract ── finalize ──▶ 50/30/20 transfers in one call
```

| Check | What it compares | Fails when |
|---|---|---|
| RAW vs JPEG | perceptual hash of the RAW's embedded preview vs the JPEG | no RAW, or < 85% similar |
| Neighbor frames (next step) | shots before/after: same camera, within 2 min, similar scene | different camera or session. Implemented and tested in `screening/`, not yet in the submit form |
| Metadata | camera, lens, capture time in JPEG and RAW | empty, or they disagree |
| AI score | likelihood from a vision model on NEAR AI Cloud | **never alone**: rejects only with empty metadata, else "Needs review" |
| Fingerprint | dHash vs every earlier APERTA entry (`list_phashes`) | ≥ 90% match with someone else's earlier entry → names the earliest owner |

## NEAR tools used

- **Rust smart contract** with `near-sdk` 5 ([`contract/`](contract/), 29 unit tests): locked native-NEAR prize, phases, verdicts, scores, automatic payout, review and appeal.
- **Function Call access key**: the screening agent account has *only* a key limited to `record_verdict` on the contract ([`scripts/setup-accounts.mjs`](scripts/setup-accounts.mjs)).
- **NEAR AI Cloud** (OpenAI-compatible API) for the AI-likelihood signal ([`screening/src/ai.ts`](screening/src/ai.ts)).
- **NEP-297 events** (`standard: "aperta"`) plus a `get_events` view for the on-chain history.
- **near-api-js** v7 (server and scripts), **@hot-labs/near-connect** + **near-connect-hooks** (wallet login).
- **NearBlocks testnet** links on every transaction.
- **near-cli-rs** (faucet account) and **cargo-near** (build).

## Run it yourself

Requirements: Node 22, Rust + `cargo-near`, `near-cli-rs`.

```bash
npm install
npm test -w screening && (cd contract && cargo test)

node scripts/setup-accounts.mjs <your-name>    # faucet account + sub-accounts + restricted agent key → web/.env.local
node scripts/deploy.mjs                        # build and deploy the contract, init with the agent
npm run dev                                    # http://localhost:3000
node scripts/setup-merapi.mjs http://localhost:3000   # register Alif's earlier photo (for the stolen-photo demo)
```

No blockchain at hand? `DEMO_SIMULATE=true npm run dev -w web` runs the same pages against an in-memory copy of the contract, with a banner saying so.

Deploying to Vercel: import the repo with root `web/`, add every variable from `web/.env.local` plus `BLOB_READ_WRITE_TOKEN` (Vercel Blob) and `MEDIA_SECRET`.

## Honest limits

- **Much harder to cheat, not impossible.** Someone who owns a camera can still photograph a print or a screen; the neighbor-frame check makes that harder, not impossible.
- **Camera photos only.** The RAW check needs a raw file, so phone photos without RAW cannot enter yet.
- **AI scores are unreliable**, so APERTA never rejects on the score alone. Published tests keep finding false positives on real photographs ([Bellingcat](https://bellingcat.com/resources/2023/09/11/testing-ai-or-not-how-well-does-an-ai-image-detector-do-its-job)).
- **The screening runs on our server.** The verdict and its reasons are on-chain and the agent cannot touch money, but you trust the server to run the published code. TEE attestation via NEAR AI Cloud is the next step.
- **Privacy:** the full-size JPEG and the RAW never leave the participant's device. A 1600 px copy and the RAW preview are stored (Vercel Blob, under an HMAC'd path) and only shown once judging opens. Only hashes, verdicts, scores and payouts go on-chain.
- Testnet NEAR only. Demo people and contests are fictional; placeholder images are illustrations until replaced with real photos.

## Repository

| Folder | What |
|---|---|
| [`contract/`](contract/) | Rust contract + tests, [`INTERFACE.md`](contract/INTERFACE.md) |
| [`screening/`](screening/) | The five checks as a TypeScript package, with tests |
| [`web/`](web/) | Next.js app: home, contests, contest page, host, my contests, submit, jury, results, for organizers, `/demo` |
| [`scripts/`](scripts/) | Account setup, deploy, Merapi seed |
| [`docs/`](docs/) | Problem evidence, how APERTA differs, libraries |

See [`docs/libraries.md`](docs/libraries.md) for third-party libraries.
