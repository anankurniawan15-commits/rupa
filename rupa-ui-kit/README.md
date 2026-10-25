# Rupa — Paket UI

Paket ini berisi desain antarmuka Rupa (marketplace upcycle C2C) dalam bentuk yang bisa dibuka di browser dan dipakai Claude Code sebagai acuan membangun frontend.

## Isi paket

```
rupa-ui-kit/
├── PROMPT_CLAUDE_CODE.md     Prompt siap tempel untuk Claude Code
├── prototype/
│   ├── index.html            Prototipe interaktif lengkap (semua halaman)
│   ├── styles.css            Design token + gaya semua komponen
│   └── assets/
│       ├── brand/            rupa-logo.png, rupa-mark.png (latar transparan)
│       └── products/         8 foto produk contoh
└── design/
    ├── screenshots/desktop/  26 tangkapan layar 1440 px
    ├── screenshots/mobile/   5 tangkapan layar 390 px
    ├── data/                 Data contoh dalam JSON (produk, penjual, akun demo, pembayaran, admin, skenario AI, dll.)
    └── diagrams/             Use case, activity, class diagram, ERD, arsitektur
```

## Membuka prototipe

Klik dua kali `prototype/index.html`. Tidak perlu server; koneksi internet hanya dipakai untuk memuat Google Fonts.

Buka halaman tertentu dengan menambahkan hash di akhir alamat:

| Hash | Halaman |
|---|---|
| `#home` | Beranda |
| `#explore` | Jelajahi Produk |
| `#product` | Detail Produk |
| `#sortir` | AI Sortir Barang |
| `#assistant` | AI Assistant |
| `#sell` | Jual Produk |
| `#dash` | Dashboard Penjual |
| `#cart` / `#checkout` | Keranjang / Checkout |
| `#orders` | Pesanan Saya |
| `#profile` / `#wishlist` | Profil / Wishlist |
| `#login` / `#register` / `#forgot` | Masuk / Daftar / Lupa kata sandi |
| `#openShop` | Buka Toko |
| `#payment` | Pembayaran (tagihan contoh) |
| `#admin` | Panel Admin |

Prototipe dibuka sebagai tamu. Halaman yang butuh akun (checkout, pesanan, wishlist, jual, dashboard, pembayaran, admin) mengarahkan ke halaman Masuk lalu kembali ke halaman tujuan setelah berhasil. Jika dibuka langsung lewat hash, prototipe otomatis masuk sebagai akun demo agar halaman bisa dilihat.

| Akun demo | Email | Kata sandi |
|---|---|---|
| Pembeli & penjual (punya toko) | `dinda@contoh.id` | `rupa1234` |
| Admin | `admin@rupa.id` | `admin1234` |

Akun demo sengaja tidak ditampilkan di halaman Masuk; ketik manual dari tabel ini. Kode OTP untuk daftar dan lupa kata sandi: `123456`. Akun `tono@contoh.id` sengaja berstatus diblokir. Pembayaran memakai kontrol simulasi di halaman Pembayaran (berhasil atau kedaluwarsa).

Untuk melihat tampilan ponsel, buka DevTools (F12) lalu aktifkan mode perangkat dengan lebar 390 px.

Semua data adalah contoh. AI dan pembayaran disimulasikan, dan prototipe tidak menganalisis foto yang diunggah.

## Memakai dengan Claude Code

1. Buat folder proyek baru, misalnya `rupa-web/`.
2. Ekstrak paket ini ke dalamnya sehingga ada `rupa-web/rupa-ui-kit/`.
3. Buka terminal di `rupa-web/`, jalankan `claude`.
4. Salin isi `PROMPT_CLAUDE_CODE.md` (mulai dari bawah garis pertama) dan kirim sebagai pesan pertama.

Claude Code akan mengerjakan 9 fase dan menjalankan lint, typecheck, dan build di akhir setiap fase. Folder `rupa-ui-kit/` hanya acuan; aset yang dibutuhkan akan disalin ke `public/`.

## Catatan teknis prototipe

`index.html` memakai format template sederhana: `{{ nama }}` untuk data, `<sc-if>` untuk kondisi, dan `<sc-for>` untuk perulangan. Logika ada di class `Component` (method `renderVals()`), dan sebuah runtime kecil di akhir berkas merender template dengan morphdom (lisensi MIT).
