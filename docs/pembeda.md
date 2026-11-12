# How APERTA differs

| Approach | What it does | Gap APERTA fills |
|---|---|---|
| **Asking finalists for RAW files by email** (common contest rule) | Organizer manually checks RAWs of a few finalists | Happens late, only for finalists, invisible to everyone else, no record. APERTA checks every entry at submission and records the reasons on-chain. |
| **AI-image detectors** | One classifier score | Unreliable both ways (see `bukti-masalah.md`). APERTA uses the score as one weak signal among five, never alone. |
| **Content Credentials (C2PA)** | Cameras sign provenance metadata | Needs a C2PA camera and survives few edits; most photographers' cameras do not sign yet. APERTA works with any camera that writes RAW today; C2PA is a planned extra signal. |
| **Timestamping a hash on a blockchain** | Proves a file existed at a time | Only exact files; a crop or recompression changes the hash. APERTA adds a perceptual fingerprint registry across all contests, so near-copies point to the earliest owner. |
| **Contest platforms with escrow** | Hold the prize | Do not check authenticity. APERTA ties both together: the money moves only through the contract, and the screening agent's key cannot touch it. |

What is new in APERTA is the combination: in-browser RAW verification (the RAW never leaves the device), a cross-contest fingerprint registry on NEAR, a restricted-key agent whose verdicts are public, and automatic payout.
