"""Konfigurasi RUPA AI + Definisi Phase 1 CRISP-DM (Business Understanding)."""
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()
load_dotenv(".env.local", override=False)


class Settings:
    # ==========================================================
    # CRISP-DM PHASE 1: BUSINESS UNDERSTANDING & SUCCESS CRITERIA
    # ==========================================================
    crisp_dm_version: str = "1.0-crispdm"
    confidence_threshold: float = float(os.getenv("CONFIDENCE_THRESHOLD", "60"))
    min_macro_f1_target: float = 0.70
    max_ece_target: float = 0.12
    min_price_comparables: int = 3
    request_timeout: int = int(os.getenv("REQUEST_TIMEOUT", "12"))

    # ==========================================================
    # MODEL COMPUTER VISION (JURNAL INTERNASIONAL / CRISP-DM)
    # ==========================================================
    # Pilihan backbone: efficientnet_v2_s (default), efficientnet_b0,
    # convnext_tiny, resnet50, mobilenet_v3_large
    vision_backbone: str = os.getenv("VISION_BACKBONE", "efficientnet_v2_s").strip().lower()

    # ==========================================================
    # KONFIGURASI LLM TEKS OPSIONAL (HANYA UNTUK SARAN TEKS / COPYWRITING)
    # ==========================================================
    api_key: str = os.getenv("GROQ_API_KEY", "")
    base_url: str = os.getenv("OPENAI_COMPATIBLE_BASE_URL", "https://api.groq.com/openai/v1")
    default_text_model: str = "openai/gpt-oss-120b"
    gemini_text_model: str = os.getenv("GEMINI_TEXT_MODEL", "gemini-4-hydrogen").strip() or "gemini-4-hydrogen"

    @staticmethod
    def _collect_keys(prefix: str) -> list[str]:
        seen: set[str] = set()
        out: list[str] = []
        raw_sources = [os.getenv(f"{prefix}_API_KEYS", ""), os.getenv(f"{prefix}_API_KEY", "")]
        raw_sources.extend(os.getenv(f"{prefix}_API_KEY_{i}", "") for i in range(1, 21))
        for raw in raw_sources:
            for part in raw.replace(",", " ").replace(";", " ").split():
                k = part.strip()
                if k and k not in seen:
                    seen.add(k)
                    out.append(k)
        return out

    @property
    def groq_api_keys(self) -> list[str]:
        return self._collect_keys("GROQ")

    @property
    def gemini_api_keys(self) -> list[str]:
        return self._collect_keys("GEMINI")

    @property
    def text_model(self) -> str:
        explicit = os.getenv("GROQ_CHAT_MODEL", "").strip()
        if explicit:
            return explicit
        legacy = os.getenv("TEXT_MODEL", "").strip()
        if not legacy:
            return self.default_text_model
        if "api.groq.com" in self.base_url and legacy == "llama-3.3-70b-versatile":
            return self.default_text_model
        return legacy

    # ==========================================================
    # KONFIGURASI ARTIFACT MODEL & DATA (PHASE 2-6)
    # ==========================================================
    raw_dir: Path = Path(os.getenv("RAW_DATA_DIR", "data/raw"))
    materials_dir: Path = Path(os.getenv("MATERIALS_DIR", "data/materials"))
    processed_dir: Path = Path(os.getenv("PROCESSED_DATA_DIR", "data/processed"))
    database_path: Path = Path(os.getenv("DATABASE_PATH", "data/rupa.db"))

    model_dir: Path = Path(os.getenv("MODEL_DIR", "models"))
    model_path: Path = Path(os.getenv("CLASSIFIER_PATH", "models/material_classifier.pt"))
    labels_path: Path = Path(os.getenv("LABELS_PATH", "models/material_labels.json"))
    metadata_path: Path = Path(os.getenv("METADATA_PATH", "models/model_metadata.json"))
    data_report_path: Path = Path("models/crisp_dm_data_report.json")
    eval_report_path: Path = Path("models/evaluation_report.json")

    material_categories = [
        "Tekstil",
        "Plastik",
        "Kertas",
        "Kaca",
        "Logam",
        "Kayu",
        "Karet",
        "Lainnya / Campuran",
        "Tidak Diketahui",
    ]

    sell_categories = [
        "Tas dan Dompet",
        "Pakaian",
        "Aksesori",
        "Dekorasi Rumah",
        "Furnitur",
        "Organizer dan Alat Tulis",
        "Bahan dan Material",
    ]


settings = Settings()
