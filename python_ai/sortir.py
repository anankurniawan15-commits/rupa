"""
AI Sortir Barang RUPA
Image Classification menggunakan Groq Vision API
dengan Gemini Vision API sebagai fallback.

Tugas:
1. Menganalisis gambar barang bekas.
2. Mengidentifikasi jenis barang.
3. Memperkirakan material penyusun.
4. Mengidentifikasi kondisi yang terlihat.
5. Memberikan confidence score.
6. Menjalankan Safety Gate.
7. Meminta verifikasi manual jika confidence < 60%.

Groq menjadi provider utama.
Gemini menjadi provider cadangan otomatis.

Tidak menggunakan model klasifikasi lokal seperti:
EfficientNetV2, ConvNeXt, atau ResNet.

Tidak menghasilkan rekomendasi upcycle atau ide DIY.
"""

import os
import json
import base64

from io import BytesIO
from PIL import Image, ImageOps, UnidentifiedImageError

from groq import Groq
from google import genai
from google.genai import types

from dotenv import load_dotenv

from python_ai.config import settings
from python_ai.llm import _gemini_pool, _groq_pool, classify_exception_cooldown
from python_ai.safety import safety_warnings


# ============================================================
# 1. KONFIGURASI
# ============================================================

load_dotenv()

# Groq - Provider utama
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

GROQ_VISION_MODEL = os.getenv(
    "GROQ_VISION_MODEL",
    "qwen/qwen3.8-27b"
)

# Gemini - Provider cadangan
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

GEMINI_VISION_MODEL = os.getenv(
    "GEMINI_VISION_MODEL",
    "gemini-3.8-flash"
)

# Confidence threshold
CONFIDENCE_THRESHOLD = float(
    os.getenv(
        "VISION_CONFIDENCE_THRESHOLD",
        getattr(settings, "confidence_threshold", 60.0)
    )
)

MAX_IMAGE_SIZE_MB = 10


def _split_raw_keys(raw: str | None) -> list[str]:
    if not raw:
        return []
    return [p.strip() for p in raw.replace(",", " ").replace(";", " ").split() if p.strip()]


def _active_groq_keys() -> list[str]:
    keys = list(settings.groq_api_keys)
    for k in reversed(_split_raw_keys(GROQ_API_KEY)):
        if k not in keys:
            keys.insert(0, k)
    return keys


def _active_gemini_keys() -> list[str]:
    keys = list(settings.gemini_api_keys)
    for k in reversed(_split_raw_keys(GEMINI_API_KEY)):
        if k not in keys:
            keys.insert(0, k)
    return keys


# ============================================================
# 2. KATEGORI MATERIAL
# ============================================================

MATERIAL_CATEGORIES = [
    "Tekstil",
    "Plastik",
    "Kertas",
    "Kaca",
    "Logam",
    "Kayu",
    "Karet",
    "Lainnya / Campuran"
]


# ============================================================
# 3. VALIDASI DAN PERSIAPAN GAMBAR
# ============================================================

def prepare_image(image_bytes: bytes) -> bytes:
    """
    Memvalidasi gambar dan mengubahnya menjadi JPEG.
    Hasil gambar digunakan oleh Groq maupun Gemini.
    """

    if not image_bytes:
        raise ValueError("File gambar kosong.")

    image_size_mb = len(image_bytes) / (1024 * 1024)

    if image_size_mb > MAX_IMAGE_SIZE_MB:
        raise ValueError(
            f"Ukuran gambar maksimal {MAX_IMAGE_SIZE_MB} MB."
        )

    try:
        image = Image.open(BytesIO(image_bytes))
        image.verify()

        image = Image.open(BytesIO(image_bytes))
        image = ImageOps.exif_transpose(image)
        image = image.convert("RGB")

    except (UnidentifiedImageError, OSError):
        raise ValueError(
            "Format gambar tidak valid atau rusak."
        )

    # Membatasi dimensi gambar
    image.thumbnail((1600, 1600))

    # Mengubah gambar menjadi JPEG
    buffer = BytesIO()

    image.save(
        buffer,
        format="JPEG",
        quality=90,
        optimize=True
    )

    return buffer.getvalue()


