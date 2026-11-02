# Rupa — frontend

Marketplace upcycle antarpengguna (C2C) untuk pasar Indonesia. Repo ini berisi **frontend saja**: aplikasi Next.js yang meniru prototipe di `rupa-ui-kit/prototype/index.html` dan siap disambungkan ke backend (Supabase + Groq + payment gateway) di tahap berikutnya.

Semua produk, penjual, ulasan, transaksi, AI, dan pembayaran di sini adalah **data contoh / simulasi**.

## Menjalankan

Butuh Node.js 20+ (diuji dengan Node 22).

```bash
npm install
npm run dev
```

Buka http://localhost:3000.

| Perintah | Fungsi |
|---|---|
| `npm run dev` | server pengembangan |
| `npm run build` lalu `npm run start` | build produksi |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | cek tipe |
| `npm run test:unit` | uji unit AI Assistant (tanpa browser, tanpa server, tanpa Groq) |
| `npm test` | uji unit + uji endpoint `POST /api/assistant` (menyalakan `next dev` di port 3200, atau pakai `BASE_URL=http://localhost:<port>` kalau dev server sudah jalan) |
| `node qa/screenshots.mjs http://localhost:3100` | screenshot QA semua halaman (1440 px & 390 px) ke `qa/output/` — jalankan `npm run start -- -p 3100` dulu |

### Akun demo

Akun demo **sengaja tidak ditampilkan di halaman Masuk**.

| Peran | Email | Kata sandi |
|---|---|---|
| Pembeli + penjual (punya toko) | `dinda@contoh.id` | `rupa1234` |
| Admin | `admin@rupa.id` | `admin1234` |
| Pembeli tanpa toko | `ayu@contoh.id` | `ayu12345` |
| Akun diblokir | `tono@contoh.id` | `tono1234` |

Kode OTP untuk daftar dan lupa kata sandi: `123456`. Pembayaran memakai kotak **Kontrol simulasi** di halaman Pembayaran (berhasil / kedaluwarsa).

Data yang berubah (pesanan, keranjang, akun baru, laporan, dll.) disimpan di `localStorage` browser. Untuk mengulang dari awal, hapus data situs di DevTools → Application → Storage.

## Stack

- **Next.js 16** (App Router, Turbopack, `cacheComponents`), **React 19**, **TypeScript strict**
- **Tailwind CSS v4** — token di `@theme` pada `app/globals.css`
- **Zustand** (`persist` ke localStorage) — keranjang, wishlist, riwayat chat AI, hasil AI Sortir tersimpan, sesi mock (hanya `userId`)
- **zod** — validasi formulir (`lib/validation.ts`, siap dipakai ulang di route handler)
- Font lewat `next/font/google`: Newsreader, Plus Jakarta Sans, IBM Plex Mono, Poppins 700 (wordmark)

Gaya komponen di `app/globals.css` adalah port 1:1 dari `rupa-ui-kit/prototype/styles.css` (nama kelas sama dengan prototipe) di dalam `@layer components`, sehingga ukuran, jarak, warna, dan breakpoint (1180/1024/900/760 px) persis sama dan utilitas Tailwind tetap bisa menimpanya.

> Next.js 16 mengganti nama `middleware.ts` menjadi **`proxy.ts`**. Fungsinya sama: tamu dialihkan ke `/masuk?next=…`, non-admin dikeluarkan dari `/admin`.

## Struktur folder

