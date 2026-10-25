# Prompt untuk Claude Code — Frontend Rupa

> Cara pakai: taruh folder `rupa-ui-kit/` di root proyek kosong, jalankan Claude Code di root itu, lalu salin semua teks di bawah garis ini sebagai pesan pertama.

---

Kamu akan membangun **frontend Rupa**, marketplace upcycle consumer-to-consumer (C2C) untuk pasar Indonesia, dari paket desain di folder `./rupa-ui-kit`. Hasil akhirnya harus terlihat dan berperilaku sama dengan prototipe, tetapi ditulis ulang sebagai aplikasi Next.js yang rapi dan siap disambungkan ke backend (Supabase + Groq) di tahap berikutnya.

## 1. Sumber kebenaran (baca dulu sebelum menulis kode)

1. `rupa-ui-kit/README.md` — isi paket.
2. `rupa-ui-kit/prototype/index.html` — **prototipe interaktif lengkap**. Bagian `<template id="tpl">` berisi markup semua halaman (`{{ ... }}` = data, `<sc-if>` = kondisi, `<sc-for>` = perulangan). Bagian `<script>` berisi data contoh, mesin AI simulasi, state, dan semua handler di method `renderVals()`. Halaman bisa dibuka langsung dengan hash: `index.html#explore`, `#product`, `#sortir`, `#assistant`, `#sell`, `#dash`, `#cart`, `#checkout`, `#payment`, `#orders`, `#profile`, `#wishlist`, `#login`, `#register`, `#forgot`, `#openShop`, `#admin`. Akun demo: `dinda@contoh.id` / `rupa1234` (pembeli + penjual), `admin@rupa.id` / `admin1234` (admin); kode OTP `123456`.
3. `rupa-ui-kit/prototype/styles.css` — **design token dan semua gaya komponen**. Ini acuan utama warna, ukuran, jarak, radius, bayangan, dan breakpoint.
4. `rupa-ui-kit/design/screenshots/` — tangkapan layar desktop (1440 px) dan mobile (390 px) sebagai acuan visual.
5. `rupa-ui-kit/design/data/*.json` — data contoh (produk, penjual, ulasan, skenario AI Sortir, basis pengetahuan AI Assistant, pola klaim, data dashboard, data pembeli, `accounts-demo.json`, `payments.json`, `admin.json`, `auth-gating.json`). Path gambar di JSON sudah berbentuk `/products/...` dan `/brand/...` (untuk folder `public/`).
6. `rupa-ui-kit/design/diagrams/` — use case, activity diagram, class diagram, ERD, dan arsitektur. **Struktur berkas dan nama service mengikuti class diagram ini.**

Kalau ada perbedaan antara screenshot dan prototipe, **prototipe yang benar**.

## 2. Stack dan aturan teknis

- Next.js versi stabil terbaru dengan **App Router**, **TypeScript strict**, **Tailwind CSS**.
  - Jika Tailwind v4: definisikan token di `@theme` pada `app/globals.css`. Jika v3: di `tailwind.config.ts`.
- Font lewat `next/font/google`: **Newsreader** (judul editorial, ada italic), **Plus Jakarta Sans** (teks UI), **IBM Plex Mono** (label material dan metadata), **Poppins 700** (hanya wordmark "Rupa.").
- State global: **Zustand** dengan `persist` (localStorage) untuk keranjang, wishlist, riwayat chat AI, hasil Sortir tersimpan, dan sesi mock (hanya `userId`, **tidak pernah** kata sandi). State lokal halaman cukup `useState`.
- Validasi formulir dengan **zod** (skema dipakai ulang nanti di route handler).
- Ikon: SVG garis 24×24, stroke 1.7, ujung membulat, seperti di prototipe. Boleh pakai `lucide-react` asal tampilannya mirip. **Jangan pakai emoji** sebagai ikon.
- Tanpa library komponen berat. Komponen dibuat sendiri dengan Tailwind sesuai `styles.css`.
- Salin `rupa-ui-kit/prototype/assets/products/*` ke `public/products/` dan `rupa-ui-kit/prototype/assets/brand/*` ke `public/brand/`. Gunakan `next/image`.

## 3. Design token (wajib persis)

