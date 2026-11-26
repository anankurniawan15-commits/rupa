# RUPA AI — Python

Proyek ini hanya mengimplementasikan dua fitur tugas: **AI Sortir Barang** dan **AI Listing**. Antarmuka menggunakan Streamlit; seluruh logika aplikasi menggunakan Python.

## Menjalankan
Disarankan Python 3.10/3.11.

```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

Salin `.env.example` menjadi `.env`, lalu isi `GROQ_API_KEY`. Sesuaikan nama model dengan model yang tersedia pada akun penyedia API.

```bash
streamlit run app.py
```

## Alur AI Sortir
- Foto dianalisis oleh model vision Qwen2.5-VL melalui API kompatibel OpenAI.
- Deskripsi dianalisis oleh model teks.
- Hasil mencakup kategori material, perkiraan komposisi, kondisi yang terlihat, batasan analisis, peringatan keamanan, langkah awal, tiga ide upcycle, dan kata kunci pencarian.
- LLM tidak diminta mengarang confidence. Confidence berasal dari EfficientNet-B0 yang dilatih dengan dataset material dan dikalibrasi menggunakan temperature scaling.
- Jika classifier belum dilatih, input berupa teks, confidence kurang dari 60%, atau model berbeda pendapat, pengguna diminta memilih material secara manual.
- Peringatan keamanan menggunakan aturan kata kunci, bukan sertifikasi keselamatan.

### Dataset classifier
Buat folder:
```text
data/materials/
  Tekstil/
  Plastik/
  Kertas/
  Kaca/
  Logam/
  Kayu/
  Karet/
  Lainnya - Campuran/
```
Isi setiap folder dengan gambar sesuai label, lalu jalankan:
```bash
python train_classifier.py
```
Model tersimpan di `models/`.

Dataset perlu diperiksa dan diseragamkan labelnya. Hindari data leakage: foto dari barang yang sama jangan sampai masuk ke train dan validation/test. Skrip training ini baseline pembelajaran; evaluasi test, confusion matrix, precision, recall, accuracy, dan calibration error tetap perlu dilakukan.

## Alur AI Listing
Model teks menyarankan judul, kategori, tag, deskripsi, dan kata kunci. Semua kolom dapat diedit. Pemeriksaan klaim menggunakan aturan awal. Referensi harga tidak ditampilkan karena belum ada database listing pembanding; sesuai rancangan RUPA, fitur harga baru boleh aktif jika tersedia minimal tiga listing pembanding yang valid.

## Batasan
- Belum terhubung ke database/katalog, akun, kreator, atau penyimpanan histori RUPA.
- Link produk serupa/kreator belum ditampilkan karena katalog belum terintegrasi.
- Target analisis maksimal 15 detik perlu diuji pada deployment sebenarnya; bukan jaminan dari kode.
- Foto tidak dapat memastikan komposisi kimia, kontaminasi, kekuatan struktur, atau kelayakan daur ulang.
- Pastikan model API yang dipilih mendukung input gambar dan format respons JSON.
"# Projek_Rupa_AI" 
