"""
AI Listing Barang RUPA
Groq Text + Gemini Fallback
Claim Review Gate + Price Comparables Gate.

Tugas:
1. Membuat judul produk.
2. Membuat alternatif judul.
3. Menentukan kategori produk.
4. Membuat tag material.
5. Membuat deskripsi produk.
6. Menghasilkan kata kunci.
7. Menjalankan Safety Gate.
8. Menjalankan Claim Review Gate.
9. Menyiapkan Price Comparables Gate.

Groq menjadi provider utama.
Gemini menjadi provider cadangan otomatis.

Tidak membuat referensi harga secara otomatis.
"""

import os
import json

from dotenv import load_dotenv
from groq import Groq
from google import genai
from google.genai import types

from python_ai.config import settings
from python_ai.llm import _gemini_pool, _groq_pool, classify_exception_cooldown
from python_ai.safety import (
    safety_warnings,
    check_listing_claims
)

# ============================================================
# 1. KONFIGURASI
# ============================================================

load_dotenv()

# Groq - Provider utama
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

GROQ_TEXT_MODEL = os.getenv(
    "GROQ_TEXT_MODEL",
    "qwen/qwen3.8-27b"
)

# Gemini - Provider cadangan
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

GEMINI_TEXT_MODEL = os.getenv(
    "GEMINI_TEXT_MODEL",
    "gemini-3.8-flash"
)


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
# 2. VALIDASI RESPONS JSON
# ============================================================

def parse_listing_response(response_text: str) -> dict:
    """
    Mengubah respons AI menjadi dictionary JSON
    dan memastikan struktur respons valid.
    """

    if not response_text:
        raise ValueError(
            "AI tidak menghasilkan respons."
        )

    response_text = response_text.strip()

    # Menghapus markdown code fence jika ada
    if response_text.startswith("```"):
        response_text = (
            response_text
            .replace("```json", "", 1)
            .replace("```", "")
            .strip()
        )

    try:
        data = json.loads(response_text)

    except json.JSONDecodeError:
        start = response_text.find("{")
        end = response_text.rfind("}")
        if start != -1 and end > start:
            try:
                data = json.loads(response_text[start : end + 1])
            except json.JSONDecodeError:
                raise ValueError(
                    "Respons AI bukan JSON yang valid."
                )
        else:
            raise ValueError(
                "Respons AI bukan JSON yang valid."
            )

    if not isinstance(data, dict):
        raise ValueError(
            "Struktur respons AI tidak valid."
        )

    required_fields = [
        "title",
        "titles",
        "category",
        "material_tags",
        "description",
        "keywords"
    ]

    for field in required_fields:
        if field not in data:
            raise ValueError(
                f"Field {field} tidak ditemukan."
            )

    if not isinstance(data["title"], str):
        raise ValueError("Format title tidak valid.")

    if not isinstance(data["titles"], list):
        raise ValueError("Format titles tidak valid.")

    if not isinstance(data["category"], str):
        raise ValueError("Format category tidak valid.")

    if not isinstance(data["material_tags"], list):
        raise ValueError("Format material_tags tidak valid.")

    if not isinstance(data["description"], str):
        raise ValueError("Format description tidak valid.")

    if not isinstance(data["keywords"], list):
        raise ValueError("Format keywords tidak valid.")

    # Membersihkan isi list
    data["titles"] = [
        str(item) for item in data["titles"]
        if isinstance(item, str)
    ]

    data["material_tags"] = [
        str(item) for item in data["material_tags"]
        if isinstance(item, str)
    ]

    data["keywords"] = [
        str(item) for item in data["keywords"]
        if isinstance(item, str)
    ]

    if not data["title"].strip():
        raise ValueError("Judul produk kosong.")

    if not data["description"].strip():
        raise ValueError("Deskripsi produk kosong.")

    return data


# ============================================================
# 3. GROQ TEXT
# ============================================================