| Token | Nilai | Dipakai untuk |
|---|---|---|
| `bg` | `#FAFAFA` | latar halaman |
| `paper` | `#FFFFFF` | panel, kartu, input |
| `sand` / `sand-2` / `line` | `#EDEDED` / `#D9D9D9` / `#E2E2E2` | latar foto, garis |
| `ink` / `ink-2` / `ink-3` | `#111111` / `#3A3A3A` / `#545454` | teks |
| `forest` / `forest-2` | `#0B7A43` / `#0A6B3B` | tombol utama, tautan, hover |
| `forest-tint` / `forest-wash` | `#E6FFF3` / `#F2FFF8` | label "Data katalog", filter aktif |
| `brand` | `#26B670` | logo, wordmark, blok "Produk jadi" |
| `chart` | `#0F9453` | batang grafik, meter keyakinan tinggi |
| `ai` / `ai-hover` | `#5500FF` / `#4A00DE` | **semua elemen AI**, cincin fokus |
| `ai-tint` / `ai-tint-2` | `#EEE6FF` / `#E3D5FF` | latar bagian AI, hover tombol AI |
| `warn-tint` / `warn` | `#F4E5C3` / `#6B4600` | peringatan |
| `danger` / `danger-tint` | `#A3392A` / `#F6DAD4` | galat |

- Radius: 4 px (foto), 6 px (kontrol), 10 px (panel). Sistem jarak kelipatan 8 px.
- Fokus keyboard: `outline: 3px solid #5500FF; outline-offset: 2px` di semua elemen interaktif.
- **Aturan warna:** hijau = belanja dan aksi utama; ungu = khusus AI. Jangan menukar.
- Placeholder foto memakai pola CSS per material (`.ph-wood`, `.ph-plastic`, `.ph-textile`, `.ph-rubber`, `.ph-metal`, `.ph-screen` di `styles.css`) dengan label "Ilustrasi … · foto menyusul". Jangan diganti foto stok.

## 4. Struktur proyek (sesuai class diagram)

```
app/
  layout.tsx                 # Header, DemoBanner, Footer, BottomNav, AssistantLauncher, Toaster
  page.tsx                   # Beranda
  jelajahi/page.tsx
  produk/[id]/page.tsx
  sortir/page.tsx
  assistant/page.tsx
  jual/page.tsx
  dashboard/page.tsx
  keranjang/page.tsx
  checkout/page.tsx
  checkout/berhasil/page.tsx
  pesanan/page.tsx
  profil/page.tsx
  wishlist/page.tsx
  masuk/page.tsx             # Masuk (+ ?next=/checkout)
  daftar/page.tsx            # Daftar -> verifikasi OTP -> berhasil
  lupa-sandi/page.tsx        # 4 langkah: email, kode, sandi baru, selesai
  buka-toko/page.tsx         # 3 langkah: info toko, rekening, persetujuan
  pembayaran/[id]/page.tsx   # VA / QRIS / e-wallet + hitung mundur
  admin/page.tsx             # Panel Admin (5 tab)
middleware.ts                # redirect tamu ke /masuk?next=..., non-admin keluar dari /admin
components/
  layout/   Header, BottomNav, Footer, DemoBanner, MobileDrawer, ProfileMenu
  product/  ProductCard, ProductRail, FilterPanel, ActiveFilterChips, MaterialStory, ReviewList
  sortir/   SortirStepper, SortirUpload, SortirLoading, SortirResult, LowConfidencePanel, ActionPicker, IdeaCard, CreatorList
  assistant/ ChatShell, MessageBubble, RecommendationCard, CompareColumns, GuideBlock, ChatInput
  sell/     ListingStepper, PhotoUploader, AiSuggestions, ClaimWarnings, PriceReference, PriceCalculator, ListingPreview
  dashboard/ KpiTiles, RevenueChart, AlertList, ListingTable, SellerOrderTable, SellerReviewList
  checkout/ CartGroup, OrderSummary, ShippingOptions, PaymentOptions (+ pilihan bank / e-wallet), MobilePayBar
  auth/     AuthLayout, PasswordInput (ikon mata), PasswordStrength, OtpInput, ResendTimer
  shop/     OpenShopStepper, BankAccountForm
  payment/  Countdown, VaBox, PaymentGuideTabs, QrisBox, WalletBox, SimulationControls
  admin/    AdminTabs, KpiTiles, ShopVerificationList, ReportList, DisputeList, UserTable
  ui/       Button, IconButton, Chip, Tag, StatusPill, Field, Input, Select, Textarea, RadioCard, Switch, Stepper,
            Modal, ConfirmDialog, Toast, Skeleton, EmptyState, Notice, WarnBox, Tabs, Placeholder
lib/
  clients/supabase.ts        # stub, belum dipakai (siapkan createClient dari env)
  clients/groq.ts            # stub, belum dipakai
  clients/payment-gateway.ts # stub (createVA, createQris, createEwallet, verifySignature)
  services/product.service.ts, cart.service.ts, checkout.service.ts, order.service.ts,
           sortir.service.ts, assistant.service.ts, listing-assist.service.ts,
           auth.service.ts, shop.service.ts, payment.service.ts, moderation.service.ts
  ai/assistant-engine.ts     # port dari prototipe: parseBudget, MATRX, TYPERX, respond/shop/consult/compare
  ai/sortir-engine.ts        # port dari prototipe: skenario, ambang keyakinan 60, urutan aksi
  ai/listing-assist.ts       # port: saran judul/kategori/tag, generate deskripsi, claimsFlags, referensi harga
  data/                      # impor JSON dari rupa-ui-kit/design/data
  format.ts                  # rp(n) => "Rp85.000" (pemisah titik), r1(n) => "4,9"
  store/                     # zustand: session, cart, wishlist, chat, sortir, toast
types/ user.ts, product.ts, order.ts, payment.ts, social.ts, ai.ts
```

