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
proxy.ts                  gating rute (Next 16 = middleware)
components/
  layout/                 Header, MobileDrawer, ProfileMenu, DemoBanner, Footer, BottomNav, AssistantLauncher
  ui/                     Button, Chip, Tag, StatusPill, Field, Input, Select, RadioCard, Switch, Stepper, Modal,
                          ConfirmDialog, Toast, Skeleton, EmptyState, Notice, WarnBox, Tabs, Placeholder, Icon
  auth/ product/ home/ sortir/ assistant/ sell/ dashboard/ checkout/ payment/ orders/ profile/ shop/ admin/
  modals/                 ChatModal, ReasonModal, ReviewModal, TextModal (dipakai lintas halaman)
lib/
  clients/                supabase.ts, groq.ts, payment-gateway.ts  (STUB — belum dipakai)
  services/               satu-satunya akses data dari komponen (async + hook reaktif)
  ai/                     assistant-engine.ts, sortir-engine.ts, listing-assist.ts (port dari prototipe)
  data/                   JSON contoh dari rupa-ui-kit/design/data + konten editorial beranda
  store/                  Zustand: session, cart, wishlist, chat, sortir, sell, toast, db (database mock)
  validation.ts format.ts
types/                    user, product, order, payment, social, ai
qa/                       skrip screenshot Playwright
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
| `assistant.service.ts` | mesin aturan `lib/ai/assistant-engine.ts` | Groq chat + pencarian katalog Supabase |
| `listing-assist.service.ts` | saran judul/deskripsi berbasis aturan | Groq chat; `claimsFlags` tetap lokal |
| `profile.service.ts`, `seller.service.ts` | store `db` | tabel `profiles`, `addresses`, `messages` (Realtime) |

Variabel lingkungan yang nanti dibutuhkan (`.env.local`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `GROQ_API_KEY`, `PAYMENT_SERVER_KEY`.

## Catatan keamanan mock

- Kata sandi **tidak pernah** disimpan di store atau localStorage. Kata sandi akun baru / hasil reset hanya ada di memori `auth.service.ts` dan hilang saat halaman dimuat ulang.
- Karena ini mock di sisi klien, file `accounts-demo.json` ikut terbundel ke browser. Ini hanya untuk demo; di produksi kredensial ditangani Supabase Auth di server.
- Gating di `proxy.ts` dan `components/auth/Guard.tsx` hanya pemeriksaan optimistis; otorisasi sebenarnya harus di server/RLS.