# ============================================================
# 4. PROMPT ANALISIS GAMBAR
# ============================================================

def build_vision_prompt(
    description: str | None = None
) -> str:
    """
    Membuat prompt yang digunakan oleh Groq dan Gemini.
    """

    return f"""
Anda adalah sistem AI Sortir Barang untuk RUPA,
platform pemanfaatan dan upcycle barang bekas.

Tugas Anda adalah menganalisis gambar barang yang diberikan.

KATEGORI MATERIAL:

{json.dumps(MATERIAL_CATEGORIES, ensure_ascii=False)}

ANALISIS YANG HARUS DILAKUKAN:

1. Identifikasi nama atau jenis barang.
2. Identifikasi material utama barang.
3. Identifikasi material tambahan jika terlihat.
4. Perkirakan komposisi material berdasarkan ciri visual.
5. Identifikasi kondisi fisik yang benar-benar terlihat.
6. Berikan estimasi confidence dari 0 sampai 100.

ATURAN ANALISIS:

- Pilih satu kategori material utama dari daftar.
- Gunakan "Lainnya / Campuran" jika barang memiliki
  beberapa material atau material tidak dapat dipastikan.
- Jangan menganggap jenis barang sama dengan materialnya.
- Contoh: sepatu dapat terdiri dari tekstil, karet,
  kulit sintetis, dan logam.
- Contoh: tas dapat terdiri dari kain, kulit sintetis,
  plastik, dan logam.
- Contoh: furnitur dapat terdiri dari kayu, logam,
  plastik, atau material gabungan.
- Jangan menyatakan komposisi kimia secara pasti
  hanya berdasarkan gambar.
- Jangan mengarang kondisi yang tidak terlihat.
- Jika gambar bukan barang fisik, set supported menjadi false.
- Jika gambar buram atau objek tidak jelas,
  berikan confidence yang rendah.
- Confidence merupakan estimasi keyakinan visual,
  bukan probabilitas statistik yang sudah dikalibrasi.

CATATAN PENGGUNA:

{description.strip() if description else "Tidak ada catatan."}

FORMAT OUTPUT:

Kembalikan hanya JSON valid dengan struktur berikut:

{{
    "supported": true,
    "item_name": "nama barang",
    "material_category": "kategori material",
    "composition_estimate": "perkiraan material",
    "detected_objects": [
        "objek yang teridentifikasi"
    ],
    "visible_conditions": [
        "kondisi yang terlihat"
    ],
    "confidence": 85,
    "warnings": []
}}
"""


# ============================================================
# 5. KLASIFIKASI MENGGUNAKAN GROQ VISION
# ============================================================

def classify_image_groq(
    image_bytes: bytes,
    prompt: str
) -> dict:
    """
    Menganalisis gambar menggunakan Groq Vision API (dengan rotasi key jika tersedia).
    """

    keys = _active_groq_keys()
    if not keys:
        raise RuntimeError(
            "GROQ_API_KEY belum ditemukan."
        )

    image_url = (
        "data:image/jpeg;base64,"
        + base64.b64encode(image_bytes).decode("utf-8")
    )

    last_error: Exception | None = None
    for api_key in _groq_pool.order_keys(keys):
        try:
            client = Groq(api_key=api_key)
            response = client.chat.completions.create(
                model=GROQ_VISION_MODEL,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": prompt
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": image_url
                                }
                            }
                        ]
                    }
                ],
                temperature=0.2,
                max_completion_tokens=1200,
                response_format={
                    "type": "json_object"
                }
            )
            result = response.choices[0].message.content
            if not result:
                raise ValueError("Groq Vision tidak menghasilkan respons.")
            data = json.loads(result)
            if not isinstance(data, dict):
                raise ValueError("Struktur respons Groq tidak valid.")
            _groq_pool.clear(api_key)
            return data
        except Exception as exc:
            cd = classify_exception_cooldown(exc)
            if cd > 0:
                _groq_pool.mark_cooldown(api_key, cd)
            last_error = exc

    raise RuntimeError(str(last_error or "Groq Vision gagal."))