**Service harus async** (mengembalikan `Promise`) walaupun sekarang membaca data lokal, supaya nanti tinggal diganti ke Supabase/Groq tanpa mengubah komponen.

## 5. Halaman dan perilaku yang wajib ada

Salin teks UI (Bahasa Indonesia) persis dari prototipe. Semua harga dalam Rupiah.

1. **Beranda** — banner prototipe (bisa ditutup), hero "Barang Lama. *Cerita Baru.*" dengan 2 CTA dan kolase 3 foto berkapsul; Produk Pilihan (1 kartu editorial besar + 3 kartu); rail Baru di Rupa; band AI Sortir (latar ungu muda, kartu spesimen beranotasi); rail Temuan Unik di Bawah Rp100.000; Pilihan Berdasarkan Minat (chip yang mengubah daftar); Belanja per Material (5 tile); Cerita Transformasi (sebelum → sesudah); ajakan penjual; Belanja dengan Tenang (4 poin + catatan simulasi); footer.
2. **Jelajahi** — pencarian (nama, material, kategori, kegunaan, nama penjual), tab kategori, panel filter (harga, material dengan jumlah, kondisi, lokasi, rating ≥4,7, sembunyikan stok habis), chip filter aktif + "Hapus semua", urutan (relevan, terbaru, harga naik/turun, terpopuler), kotak "Tanya AI Assistant", keadaan kosong. Di layar ≤900 px filter jadi panel layar penuh. Simpan filter di query string URL.
3. **Detail produk** — galeri + thumbnail, rating, harga, kartu penjual (Chat penjual, Produk lain dari penjual ini), stepper jumlah dibatasi stok, Tambah ke keranjang / Beli sekarang / wishlist, info pengiriman, blok **"Dari apa, menjadi apa"** (Material asal → Proses → Produk jadi, label "Informasi dari penjual"), spesifikasi, disclaimer + **Laporkan listing** (modal dengan alasan), ulasan dengan distribusi bintang dan "Pembelian terverifikasi", produk terkait.
4. **AI Sortir** — stepper 5 langkah (Unggah, Identifikasi, Langkah, Ide, Marketplace) yang hanya bisa dilompati ke langkah yang sudah dicapai.
   - Langkah 1: dropzone drag & drop (JPG/PNG/WebP, maks. 10 MB, validasi + pesan galat), tombol Kamera/Galeri di mobile, catatan privasi, 6 contoh (jeans, botol, kursi, foto buram, tangkapan layar, koneksi terputus), form deskripsi manual (min. 12 karakter). Keadaan: idle, preview (ganti/hapus), loading (3 baris progres + scanline + skeleton, bisa dibatalkan), unsupported, error (+ coba lagi), uploadChoice.
   - **Kejujuran:** foto unggahan sungguhan **tidak** dianalisis di versi ini. Tampilkan "Mode prototipe" dan minta pengguna memilih jenis barang; hasilnya diberi label "· contoh".
   - Langkah 2: hasil (kategori, perkiraan komposisi berlabel "Perkiraan", kondisi terlihat, kategori pemanfaatan, meter keyakinan, peringatan keamanan, kalimat batasan, tombol koreksi material). Jika keyakinan < 60 atau deskripsi tidak dikenali → panel keyakinan rendah + pilih material.
   - Langkah 3: 5 aksi, yang disarankan di urutan pertama dengan tag "Disarankan"/"Perlu hati-hati".
   - Langkah 4: 3 kartu ide (kesulitan bertitik, waktu, biaya, alat, langkah bisa dibuka, contoh produk, simpan ide).
   - Langkah 5: 4 tile aksi (Lihat Produk Serupa, Temukan Kreator, Jual Material → buka form Jual terisi data, Simpan Hasil Analisis → tersimpan di profil tanpa foto), produk serupa, daftar kreator + tombol Hubungi.