def generate_with_groq(prompt: str) -> dict:
    """
    Membuat listing menggunakan Groq Text API (dengan rotasi key jika tersedia).
    """

    keys = _active_groq_keys()
    if not keys:
        raise RuntimeError(
            "GROQ_API_KEY belum ditemukan."
        )

    last_error: Exception | None = None
    for api_key in _groq_pool.order_keys(keys):
        try:
            client = Groq(api_key=api_key)
            response = client.chat.completions.create(
                model=GROQ_TEXT_MODEL,
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.3,
                max_completion_tokens=1500,
                response_format={
                    "type": "json_object"
                }
            )
            result = response.choices[0].message.content
            parsed = parse_listing_response(result or "")
            _groq_pool.clear(api_key)
            return parsed
        except Exception as exc:
            cd = classify_exception_cooldown(exc)
            if cd > 0:
                _groq_pool.mark_cooldown(api_key, cd)
            last_error = exc

    raise RuntimeError(str(last_error or "Groq Text gagal."))


# ============================================================
# 4. GEMINI TEXT
# ============================================================

def generate_with_gemini(prompt: str) -> dict:
    """
    Membuat listing menggunakan Gemini Text API.
    Digunakan sebagai provider cadangan (dengan rotasi key jika tersedia).
    """

    keys = _active_gemini_keys()
    if not keys:
        raise RuntimeError(
            "GEMINI_API_KEY belum ditemukan."
        )

    last_error: Exception | None = None
    for api_key in _gemini_pool.order_keys(keys):
        try:
            client = genai.Client(api_key=api_key)
            response = client.models.generate_content(
                model=GEMINI_TEXT_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.3,
                    response_mime_type="application/json"
                )
            )
            parsed = parse_listing_response(response.text or "")
            _gemini_pool.clear(api_key)
            return parsed
        except Exception as exc:
            cd = classify_exception_cooldown(exc)
            if cd > 0:
                _gemini_pool.mark_cooldown(api_key, cd)
            last_error = exc

    raise RuntimeError(str(last_error or "Gemini Text gagal."))


# ============================================================
# 5. FALLBACK GROQ KE GEMINI
# ============================================================