# ============================================================
# 6. KLASIFIKASI MENGGUNAKAN GEMINI VISION
# ============================================================

def classify_image_gemini(
    image_bytes: bytes,
    prompt: str
) -> dict:
    """
    Menganalisis gambar menggunakan Gemini Vision API.
    Digunakan sebagai provider cadangan (dengan rotasi key jika tersedia).
    """

    keys = _active_gemini_keys()
    if not keys:
        raise RuntimeError(
            "GEMINI_API_KEY belum ditemukan."
        )

    image_part = types.Part.from_bytes(
        data=image_bytes,
        mime_type="image/jpeg"
    )

    last_error: Exception | None = None
    for api_key in _gemini_pool.order_keys(keys):
        try:
            client = genai.Client(api_key=api_key)
            response = client.models.generate_content(
                model=GEMINI_VISION_MODEL,
                contents=[
                    prompt,
                    image_part
                ],
                config=types.GenerateContentConfig(
                    temperature=0.2,
                    response_mime_type="application/json"
                )
            )
            result = response.text
            if not result:
                raise ValueError("Gemini Vision tidak menghasilkan respons.")
            data = json.loads(result)
            if not isinstance(data, dict):
                raise ValueError("Struktur respons Gemini tidak valid.")
            _gemini_pool.clear(api_key)
            return data
        except Exception as exc:
            cd = classify_exception_cooldown(exc)
            if cd > 0:
                _gemini_pool.mark_cooldown(api_key, cd)
            last_error = exc

    raise RuntimeError(str(last_error or "Gemini Vision gagal."))


# ============================================================
# 7. VALIDASI HASIL PREDIKSI
# ============================================================

def validate_prediction(data: dict) -> dict:
    """
    Memastikan hasil klasifikasi sesuai struktur
    yang dibutuhkan oleh sistem RUPA.
    """

    supported = data.get("supported")

    if not isinstance(supported, bool):
        raise ValueError(
            "Nilai supported tidak valid."
        )

    if not supported:
        warnings = data.get("warnings", [])

        if not isinstance(warnings, list):
            warnings = []

        return {
            "supported": False,
            "item_name": "Objek tidak dikenali",
            "material_category": "unknown",
            "composition_estimate": (
                "Gambar tidak menunjukkan barang fisik "
                "yang dapat dianalisis."
            ),
            "detected_objects": [],
            "visible_conditions": [],
            "confidence": 0.0,
            "warnings": warnings
        }

    # Validasi kategori material
    category = data.get("material_category")

    if category not in MATERIAL_CATEGORIES:
        raise ValueError(
            "Kategori material tidak valid."
        )

    # Validasi confidence
    try:
        confidence = float(
            data.get("confidence", 0)
        )

    except (TypeError, ValueError):
        raise ValueError(
            "Nilai confidence tidak valid."
        )

    if not 0 <= confidence <= 100:
        raise ValueError(
            "Confidence harus berada pada rentang 0-100."
        )

    # Validasi nama barang
    item_name = data.get("item_name")

    if not isinstance(item_name, str) or not item_name.strip():
        item_name = (
            "Barang tidak teridentifikasi secara spesifik"
        )

    # Validasi komposisi material
    composition = data.get("composition_estimate")

    if not isinstance(composition, str) or not composition.strip():
        composition = (
            "Komposisi material belum dapat dipastikan."
        )

    # Validasi daftar objek
    detected_objects = data.get("detected_objects")

    if not isinstance(detected_objects, list):
        detected_objects = []

    detected_objects = [
        str(item)
        for item in detected_objects
        if isinstance(item, str)
    ]

    # Validasi kondisi visual
    visible_conditions = data.get("visible_conditions")

    if not isinstance(visible_conditions, list):
        visible_conditions = []

    visible_conditions = [
        str(item)
        for item in visible_conditions
        if isinstance(item, str)
    ]

    # Validasi peringatan
    warnings = data.get("warnings")

    if not isinstance(warnings, list):
        warnings = []

    warnings = [
        str(item)
        for item in warnings
        if isinstance(item, str)
    ]

    return {
        "supported": True,
        "item_name": item_name.strip(),
        "material_category": category,
        "composition_estimate": composition.strip(),
        "detected_objects": detected_objects,
        "visible_conditions": visible_conditions,
        "confidence": confidence,
        "warnings": warnings
    }