5. **AI Assistant** — halaman penuh (sidebar riwayat + percakapan) dan panel melayang dari tombol "Tanya AI" (disembunyikan di halaman assistant dan checkout; di mobile panel jadi layar penuh). Mode **Belanja dengan AI** / **Konsultasi Upcycle**, saran pertanyaan saat kosong, indikator mengetik, pesan galat + "Coba lagi", chip balasan cepat (sebagian menavigasi ke halaman lain), kartu rekomendasi (label "Data katalog", alasan "kenapa cocok", Lihat Produk / Bandingkan maks. 3 / Simpan), tampilan perbandingan berkolom, blok panduan + catatan keamanan. Teks AI selalu berlabel "Saran AI".
   - Jawaban **tidak boleh sama untuk semua pertanyaan**: port mesin `respond → shop/consult/compareResp` dari prototipe (budget "di bawah Rp150.000"/"150rb", material, jenis barang, hadiah → klarifikasi, "yang lebih murah", "pilihan lain", "bandingkan"). Muat 3 percakapan contoh dari `ai-assistant.json`.
6. **Jual Produk** — 6 langkah dengan status Lengkap/Belum lengkap di stepper kiri dan panel "Asisten listing" (ungu muda) di kanan: foto (maks. 5, sampul, hapus), cerita + saran judul/kategori/tag AI (skeleton saat loading), material asal, tag, kondisi (radio card), ukuran, berat, proses, deskripsi dengan "Buat draf deskripsi", **peringatan klaim** real-time, kata kunci; harga + stok + referensi harga (hanya jika ≥3 pembanding) + kalkulator (bahan + jam × tarif × 1,3, dibulatkan Rp5.000); pengiriman; pratinjau + checklist. Validasi per langkah, dialog konfirmasi terbit, mode edit.
7. **Dashboard Penjual** — tab Ringkasan (4 KPI berlabel "Data contoh", grafik pendapatan 8 minggu dengan tooltip dan toggle "Lihat sebagai tabel", daftar Perlu perhatian), Produk (filter status, Edit, Jeda dengan konfirmasi/Aktifkan), Pesanan (Terima dan kemas → Input nomor resi via modal, validasi min. 8 karakter), Ulasan (balas/ubah balasan via modal). Badge jumlah di tab.
8. **Keranjang & Checkout** — keranjang dikelompokkan per penjual ("Paket n"), stepper jumlah, hapus dengan toast "Urungkan", catatan jumlah paket. Checkout 3 langkah: alamat (validasi nama, HP Indonesia, alamat ≥15 karakter, kode pos 5 digit) + kurir per paket (Reguler/Ekspres, ongkir simulasi: kota sama 9.000, sesama Jawa 15.000, lainnya 32.000, ekspres +12.000), pembayaran (VA → wajib pilih bank BCA/BNI/BRI/Mandiri/Permata, e-wallet → wajib pilih GoPay/OVO/DANA/ShopeePay, QRIS, COD dinonaktifkan jika >1 penjual), tinjau + aturan pembatalan + persetujuan; tombol akhir "Buat pesanan dan bayar" (COD: "Buat pesanan"). Bilah total menempel di bawah pada mobile. Non-COD → halaman Pembayaran; COD → halaman berhasil dengan status "Dikemas penjual". Halaman berhasil menampilkan judul/teks sesuai kasus dan status tiap pesanan per penjual.
9. **Pesanan Saya** — tab Semua/Berjalan/Selesai/Dibatalkan dengan jumlah, linimasa 5 tahap, aksi sesuai status: **Bayar sekarang** (membuka halaman Pembayaran untuk tagihan yang masih aktif), Batalkan (konfirmasi), Pesanan diterima (konfirmasi → tawarkan ulasan), Beri ulasan (modal bintang + teks, validasi), Ajukan bantuan (modal alasan), Chat penjual, Beli lagi.
10. **Profil, Wishlist** — profil (validasi nama dan email), alamat (tambah, jadikan utama, hapus), notifikasi (switch), Hasil AI Sortir (buka lagi/hapus), Privasi (switch, hapus riwayat AI dengan konfirmasi). Wishlist dengan keadaan kosong.
11. **Masuk** — tata letak dua kolom (form + foto, foto hilang ≤900 px), notice alasan dialihkan ("Masuk dulu untuk melanjutkan ke checkout…"), email + **PasswordInput dengan ikon mata** (tombol `type="button"`, ganti `type` password/text, `aria-label` "Tampilkan/Sembunyikan kata sandi", `aria-pressed`, `aria-controls`, fokus tidak pindah), peringatan Caps Lock, "Ingat saya", galat "Email atau kata sandi salah. Sisa percobaan: n." dan kunci setelah 5 kali, pesan akun diblokir. **Jangan tampilkan akun demo atau kata sandinya di UI**; kredensial demo hanya ada di README dan `accounts-demo.json`. Setelah berhasil kembali ke `next`; admin ke `/admin`.
12. **Daftar** — nama (≥3), email (format + belum terdaftar), HP Indonesia, kata sandi + ulangi (masing-masing dengan ikon mata), meter kekuatan 4 segmen + daftar syarat (wajib: ≥8 karakter, huruf + angka; disarankan: huruf besar & kecil, simbol), persetujuan. Lalu verifikasi OTP 6 digit (input numerik, maks. 5 percobaan, kirim ulang setelah hitung mundur 30 detik, ganti email), lalu layar berhasil (Mulai belanja / Buka toko).
13. **Lupa kata sandi** — 4 langkah: email (pesan netral, tidak membocorkan email terdaftar atau tidak), kode OTP, kata sandi baru dua kali (ikon mata + meter, tidak boleh sama dengan yang lama), selesai ("semua sesi lain dikeluarkan") → Masuk dengan email terisi.
14. **Buka Toko** — hanya untuk pengguna masuk yang belum punya toko (yang sudah punya diarahkan ke dashboard; admin ditolak). Stepper 3 langkah: info toko (nama unik 3–40, kota, deskripsi ≤160 + penghitung), rekening (bank, nomor 8–16 angka, nama pemilik; peringatan bila beda dari nama akun; catatan enkripsi), aturan penjual + persetujuan + ringkasan (rekening dimasking `BNI •••• 6789`). Selesai → toko aktif dengan pill "Menunggu verifikasi admin". Mengklik Jual/Dashboard tanpa toko mengarah ke sini.
15. **Pembayaran** — kartu hitung mundur (VA 24 jam, QRIS/e-wallet 30 menit, `role="timer"`), total + Salin jumlah, metode; VA: nomor dikelompokkan 4 digit + Salin nomor + tab panduan M-banking/ATM/Internet banking; QRIS: kode QR contoh (berlabel "tidak dapat dipindai") + Unduh; e-wallet: tombol buka aplikasi. Ringkasan tagihan per pesanan di kanan, tombol "Saya sudah bayar, cek status" (pesan bila belum diterima), "Bayar nanti". Kotak **Kontrol simulasi** (berhasil / kedaluwarsa). Kedaluwarsa → order dibatalkan otomatis + layar galat. Berhasil → order "Dikemas penjual" + halaman berhasil. Satu tagihan untuk semua paket.
16. **Panel Admin** — hanya role admin. Tab Ringkasan (4 KPI yang bisa diklik), Verifikasi toko (pending di atas, Setujui / Tolak dengan alasan wajib ≥10 karakter, catatan otomatis bila nama rekening beda), Laporan listing (Turunkan listing dengan konfirmasi → listing hilang dari katalog, Abaikan + Urungkan), Sengketa (Putuskan: refund penuh / 50% / teruskan ke penjual), Pengguna (cari, Blokir dengan konfirmasi / Pulihkan; admin tidak bisa diblokir). Laporan dan pengajuan bantuan dari pengguna langsung muncul di sini. Badge jumlah di tab.

