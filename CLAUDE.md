# CLAUDE.md — aturan untuk setiap sesi Claude Code di repo APERTA

Kamu membantu Dilly, mahasiswa yang baru pertama kali membangun web sendirian untuk NEAR HACKATHON.
Jelaskan dengan bahasa Indonesia yang sederhana dan singkat (maksimal 5 baris kecuali diminta lebih).
Waktunya sangat sempit: deadline Sabtu 14 Nov 2026 23:59 UTC, target submit Sabtu 22.00 WIB.

## 1. Sebelum menulis kode

1. Baca `PLAN.md` sampai selesai. Itu satu-satunya sumber kebenaran.
2. Baca `docs/progress.md` untuk tahu sampai mana pekerjaannya.
3. Jalankan `git pull --rebase`.
4. Sebutkan unit (U1–U6) dan prioritas (P0/P1/P2) yang akan dikerjakan, lalu mulai.

## 2. Urutan wajib

- Kerjakan semua **P0** sampai online di Vercel sebelum menyentuh P1. P2 hanya kalau P1 selesai.
- Kalau Dilly meminta fitur P1/P2 padahal P0 belum online, ingatkan sekali, lalu ikuti keputusannya.
- Kalau sudah lewat Sabtu 15.00 WIB, ingatkan Dilly bahwa itu waktunya video FULLBACK.

## 3. Hal yang terkunci

- Cerita demo di `PLAN.md` R1–R3: "Lomba Foto Senja Jogja 2026", pembagian 50/30/20, lima karya (3 asli, 1 AI, 1 curian dari Alif), dan lomba "Merapi 2026" milik Alif.
- Fitur di luar lingkup (lihat Scope Boundaries). Jangan menambah fitur yang tidak ada di PLAN.md.
- Kata "100% anti-curang" tidak boleh dipakai di UI maupun README.

## 4. Tidak boleh sama sekali

- Memakai mainnet atau uang asli.
- Menulis kunci privat, seed phrase, atau API key ke file selain `.env`. Jangan pernah commit `.env`.
- Mengunggah file RAW utuh ke server. ARW tetap WAJIB dibaca, tapi di browser (PLAN.md KTD6). Pemeriksaan RAW adalah fitur inti: jangan dihapus, dilewati, atau dipalsukan.
- `git push --force`, `git reset --hard`, atau menghapus riwayat git.
- Membuat repo publik, posting di X, atau mengisi form hackathon. Itu tugas Dilly.
- Menyalin kode dari repo FULLBACK. Semua kode APERTA harus ditulis baru.

## 5. Cara kerja

- Kontrak dan penyaringan: tulis tes skenario dari PLAN.md dulu, baru kodenya.
- Commit kecil setelah satu bagian jalan, lalu push.
- Setiap transaksi yang ditampilkan wajib punya link `https://testnet.nearblocks.io/txns/<hash>`.
- Skill yang dipakai: near-smart-contracts, near-contract-audit, near-cli-rs, near-ai-cloud, near-dapp, near-api-js atau near-kit, frontend-design, ce-test-browser.
- Kalau ragu soal keputusan produk, berhenti dan tanya Dilly. Jangan menebak.

## 6. Sebelum sesi berakhir

1. Perbarui `docs/progress.md`: apa yang selesai, apa yang macet, langkah berikutnya.
2. Commit dan push.
3. Sampaikan ke Dilly dalam 3 kalimat: apa yang selesai, langkah berikutnya, dan berapa P0 yang tersisa.

## 7. Perintah penting

- Tes kontrak: `cd contract && cargo test`
- Tes penyaringan: `npm test -w web`
- Build web: `npm run build -w web`
- Jalankan lokal: `npm run dev`
- Putar cerita penuh di testnet: `npm run demo`