```
app/                      halaman (page.tsx = Server Component tipis + komponen klien di <Suspense>)
  page.tsx                Beranda
  jelajahi/ produk/[id]/ sortir/ assistant/ jual/ dashboard/ keranjang/ checkout/ checkout/berhasil/
  pesanan/ profil/ wishlist/ masuk/ daftar/ lupa-sandi/ buka-toko/ pembayaran/[id]/ admin/
  api/assistant/          route handler POST AI Assistant (Groq, server-only)
proxy.ts                  gating rute (Next 16 = middleware)
components/
  layout/                 Header, MobileDrawer, ProfileMenu, DemoBanner, Footer, BottomNav, AssistantLauncher
  ui/                     Button, Chip, Tag, StatusPill, Field, Input, Select, RadioCard, Switch, Stepper, Modal,
                          ConfirmDialog, Toast, Skeleton, EmptyState, Notice, WarnBox, Tabs, Placeholder, Icon
  auth/ product/ home/ sortir/ assistant/ sell/ dashboard/ checkout/ payment/ orders/ profile/ shop/ admin/
  modals/                 ChatModal, ReasonModal, ReviewModal, TextModal (dipakai lintas halaman)
lib/
  clients/                groq.ts (chat() aktif; vision() STUB), supabase.ts, payment-gateway.ts (STUB)
  services/               satu-satunya akses data dari komponen (async + hook reaktif)
  ai/                     assistant-engine.ts, sortir-engine.ts, listing-assist.ts (port dari prototipe);
                          assistant-llm.ts, assistant-prompts.ts, assistant-schema.ts (AI Assistant + Groq)
  data/                   JSON contoh dari rupa-ui-kit/design/data + konten editorial beranda
  store/                  Zustand: session, cart, wishlist, chat, sortir, sell, toast, db (database mock)
  validation.ts format.ts rate-limit.ts
types/                    user, product, order, payment, social, ai
qa/                       skrip screenshot Playwright
tests/assistant/          uji Playwright tanpa browser (unit/, api/) + kasus evaluasi
rupa-ui-kit/              paket desain asli (acuan, tidak dipakai saat runtime)
```

## Titik sambung backend

Komponen tidak pernah membaca data langsung; semuanya lewat `lib/services`. Fungsi mutasi sudah `async`, jadi menyambung backend cukup mengganti isi service (dan hook bacanya) tanpa mengubah komponen. Setiap file service punya komentar `TODO(...)`.