**Global:** header desktop (logo, Beranda, Jelajahi, Sortir dengan AI, Jual Produk, cari, wishlist + badge, keranjang + badge, lalu **Masuk + Daftar** untuk tamu atau avatar inisial dengan menu profil: Panel Admin (admin), Pesanan, Wishlist, Dashboard Penjual **atau** Buka Toko, AI Assistant, Profil, Keluar); drawer mobile mengikuti aturan yang sama; mobile ≤760 px: header ringkas + drawer + bottom nav 5 tab (Beranda, Jelajahi, Sortir AI, Jual, Akun) yang disembunyikan di checkout. Toast dengan aksi (Lihat/Urungkan) di `aria-live`. Modal: fokus pertama otomatis, Esc menutup, fokus kembali ke pemicu, jadi bottom sheet di mobile. Tidak boleh ada tombol mati: aksi yang belum ada backend-nya menampilkan toast yang jujur ("… belum tersedia di prototipe" / "(simulasi)").

## 6. Aksesibilitas dan responsif

- Elemen asli: `<button>`, `<a href>`, `<input>` + `<label>`. Ikon-saja wajib `aria-label`. `aria-pressed` untuk toggle, `aria-current` untuk navigasi aktif, `role="meter"` untuk keyakinan, `role="alert"` untuk galat.
- Kontras teks minimal 4,5:1, target sentuh minimal 44 px, hormati `prefers-reduced-motion`.
- Breakpoint seperti `styles.css`: 1180, 1024, 900, 760 px. Uji di 1440 px dan 390 px.