def generate_listing_with_fallback(
    prompt: str
) -> tuple[dict, str, str]:
    """
    Urutan provider:

    1. Mencoba Groq terlebih dahulu.
    2. Jika Groq gagal, mencoba Gemini.
    3. Jika keduanya gagal, mengembalikan error.
    """

    groq_keys = _active_groq_keys()
    gemini_keys = _active_gemini_keys()
    providers = [
        {
            "name": "Groq",
            "model": GROQ_TEXT_MODEL,
            "has_keys": bool(groq_keys),
            "healthy": _groq_pool.has_healthy_key(groq_keys),
            "function": generate_with_groq
        },
        {
            "name": "Gemini",
            "model": GEMINI_TEXT_MODEL,
            "has_keys": bool(gemini_keys),
            "healthy": _gemini_pool.has_healthy_key(gemini_keys),
            "function": generate_with_gemini
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
            result = provider["function"](prompt)

            return (
                result,
                provider["name"],
                provider["model"]
            )

        except Exception as error:

            errors.append(
                f'{provider["name"]}: {str(error)}'
            )

            continue

    raise RuntimeError(
        "Semua Text API gagal digunakan. "
        + " | ".join(errors)
    )


# ============================================================
# 6. GENERATE LISTING
# ============================================================

def generate_listing(
    name: str,
    material: str,
    condition: str,
    process: str,
    price: str | int | None = None
) -> dict:
    """
    Menghasilkan draf listing produk RUPA.

    Groq menjadi provider utama.
    Gemini digunakan sebagai fallback.

    Tidak menghasilkan referensi harga.
    """

    # --------------------------------------------------------
    # A. MEMBUAT PROMPT
    # --------------------------------------------------------

    categories = ", ".join(
        settings.sell_categories
    )

    price_input = (
        f"Rp{price}"
        if price is not None and str(price).strip()
        else "Belum ditentukan"
    )

    prompt = f"""
Anda adalah AI Listing untuk marketplace RUPA.

Buat draf listing produk yang jujur,
informatif, dan mudah dipahami.

Jangan mengarang fakta yang tidak diberikan penjual.

HINDARI KLAIM ABSOLUT:

- 100% ramah lingkungan
- Zero waste
- Bebas racun
- Antibakteri
- Aman untuk semua orang
- Klaim sertifikasi yang tidak terbukti

DATA PRODUK:

Nama: {name}
Material pilihan penjual: {material}
Kondisi: {condition}
Proses/informasi: {process or "Tidak diberikan"}
Harga input penjual: {price_input}

KATEGORI PRODUK YANG DIPERBOLEHKAN:

{categories}

ATURAN:

1. Buat judul maksimal 70 karakter.
2. Buat 3 judul alternatif.
3. Pilih kategori dari daftar yang tersedia.
4. Buat tag material yang sesuai dengan informasi penjual.
5. Buat deskripsi produk menggunakan bahasa Indonesia sederhana.
6. Gunakan kondisi produk sesuai informasi yang diberikan.
7. Jangan mengarang ukuran, merek, sertifikasi, atau spesifikasi.
8. Jangan menambahkan klaim keamanan atau lingkungan tanpa bukti.
9. Jangan membuat estimasi atau referensi harga.
10. Harga hanya merupakan informasi input penjual,
    bukan dasar untuk membuat harga pembanding.

KEMBALIKAN HANYA JSON VALID:

{{
    "title": "judul singkat maksimal 70 karakter",
    "titles": [
        "judul alternatif 1",
        "judul alternatif 2",
        "judul alternatif 3"
    ],
    "category": "kategori produk",
    "material_tags": [
        "tag material"
    ],
    "description": "deskripsi produk",
    "keywords": [
        "kata kunci"
    ]
}}
"""

    # --------------------------------------------------------
    # B. GENERATE DENGAN FALLBACK
    # --------------------------------------------------------

    result, provider_name, model_name = (
        generate_listing_with_fallback(
            prompt
        )
    )

    # --------------------------------------------------------
    # C. VALIDASI DATA TAMBAHAN
    # --------------------------------------------------------

    result.setdefault(
        "title",
        name
    )

    result.setdefault(
        "titles",
        [result["title"]]
    )

    result.setdefault(
        "category",
        material
    )

    result.setdefault(
        "material_tags",
        [material.lower()] if material else ["upcycle"]
    )

    result.setdefault(
        "description",
        process or ""
    )

    result.setdefault(
        "keywords",
        [
            word.lower()
            for word in [name, material]
            if word
        ]
    )

    # --------------------------------------------------------
    # D. SAFETY GATE
    # --------------------------------------------------------

    text = " ".join([
        str(result.get("title", "")),
        str(result.get("description", "")),
        " ".join(result.get("material_tags", []))
    ])

    result["safety_warnings"] = safety_warnings(
        text
    )

    # --------------------------------------------------------
    # E. CLAIM REVIEW GATE
    # --------------------------------------------------------

    result["claim_warnings"] = check_listing_claims(
        text
    )

    result["needs_claim_review"] = bool(
        result["claim_warnings"]
        or result["safety_warnings"]
    )

    # --------------------------------------------------------
    # F. PRICE COMPARABLES GATE
    # --------------------------------------------------------

    result["price_comparisons"] = []

    result["price_reference_status"] = (
        f"Membutuhkan minimal "
        f"{settings.min_price_comparables} "
        f"listing pembanding valid."
    )

    # --------------------------------------------------------
    # G. INFORMASI PROVIDER
    # --------------------------------------------------------

    result["text_provider"] = provider_name

    result["text_model"] = model_name

    result["crisp_dm_version"] = (
        settings.crisp_dm_version
    )

    return result