# ============================================================
# 8. FALLBACK GROQ KE GEMINI
# ============================================================

def classify_image_with_fallback(
    image_bytes: bytes,
    prompt: str
) -> tuple[dict, str, str]:
    """
    Urutan provider:

    1. Mencoba Groq terlebih dahulu.
    2. Jika Groq gagal, mencoba Gemini.
    3. Jika keduanya gagal, mengembalikan error.

    Hasil dengan confidence rendah tetap diterima
    dan diteruskan ke Safety Gate.
    """

    groq_keys = _active_groq_keys()
    gemini_keys = _active_gemini_keys()
    providers = [
        {
            "name": "Groq",
            "model": GROQ_VISION_MODEL,
            "has_keys": bool(groq_keys),
            "healthy": _groq_pool.has_healthy_key(groq_keys),
            "function": classify_image_groq
        },
        {
            "name": "Gemini",
            "model": GEMINI_VISION_MODEL,
            "has_keys": bool(gemini_keys),
            "healthy": _gemini_pool.has_healthy_key(gemini_keys),
            "function": classify_image_gemini
        }
    ]
    if not providers[0]["healthy"] and providers[1]["healthy"]:
        providers = [providers[1], providers[0]]

    errors = []

    for provider in providers:

        if not provider["has_keys"]:
            errors.append(
                f'{provider["name"]}: API key belum tersedia.'
            )
            continue

        try:
            raw_result = provider["function"](
                image_bytes,
                prompt
            )

            prediction = validate_prediction(
                raw_result
            )

            # Jika respons berhasil, langsung digunakan.
            # Confidence rendah tidak memicu fallback.
            return (
                prediction,
                provider["name"],
                provider["model"]
            )

        except Exception as error:

            errors.append(
                f'{provider["name"]}: {str(error)}'
            )

            # Melanjutkan ke provider berikutnya
            continue

    raise RuntimeError(
        "Semua Vision API gagal digunakan. "
        + " | ".join(errors)
    )


# ============================================================
# 9. SAFETY GATE
# ============================================================

def apply_safety_gate(
    prediction: dict,
    description: str | None = None
) -> dict:
    """
    Memeriksa potensi risiko berdasarkan informasi barang
    dan menentukan apakah pengguna perlu melakukan
    verifikasi material secara manual.
    """

    if not prediction.get("supported"):
        prediction["needs_manual_review"] = True
        return prediction

    evidence = " ".join([
        description or "",
        prediction.get("item_name", ""),
        prediction.get("material_category", ""),
        prediction.get("composition_estimate", ""),
        " ".join(prediction.get("detected_objects", [])),
        " ".join(prediction.get("visible_conditions", []))
    ])

    safety_result = safety_warnings(evidence)

    if not isinstance(safety_result, list):
        safety_result = []

    warnings = (
        prediction.get("warnings", [])
        + safety_result
    )

    prediction["warnings"] = list(
        dict.fromkeys(warnings)
    )

    confidence = prediction["confidence"]
    category = prediction["material_category"]

    needs_manual_review = (
        confidence < CONFIDENCE_THRESHOLD
        or category == "Lainnya / Campuran"
    )

    prediction["needs_manual_review"] = (
        needs_manual_review
    )

    return prediction


# ============================================================
# 10. ANALISIS BARANG
# ============================================================

