# RUPA AI — Pipeline CRISP-DM (AI Sortir & AI Listing)

Folder ini mengimplementasikan **6 fase CRISP-DM** untuk model AI Sortir Barang dan AI Listing RUPA:

1. **Business Understanding** (`config.py`, `crisp_dm_pipeline.py`): target Macro-F1 `>= 0.70`, ECE kalibrasi `<= 0.12`, ambang verifikasi manual `< 60%`, aturan keamanan, dan larangan klaim lingkungan mutlak.
2. **Data Understanding** (`phase_2_data_understanding`): audit distribusi kelas, deteksi gambar rusak/corrupt, rasio imbalance, dan deteksi hash duplikat lintas kelas (`models/crisp_dm_data_report.json`).
3. **Data Preparation** (`phase_3_data_preparation`): deduplikasi bebas leakage, `StratifiedGroupKFold` (Train ~64% / Val ~16% / Test ~20%), class weights, dan augmentasi gambar.
4. **Modeling** (`phase_4_modeling`): transfer learning CNN arsitektur jurnal internasional — `EfficientNetV2-S` (Tan & Le, ICML 2021 — default), `EfficientNet-B0` (Tan & Le, ICML 2019), `ConvNeXt-Tiny` (Liu et al., CVPR 2022), `ResNet-50` (He et al., CVPR 2016), atau `MobileNetV3-Large` (Howard et al., ICCV 2019) — dengan best validation checkpoint, early stopping, dan kalibrasi probabilitas **Temperature Scaling**.
5. **Evaluation** (`phase_5_evaluation`): evaluasi menyeluruh pada **Test Set** terpisah (Accuracy, Macro-F1, Confusion Matrix, ECE sebelum vs sesudah kalibrasi, serta Selective Accuracy pada ambang 60%) disimpan ke `models/evaluation_report.json`.
6. **Deployment** (`classifier.py`, `sortir.py`, `listing.py`, `server.py`): klasifikasi gambar berjalan **100% di Computer Vision lokal (tanpa Vision LLM Groq/Gemini)** dan disambungkan ke web Next.js melalui FastAPI (`PYTHON_AI_URL=http://127.0.0.1:8000`). Web Next.js sendiri juga memiliki fallback CV bawaan (`ConvNeXt-Tiny + SigLIP-ViT-B/16`).

## Cara Menjalankan di Terminal VS Code

1. Buat & aktifkan virtual environment Python:
   ```bash
   python -m venv venv
   # Windows:
   venv\Scripts\activate
   # macOS/Linux:
   source venv/bin/activate
   pip install -r python_ai/requirements.txt
   ```

2. Siapkan dataset di `data/materials/<NamaKelas>/*.jpg`, lalu jalankan training & evaluasi CRISP-DM:
   ```bash
   python -m python_ai.crisp_dm_pipeline
   ```

3. Jalankan server API Python CRISP-DM:
   ```bash
   uvicorn python_ai.server:app --host 127.0.0.1 --port 8000
   ```

4. Tambahkan baris ini di `.env.local` pada proyek web RUPA agar Next.js otomatis memakai backend CRISP-DM Python saat server Python aktif, dan gunakan pool rotasi key untuk teks saran Groq/Gemini:
   ```env
   PYTHON_AI_URL=http://127.0.0.1:8000
   GROQ_API_KEYS=kunci_groq_1,kunci_groq_2
   GEMINI_API_KEYS=kunci_gemini_1,kunci_gemini_2
   ```
