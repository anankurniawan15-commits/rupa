import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()


class Settings:

    # ==========================================
    # KONFIGURASI API GROQ
    # ==========================================

    api_key = os.getenv("GROQ_API_KEY", "")

    base_url = os.getenv(
        "OPENAI_COMPATIBLE_BASE_URL",
        "https://api.groq.com/openai/v1"
    )

    vision_model = os.getenv(
        "VISION_MODEL",
        "qwen/qwen2.5-vl-7b-instruct"
    )

    text_model = os.getenv(
        "TEXT_MODEL",
        "llama-3.3-70b-versatile"
    )

    # ==========================================
    # KONFIGURASI MODEL CLASSIFIER
    # ==========================================

    model_path = Path(
        os.getenv(
            "CLASSIFIER_PATH",
            "models/material_classifier.pth"
        )
    )

    labels_path = Path(
        os.getenv(
            "LABELS_PATH",
            "models/material_labels.json"
        )
    )

    threshold = float(
        os.getenv("CONFIDENCE_THRESHOLD", "60")
    )

    timeout = int(
        os.getenv("REQUEST_TIMEOUT", "12")
    )

    # ==========================================
    # DATASET KAGGLE
    # ==========================================

    kaggle_datasets = [
        "joebeachcapital/realwaste",
        "sumn2u/garbage-classification-v2"
    ]

    # ==========================================
    # DATASET GITHUB
    # ==========================================

    github_datasets = {
        "trashnet": "https://github.com/garythung/trashnet.git",
        "taco": "https://github.com/pedropro/TACO.git",
        "deepfashion2": "https://github.com/switchablenorms/DeepFashion2.git"
    }

    # ==========================================
    # KATEGORI MATERIAL RUPA
    # ==========================================

    material_categories = [
        "Tekstil",
        "Plastik",
        "Kertas",
        "Kaca",
        "Logam",
        "Kayu",
        "Karet",
        "Lainnya/Campuran",
        "Tidak Diketahui"
    ]

    # ==========================================
    # LOKASI PENYIMPANAN DATA
    # ==========================================

    raw_dir = Path("data/raw")
    processed_dir = Path("data/processed")
    database_path = Path("data/rupa.db")


settings = Settings()