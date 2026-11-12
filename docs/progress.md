# Progress APERTA

## Kamis 12 Nov — dikerjakan Claude di chat (sebelum repo ada di laptop)

**Arah berubah (disetujui Dilly):** APERTA sekarang **platform lomba foto umum** (siapa pun bisa buat lomba, kirim karya, menilai), bukan hanya halaman demo. Semua teks web **bahasa Inggris**. Desain acuan: Claude Design "APERTA — Desain Web" (https://claude.ai/artifact/XybtCNkXsFFGKZ3Pxk5CbY). Logo baru: 6 bilah diafragma + bukaan lime.

Selesai:
- **Kontrak** (`contract/`): ditambah `description`, `closes_at_ms`, `cover_url` di lomba, `title` di karya, batas waktu ditegakkan di `submit_entry`, view `list_contests`. `cargo test`: **29 tes lulus**.
- **Penyaringan** (`screening/`): alasan sekarang bahasa Inggris. `npm test -w screening`: **16 tes lulus**.
- **Web** (`web/`, Next.js 16): `/`, `/contests`, `/contest/[id]`, `/contest/[id]/submit`, `/contest/[id]/jury`, `/contest/[id]/results`, `/host`, `/demo`; API `prepare`, `screen`, `media`, `cover`, `rogue-agent`, `demo/[step]`. Login dompet (near-connect). Foto disimpan di Vercel Blob (lokal: `web/.data/`), foto penuh baru bisa dibuka setelah penjurian.
- `npm run build -w web` **lulus**. Mode simulasi (`npm run sim`) diuji ujung ke ujung: 3 karya lolos, foto AI ditolak, foto curian ditandai **97% mirip karya Alif**, juara dibayar 50/30/20, agen curang ditolak.
- **Skrip** (`scripts/`): `setup-accounts.mjs` (akun faucet + sub-akun + kunci agen terbatas, tulis `web/.env.local`), `deploy.mjs`, `setup-merapi.mjs`. Belum dites ke testnet (RPC diblokir di sandbox).
- **Dokumen**: README (Inggris), `docs/bukti-masalah.md`, `docs/pembeda.md`, `docs/libraries.md`, `web/demo/README.md`.

### Tambahan: pintu masuk penyelenggara (disetujui Dilly)
- Menu atas: Contests · How it works · For organizers · (My contests setelah login) · tombol **Host a contest** · Connect wallet.
- Halaman awal ditujukan ke penyelenggara ("Run a photo contest. Let APERTA check every entry."), lalu daftar lomba yang buka untuk peserta.
- Halaman baru `/organizers` (cara kerja + FAQ) dan `/dashboard` "My contests" (lomba yang dibuat/dinilai, tombol Start judging / Close and pay, salin link lomba & link juri). API `/api/my-contests`.
- Setelah membuat lomba, halaman lomba menampilkan kotak "Your contest is live" berisi link peserta dan link juri.
- Desain Claude Design diperbarui: 11 artboard (baru: For organizers, My contests).

## Belum (urutan untuk laptop)
1. Pasang Rust + `cargo-near` + `near-cli-rs`. `npm install`, lalu `npm test`.
2. **Tes ARW asli** Sony A7 IV di halaman submit (mode simulasi cukup): preview RAW harus terbaca dan "RAW preview matches the JPEG" muncul. Ini WAJIB pertama.
3. `node scripts/setup-accounts.mjs <nama>` → `node scripts/deploy.mjs`.
4. `npm run dev`, coba alur penuh dengan dompet testnet. Lalu `node scripts/setup-merapi.mjs http://localhost:3000` (Kamis malam).
5. Ganti foto contoh dengan foto asli (lihat `web/demo/README.md`).
6. Vercel: root `web/`, isi env dari `web/.env.local` + `BLOB_READ_WRITE_TOKEN` + `MEDIA_SECRET`. Jalankan `setup-merapi.mjs` ke URL Vercel kalau belum.
7. NEAR AI Cloud: isi `NEARAI_API_KEY` dan `NEARAI_MODEL` (model vision).
8. P1 kalau sempat: unggah frame tetangga di form submit, tombol banding untuk peserta.
9. README: isi URL Vercel, link video, nama kontrak. Post X, repo publik, submit (tugas Dilly).