## 7. Larangan

- Jangan menambah angka dampak lingkungan, statistik, atau testimoni yang tidak ada di prototipe.
- Jangan mengklaim AI sudah menganalisis foto sungguhan atau pembayaran sudah diproses. Nomor VA dan QR wajib berlabel contoh.
- Auth di fase ini adalah **mock** di `auth.service.ts` memakai `accounts-demo.json`; jangan pernah menyimpan kata sandi di store/localStorage, dan tandai jelas titik penggantinya ke Supabase Auth (signUp + verifyOtp, signInWithPassword, resetPasswordForEmail, updateUser).
- Jangan mengganti palet, font, atau copy. Jangan pakai gradien dekoratif, glassmorphism, atau emoji.
- Catatan bug yang sudah diperbaiki di prototipe: reset tombol harus berspesifisitas rendah (`:where(...)`) supaya padding `.btn`, `.navlink`, dll. tidak hilang; `.hdr-actions` memakai `margin-left: auto` agar ikon header di mobile rata kanan.

## 8. Urutan kerja

Kerjakan per fase. Di akhir setiap fase jalankan `npm run lint`, `npx tsc --noEmit`, dan `npm run build`, perbaiki semua galat, commit, lalu tulis ringkasan singkat sebelum lanjut.

1. **Fondasi:** setup Next.js, token Tailwind, font, `globals.css`, komponen `ui/*`, layout global (header, drawer, bottom nav, footer, banner, toast, modal), salin aset, tipe data, `lib/data`, `lib/format.ts`, store Zustand.
2. **Akun & akses:** PasswordInput (ikon mata), Masuk, Daftar + OTP, Lupa kata sandi, store sesi, `middleware.ts`/guard halaman, header tamu vs masuk.
3. **Katalog:** Beranda, Jelajahi, Detail produk, Wishlist.
4. **Transaksi:** Keranjang, Checkout (bank/e-wallet), Pembayaran (hitung mundur, panduan, simulasi), Berhasil, Pesanan Saya.
5. **AI Sortir** (port `sortir-engine` + semua keadaan).
6. **AI Assistant** (port `assistant-engine`, panel melayang + halaman penuh, 3 percakapan contoh).
7. **Penjual:** Buka Toko, Jual Produk (port `listing-assist`), dan Dashboard (nama toko + status verifikasi, data per pemilik toko).
8. **Profil, Panel Admin,** dan sisa modal (laporkan, sengketa, chat penjual dengan balasan otomatis berlabel prototipe); laporan dan sengketa masuk ke Panel Admin.
9. **QA visual:** pasang Playwright, buat skrip yang menyimpan screenshot tiap halaman di 1440×900 dan 390×844 ke `qa/`, bandingkan dengan `rupa-ui-kit/design/screenshots/`, lalu perbaiki selisih tata letak yang jelas. Uji juga alur dengan keyboard saja.

## 9. Selesai jika

- Alur lengkap bisa dijalankan: tamu → daftar + OTP → buka toko → (admin) setujui toko; pembeli → keranjang → masuk → checkout VA → pembayaran → berhasil → pesanan.
- Semua halaman di bagian 5 ada, berfungsi, dan tampil sesuai prototipe di desktop dan mobile.
- Lint, typecheck, dan build bersih tanpa galat.
- Tidak ada data hardcode di komponen; semuanya lewat `lib/services`.
- `README.md` proyek menjelaskan cara menjalankan, struktur folder, dan titik sambung ke Supabase/Groq (service mana yang nanti diganti).