def analyze_item(
    image_bytes: bytes | None,
    description: str | None
) -> dict:
    """
    Fungsi utama AI Sortir RUPA.

    Jika terdapat gambar:
        Groq Vision menjadi provider utama.
        Gemini Vision menjadi provider cadangan.

    Jika hanya terdapat deskripsi:
        Pengguna diminta memilih kategori material
        secara manual.
    """

    # --------------------------------------------------------
    # A. ANALISIS BERDASARKAN GAMBAR
    # --------------------------------------------------------

    if image_bytes:

        # Validasi dan persiapan gambar
        prepared_image = prepare_image(
            image_bytes
        )

        # Membuat prompt analisis
        prompt = build_vision_prompt(
            description
        )

        # Klasifikasi dengan fallback otomatis
        prediction, provider_name, model_name = (
            classify_image_with_fallback(
                prepared_image,
                prompt
            )
        )

        # Jika gambar bukan barang fisik
        if not prediction["supported"]:

            return {
                "supported": False,
                "item_name": prediction["item_name"],
                "material_category": "unknown",
                "composition_estimate": (
                    prediction["composition_estimate"]
                ),
                "visible_conditions": [],
                "limitations": [
                    "AI Sortir hanya dapat menganalisis gambar barang fisik."
                ],
                "warnings": prediction["warnings"],
                "confidence": 0,
                "needs_manual_review": True,
                "vision_provider": provider_name,
                "vision_backbone": model_name,
                "crisp_dm_version": settings.crisp_dm_version
            }

        # Menjalankan Safety Gate
        prediction = apply_safety_gate(
            prediction,
            description
        )

        limitations = [
            (
                f"Klasifikasi gambar dilakukan menggunakan "
                f"{provider_name} Vision ({model_name})."
            ),
            (
                "Confidence merupakan estimasi keyakinan model "
                "dan belum dikalibrasi secara statistik."
            ),
            (
                "Komposisi kimia, ketebalan, kebersihan, "
                "dan kekuatan struktur barang tidak dapat "
                "dipastikan hanya melalui foto."
            )
        ]

        # Menggabungkan kondisi visual dan catatan pengguna
        visible_conditions = (
            prediction["visible_conditions"].copy()
        )

        if description and description.strip():
            visible_conditions.append(
                f"Catatan pengguna: {description.strip()}"
            )

        return {
            "supported": True,
            "item_name": prediction["item_name"],
            "material_category": prediction["material_category"],
            "composition_estimate": prediction["composition_estimate"],
            "visible_conditions": visible_conditions,
            "limitations": limitations,
            "warnings": prediction["warnings"],
            "confidence": prediction["confidence"],
            "classifier_prediction": prediction["material_category"],
            "vision_provider": provider_name,
            "vision_backbone": model_name,
            "calibrated": False,
            "confidence_note": (
                "Confidence merupakan estimasi keyakinan visual "
                "dari Vision API dan bukan probabilitas "
                "yang telah dikalibrasi secara statistik."
            ),
            "needs_manual_review": prediction["needs_manual_review"],
            "detected_objects": prediction["detected_objects"],
            "crisp_dm_version": settings.crisp_dm_version
        }

    # --------------------------------------------------------
    # B. ANALISIS BERDASARKAN DESKRIPSI TEKS
    # --------------------------------------------------------

    if description and description.strip():

        safety_result = safety_warnings(
            description.strip()
        )

        if not isinstance(safety_result, list):
            safety_result = []

        return {
            "supported": True,
            "item_name": "Barang berdasarkan deskripsi pengguna",
            "material_category": "unknown",
            "composition_estimate": (
                "Material belum dapat dipastikan "
                "karena tidak terdapat gambar."
            ),
            "visible_conditions": [
                description.strip()
            ],
            "limitations": [
                "Tidak ada gambar yang dianalisis menggunakan Vision API.",
                "Identifikasi material perlu dilakukan secara manual."
            ],
            "warnings": safety_result,
            "confidence": None,
            "needs_manual_review": True,
            "vision_provider": None,
            "vision_backbone": None,
            "crisp_dm_version": settings.crisp_dm_version
        }

    # --------------------------------------------------------
    # C. INPUT KOSONG
    # --------------------------------------------------------

    raise ValueError(
        "Masukkan gambar atau deskripsi barang."
    )