| Service | Sekarang | Nanti |
|---|---|---|
| `auth.service.ts` | akun dari `accounts-demo.json`, OTP `123456`, sesi = `userId` di store + cookie `rupa_uid` | Supabase Auth: `signUp` + `verifyOtp({type:'signup'})`, `signInWithPassword`, `resetPasswordForEmail` + `verifyOtp({type:'recovery'})`, `updateUser({ password })`, `signOut`; sesi di `proxy.ts` lewat `@supabase/ssr` |
| `product.service.ts` | `products.json` + filter lokal | tabel `products`, `listings`; pencarian full-text |
| `cart.service.ts` | store `cart`, `wishlist` | tabel `cart_items`, `wishlists` |
| `checkout.service.ts` | ongkir simulasi, pesanan ke store `db` | route handler `POST /api/orders` (kunci stok, insert pesanan) |
| `order.service.ts` | store `db` | tabel `orders`, `order_items`, `seller_orders` |
| `payment.service.ts` | VA/QR contoh, kontrol simulasi | `lib/clients/payment-gateway.ts` (createVA/createQris/createEwallet), status dari webhook + `verifySignature` |
| `shop.service.ts` | store `db` | tabel `seller_profiles` (rekening dienkripsi di server) |
| `moderation.service.ts` | store `db` | route handler `/api/admin` dengan cek role |
| `sortir.service.ts` | skenario contoh; **foto sungguhan tidak dianalisis** | Groq vision lewat `lib/clients/groq.ts` di route handler |
| `assistant.service.ts` | **sudah tersambung**: `POST /api/assistant` → Groq chat + katalog `products.json` (lihat [AI Assistant](#ai-assistant)) | katalog & status listing dari tabel `products`; riwayat ke `assistant_sessions` / `assistant_messages` |
| `listing-assist.service.ts` | saran judul/deskripsi berbasis aturan | Groq chat; `claimsFlags` tetap lokal |
| `profile.service.ts`, `seller.service.ts` | store `db` | tabel `profiles`, `addresses`, `messages` (Realtime) |

Variabel lingkungan yang nanti dibutuhkan (`.env.local`, contoh di `.env.example`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `GROQ_API_KEY`, `GROQ_CHAT_MODEL`, `PAYMENT_SERVER_KEY`.

### AI Assistant

Chatbot Rupa ada di tombol **Tanya AI** (pojok kanan bawah) dan di halaman `/assistant`. Ada dua mode:

- **Belanja dengan AI**: pengguna menulis kebutuhan ("tas di bawah Rp150.000", "kado untuk teman yang suka tanaman"), lalu chatbot menampilkan kartu produk dari katalog beserta alasan kenapa cocok.
- **Konsultasi Upcycle**: pengguna bertanya cara mengolah barang bekas, lalu chatbot memberi ide, langkah kerja, dan catatan keamanan.

> Berbeda dari fitur lain di repo ini yang masih simulasi, **AI Assistant sudah memanggil layanan AI sungguhan (Groq)** lewat route handler `POST /api/assistant`. Tanpa API key, chatbot tetap berjalan dengan mesin aturan lokal.

#### Mulai cepat

1. Salin contoh env:
   - Windows (PowerShell): `copy .env.example .env.local`
   - macOS/Linux: `cp .env.example .env.local`
2. Buat API key gratis di [console.groq.com](https://console.groq.com) → **API Keys**, lalu isi `GROQ_API_KEY=` di `.env.local`. Baris `GROQ_CHAT_MODEL` boleh dibiarkan.
3. Jalankan `npm run dev`. Pastikan terminal mencetak `- Environments: .env.local`, lalu catat port di baris `Local:` (bisa 3001 dan seterusnya kalau 3000 sedang dipakai).
4. Buka **Tanya AI** dan tanyakan "cari tas di bawah 150 ribu". Di terminal harus muncul baris log berisi `"path":"llm"`.

Setiap kali `.env.local` dibuat atau diubah, matikan server (Ctrl+C) lalu jalankan `npm run dev` lagi.

> **Keamanan API key**
> - `.env.local` sudah diabaikan Git (aturan `.env*` di `.gitignore`). Jangan mengubah aturan itu dan jangan pakai `git add .` atau `git add -A`; sebutkan nama file satu per satu.
> - Jangan beri awalan `NEXT_PUBLIC_`, karena variabel dengan awalan itu ikut terkirim ke browser.
> - Kalau key sempat ter-commit, terkirim ke chat, atau terlihat di screenshot, hapus key itu di console.groq.com lalu buat yang baru.
> - Setiap anggota tim memakai key sendiri.

#### Cara kerja

```
UI (ChatShell) → assistant.service.ts (fetch + AbortController, timeout klien 12 dtk)
  → POST /api/assistant
      rate limit 20/menit/IP → validasi zod → id produk dicocokkan ke katalog
      ├─ "bandingkan"        → compareResp()   (selalu tanpa LLM)
      ├─ tanpa GROQ_API_KEY  → respond()       (mesin aturan)
      └─ dengan key:
           Belanja:     parseIntent (LLM) → searchCatalog (kode) → explain (LLM)
           Konsultasi:  parseIntent (LLM) → consultLLM (LLM)
           Di luar topik / upaya membobol prompt → teks tetap
```

Tiga aturan utamanya:

1. **Produk selalu dipilih kode, bukan LLM.** `searchCatalog()` di `lib/ai/assistant-engine.ts` menyaring katalog: stok > 0, bukan listing yang diturunkan admin (`hidden`), sesuai budget, material, dan jenis barang. LLM hanya memahami maksud pengguna dan menulis teks alasan atau panduan.
2. **Angka hanya dari katalog.** Harga, rating, stok, dan penjual di kartu dibaca dari data katalog (label "Data katalog"). Teks dari LLM (label "Saran AI") divalidasi dengan zod lalu disaring di `lib/ai/assistant-schema.ts`: id produk di luar daftar terpilih, kalimat yang memuat angka, dan klaim mutlak dibuang.
3. **Selalu ada jawaban.** Kalau langkah LLM gagal, jawaban diambil dari mesin aturan lokal. Panduan konsultasi selalu diberi catatan keamanan yang relevan (`ensureSafety`).

#### Kapan chatbot memakai mesin aturan

| Kondisi | Yang terjadi |
|---|---|
| `GROQ_API_KEY` kosong | Seluruh jawaban dari mesin aturan |
| Groq lambat (batas 9 dtk per permintaan) | Mesin aturan |
| Groq membalas 429 atau 5xx | Coba ulang sekali kalau `retry-after` ≤ 2 dtk dan waktu masih cukup; kalau tidak, mesin aturan |
| JSON dari LLM rusak atau tidak sesuai skema | Mesin aturan |
| Model tidak ditemukan (404) | Mesin aturan |
| Key ditolak (401/403) | **Pesan galat** dengan tombol "Coba lagi", supaya salah konfigurasi terlihat |

#### Membaca log server

Setiap jawaban mencetak satu baris di terminal `npm run dev`. Isi pesan pengguna, isi respons Groq, dan API key tidak pernah dicatat.

```json
{"scope":"assistant","v":"2","event":"reply","path":"fallback","reason":"no_key","mode":"shop","kind":"products","ms":6}
```

`v` adalah versi prompt (`ASSISTANT_PROMPT_VERSION`), `ms` adalah lama proses di server.

| `path` | Artinya |
|---|---|
| `llm` | Semua langkah LLM berhasil |
| `llm_partial` | Maksud dipahami LLM, tetapi teks alasan/panduan dari mesin aturan |
| `fallback` | Seluruh jawaban dari mesin aturan (lihat `reason`) |
| `rules` | Perbandingan produk, memang selalu tanpa LLM |
| `error` | Key ditolak Groq |

| `reason` | Artinya | Yang perlu dilakukan |
|---|---|---|
| `no_key` | `GROQ_API_KEY` tidak terbaca | Cek nama file (`.env.local`, bukan `.env.local.txt`), isinya, lalu restart `npm run dev` |
| `http_401` / `http_403` | Key salah atau sudah dicabut | Buat key baru di console.groq.com |
| `http_404` | Model di `GROQ_CHAT_MODEL` tidak ada atau sudah dimatikan Groq | Pilih model yang ada di [console.groq.com/docs/models](https://console.groq.com/docs/models) |
| `http_429` | Kuota token per menit habis | Tunggu sebentar, beri jeda antar pertanyaan |
| `timeout`, `network` | Groq lambat atau koneksi gagal | Coba lagi; cek koneksi internet |
| `invalid_json`, `invalid_schema`, `empty_guide` | Keluaran LLM tidak bisa dipakai | Biasanya sesekali saja; kalau sering, periksa prompt |
| `no_time` | Sisa waktu tidak cukup untuk memanggil LLM lagi | Wajar sesekali; jawaban tetap dalam batas 10 dtk |
| `exception`, `unexpected` | Galat di kode | Laporkan ke pemegang fitur beserta langkah untuk mengulanginya |

#### File

| File | Isi |
|---|---|
| `lib/clients/groq.ts` | `chat()` ke Groq (server-only): timeout, coba ulang, `reasoning_effort: 'low'` untuk model gpt-oss. `vision()` masih stub (milik AI Sortir) |
| `lib/ai/assistant-llm.ts` | Alur LLM: `parseIntent`, `explain`, `consultLLM`, `answer()` |
| `lib/ai/assistant-prompts.ts` | System prompt per tugas dan `ASSISTANT_PROMPT_VERSION` |
| `lib/ai/assistant-schema.ts` | Skema zod input/keluaran, penyaring teks LLM, `ensureSafety`, batas `MAX_TEXT` (500 karakter) dan `MAX_HISTORY` (8 pesan) |
| `lib/ai/assistant-engine.ts` | Mesin aturan dan `searchCatalog()` (dipakai jalur LLM juga) |
| `app/api/assistant/route.ts` | Route handler: rate limit, validasi, log, batas waktu 9 dtk |
| `lib/rate-limit.ts` | Rate limit sederhana di memori |
| `lib/services/assistant.service.ts` | Pemanggil dari UI: pembatalan permintaan, pesan galat dan "Coba lagi" |
| `tests/assistant/` | Uji unit, uji endpoint, dan kasus evaluasi live (`eval-cases.ts`) |

#### Konfigurasi

| Variabel | Wajib | Keterangan |
|---|---|---|
| `GROQ_API_KEY` | Untuk jalur LLM | Hanya dibaca di server |
| `GROQ_CHAT_MODEL` | Tidak | Default `openai/gpt-oss-120b`. `llama-3.3-70b-versatile` sudah dimatikan Groq sejak 16 Agustus 2026 |

#### Pengujian

| Perintah | Kegunaan |
|---|---|
| `npm run test:unit` | Uji fungsi murni; LLM dipalsukan, tanpa server dan tanpa Groq |
| `npm test` | Uji unit + validasi endpoint `POST /api/assistant` (tetap tanpa Groq) |
| Evaluasi live (lihat di bawah) | 7 skenario ke Groq sungguhan; dipakai setelah mengubah prompt |

Evaluasi live butuh `npm run dev` yang sudah jalan dengan key di `.env.local`. Ganti `3000` dengan port server.

```powershell
# Windows (PowerShell)
$env:ASSISTANT_EVAL="1"; $env:BASE_URL="http://localhost:3000"; npx playwright test --project=api eval
```

```bash
# macOS/Linux
ASSISTANT_EVAL=1 BASE_URL=http://localhost:3000 npx playwright test --project=api eval
```

Ada jeda 15 detik antar giliran (atur dengan `ASSISTANT_EVAL_GAP_MS`) supaya tidak kena batas token per menit, jadi satu putaran sekitar 3 menit. Setiap putaran memakai kuota Groq.

#### Mengubah prompt

1. Ubah prompt di `lib/ai/assistant-prompts.ts`.
2. Naikkan `ASSISTANT_PROMPT_VERSION` (misalnya `'2'` → `'3'`), supaya log bisa membedakan versi lama dan baru.
3. Jalankan `npm run test:unit`, lalu evaluasi live.
4. Bandingkan hasilnya dengan versi sebelumnya sebelum di-commit.

#### Batasan

- **Kuota gratis Groq kecil**: sekitar 8.000 token per menit untuk semua pengguna, kira-kira 3 pertanyaan belanja per menit. Lewat dari itu jawaban datang dari mesin aturan (`reason: http_429`). Untuk demo di kelas, beri jeda antar pertanyaan.
- **Endpoint terbuka untuk tamu.** Laporan perancangan menetapkan `POST /api/assistant` hanya untuk pengguna yang masuk, tetapi autentikasi masih mock. `TODO(Supabase)`: wajibkan sesi setelah Supabase Auth tersambung.
- **Rate limit di memori satu instans** dan IP dibaca dari `x-forwarded-for`, jadi hanya cocok untuk demo.
- **Data masih contoh.** Katalog dari `products.json`, daftar `hidden` dikirim dari browser, dan riwayat chat disimpan di `localStorage`. `TODO(Supabase)` ada di `searchCatalog`, `route.ts`, dan `assistant.service.ts`.
- **Penyaring angka sengaja ketat**: alasan dari LLM yang memuat angka (misalnya "muat 2 buku") ikut dibuang.
- **Tanpa LLM**, permintaan yang tidak ada di katalog (misalnya "kursi emas di bawah Rp10.000") dijawab dengan produk termurah yang paling mendekati, bukan "tidak ada".

#### Untuk anggota tim lain

- `chat()` di `lib/clients/groq.ts` boleh dipakai untuk bantuan listing, tetapi hanya dari route handler, bukan dari komponen `'use client'`.
- `vision()` di file yang sama belum diisi; itu bagian AI Sortir.

## Catatan keamanan mock

- Kata sandi **tidak pernah** disimpan di store atau localStorage. Kata sandi akun baru / hasil reset hanya ada di memori `auth.service.ts` dan hilang saat halaman dimuat ulang.
- Karena ini mock di sisi klien, file `accounts-demo.json` ikut terbundel ke browser. Ini hanya untuk demo; di produksi kredensial ditangani Supabase Auth di server.
- Gating di `proxy.ts` dan `components/auth/Guard.tsx` hanya pemeriksaan optimistis; otorisasi sebenarnya harus di server/RLS.
