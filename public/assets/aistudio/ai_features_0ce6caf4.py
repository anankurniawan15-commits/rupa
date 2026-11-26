import json
import sqlite3
from pathlib import Path

import torch
from PIL import Image
from torchvision import models, transforms
from openai import OpenAI

from .config import settings


# ==========================================================
# 1. KONEKSI AI GROQ
# ==========================================================

client = OpenAI(
    api_key=settings.api_key,
    base_url=settings.base_url,
    timeout=settings.timeout
)


# ==========================================================
# 2. KONFIGURASI MODEL EFFICIENTNET-B0
# ==========================================================

_classifier = None
_class_labels = None

IMAGE_TRANSFORM = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
])


def load_classifier():
    global _classifier, _class_labels

    if _classifier is not None:
        return _classifier, _class_labels

    model_path = Path(settings.model_path)
    labels_path = Path(settings.labels_path)

    if not model_path.exists():
        raise FileNotFoundError(
            f"Model classifier tidak ditemukan: {model_path}"
        )

    if not labels_path.exists():
        raise FileNotFoundError(
            f"File label tidak ditemukan: {labels_path}"
        )

    # Membaca label kelas
    with open(labels_path, "r", encoding="utf-8") as file:
        labels_data = json.load(file)

    if isinstance(labels_data, list):
        labels = labels_data

    elif isinstance(labels_data, dict):
        if "classes" in labels_data:
            labels = labels_data["classes"]

        else:
            try:
                labels = [
                    value for key, value in sorted(
                        labels_data.items(),
                        key=lambda item: int(item[0])
                    )
                ]

            except (ValueError, TypeError):
                labels = list(labels_data.values())

    else:
        raise ValueError("Format file label tidak valid.")

    # Membuat arsitektur EfficientNet-B0
    model = models.efficientnet_b0(weights=None)

    in_features = model.classifier[1].in_features

    model.classifier[1] = torch.nn.Linear(
        in_features,
        len(labels)
    )

    # Memuat bobot model
    try:
        checkpoint = torch.load(
            model_path,
            map_location="cpu",
            weights_only=True
        )

    except TypeError:
        checkpoint = torch.load(
            model_path,
            map_location="cpu"
        )

    # Mendukung beberapa format checkpoint
    if isinstance(checkpoint, dict):
        if "model_state_dict" in checkpoint:
            state_dict = checkpoint["model_state_dict"]

        elif "state_dict" in checkpoint:
            state_dict = checkpoint["state_dict"]

        else:
            state_dict = checkpoint

    else:
        raise ValueError(
            "Format checkpoint model tidak didukung."
        )

    # Menghapus prefix module. jika model dilatih menggunakan DataParallel
    state_dict = {
        key.replace("module.", "", 1): value
        for key, value in state_dict.items()
    }

    model.load_state_dict(state_dict)

    model.eval()

    _classifier = model
    _class_labels = labels

    return _classifier, _class_labels


# ==========================================================
# 3. EKSTRAK JSON DARI RESPONS AI
# ==========================================================

def extract_json(response_text):

    if not response_text:
        raise ValueError("Respons AI kosong.")

    cleaned = response_text.strip()

    # Menghapus format Markdown
    if cleaned.startswith("```"):
        cleaned = cleaned.replace("```json", "", 1)
        cleaned = cleaned.replace("```", "").strip()

    try:
        return json.loads(cleaned)

    except json.JSONDecodeError:

        start = cleaned.find("{")
        end = cleaned.rfind("}")

        if start != -1 and end != -1:
            try:
                return json.loads(
                    cleaned[start:end + 1]
                )

            except json.JSONDecodeError:
                pass

        raise ValueError(
            "Respons AI bukan JSON yang valid."
        )


# ==========================================================
# 4. ANALISIS GAMBAR AI SORTIR
# ==========================================================

def analyze_image(image_path):

    image_path = Path(image_path)

    if not image_path.exists():
        raise FileNotFoundError(
            f"Gambar tidak ditemukan: {image_path}"
        )

    # Memuat model lokal
    model, labels = load_classifier()

    # Membuka dan memproses gambar
    image = Image.open(image_path).convert("RGB")

    image_tensor = IMAGE_TRANSFORM(image)
    image_tensor = image_tensor.unsqueeze(0)

    # Melakukan prediksi
    with torch.inference_mode():

        outputs = model(image_tensor)

        probabilities = torch.softmax(
            outputs,
            dim=1
        )

        confidence, predicted_index = torch.max(
            probabilities,
            dim=1
        )

    predicted_material = labels[
        predicted_index.item()
    ]

    confidence_score = confidence.item() * 100

    # Memeriksa tingkat keyakinan model
    if confidence_score < settings.threshold:
        material = "Tidak Diketahui"
        verification_required = True

    else:
        material = predicted_material
        verification_required = False

    # Hasil klasifikasi
    result = {
        "item_name": "Barang belum teridentifikasi",

        "material": material,

        "predicted_material": predicted_material,

        "confidence": round(
            confidence_score,
            2
        ),

        "material_details": (
            f"Model memprediksi material "
            f"{predicted_material}."
        ),

        "condition": "Perlu pemeriksaan manual",

        "visual_observations": [],

        "warnings": [
            "Hasil klasifikasi merupakan prediksi model "
            "dan perlu diperiksa kembali."
        ],

        "recommended_action": (
            "Periksa kondisi barang secara langsung "
            "sebelum digunakan atau diolah."
        ),

        "upcycle_ideas": [],

        "search_keywords": (
            [predicted_material]
            if material != "Tidak Diketahui"
            else []
        ),

        "verification_required": verification_required,

        "classification_method": "EfficientNet-B0 lokal"
    }

    return result


# ==========================================================
# 5. ANALISIS DESKRIPSI AI SORTIR
# ==========================================================

def analyze_description(description):

    prompt = f"""
    Anda adalah AI Sortir Barang pada aplikasi RUPA.

    Analisis barang berdasarkan deskripsi pengguna.

    Deskripsi:
    {description}

    Kategori material:
    {settings.material_categories}

    Keluarkan JSON dengan struktur:

    {{
        "item_name": "",
        "material": "",
        "material_details": "",
        "condition": "",
        "visual_observations": [],
        "warnings": [],
        "recommended_action": "",
        "upcycle_ideas": [
            {{
                "idea": "",
                "description": ""
            }}
        ],
        "search_keywords": []
    }}

    Ketentuan:
    - Jangan menebak informasi yang tidak diberikan.
    - Jika material belum jelas, gunakan
      "Tidak Diketahui".
    - Berikan maksimal 3 ide upcycle.
    - Pisahkan fakta dari perkiraan.
    - Jangan menganggap barang aman tanpa pemeriksaan.
    """

    response = client.chat.completions.create(
        model=settings.text_model,
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0.2
    )

    return extract_json(
        response.choices[0].message.content
    )


# ==========================================================
# 6. PERINGATAN KEAMANAN BERBASIS ATURAN
# ==========================================================

SAFETY_KEYWORDS = {

    "tajam": [
        "pecahan kaca",
        "ujung tajam",
        "logam tajam",
        "pecah"
    ],

    "kotor": [
        "berlumpur",
        "berjamur",
        "kotor",
        "berbau"
    ],

    "bahan kimia": [
        "bahan kimia",
        "pestisida",
        "oli",
        "cat",
        "pelarut"
    ],

    "elektronik": [
        "baterai bocor",
        "kabel terkelupas",
        "komponen elektronik rusak"
    ]

}


def check_safety(text):

    text = str(text).lower()

    warnings = []

    for category, keywords in SAFETY_KEYWORDS.items():

        for keyword in keywords:

            if keyword in text:

                warnings.append({
                    "category": category,

                    "detected_keyword": keyword,

                    "message": (
                        f"Perlu pemeriksaan lebih lanjut: "
                        f"{category}."
                    )
                })

    return warnings


# ==========================================================
# 7. REFERENSI BERDASARKAN MATERIAL
# ==========================================================

def get_material_references(material):

    if not material or material == "Tidak Diketahui":
        return []

    connection = None

    try:

        connection = sqlite3.connect(
            settings.database_path
        )

        cursor = connection.cursor()

        cursor.execute("""
            SELECT
                source,
                title,
                description,
                material,
                category,
                source_url,
                instructions

            FROM rupa_data

            WHERE material = ?
            OR category LIKE ?

            LIMIT 20

        """, (
            material,
            f"%{material}%"
        ))

        rows = cursor.fetchall()

        return [
            {
                "source": row[0],
                "title": row[1],
                "description": row[2],
                "material": row[3],
                "category": row[4],
                "url": row[5],
                "instructions": row[6]
            }
            for row in rows
        ]

    except sqlite3.Error as error:

        print(
            f"Gagal mengambil referensi material: {error}"
        )

        return []

    finally:

        if connection:
            connection.close()


# ==========================================================
# 8. PROSES UTAMA AI SORTIR
# ==========================================================

def ai_sortir(image_path=None, description=None):

    if not image_path and not description:
        raise ValueError(
            "Masukkan gambar atau deskripsi barang."
        )

    # Jika gambar tersedia, gunakan model lokal
    if image_path:

        result = analyze_image(image_path)

        # Jika deskripsi juga tersedia,
        # gunakan Groq untuk melengkapi informasi barang
        if description:

            description_result = analyze_description(
                description
            )

            result["item_name"] = (
                description_result.get("item_name")
                or result["item_name"]
            )

            result["material_details"] = (
                description_result.get("material_details")
                or result["material_details"]
            )

            result["condition"] = (
                description_result.get("condition")
                or result["condition"]
            )

            result["recommended_action"] = (
                description_result.get("recommended_action")
                or result["recommended_action"]
            )

            result["upcycle_ideas"] = (
                description_result.get("upcycle_ideas", [])
            )

            result["search_keywords"] = (
                description_result.get("search_keywords", [])
            )

            result["warnings"].extend(
                description_result.get("warnings", [])
            )

    # Jika hanya deskripsi, gunakan Groq
    else:

        result = analyze_description(description)

    # Memastikan material sesuai kategori RUPA
    material = result.get("material")

    if material not in settings.material_categories:

        result["material"] = "Tidak Diketahui"

    # Pemeriksaan keamanan tambahan
    text_to_check = " ".join([
        str(result.get("item_name", "")),
        str(result.get("material_details", "")),
        str(result.get("condition", "")),
        str(result.get("recommended_action", ""))
    ])

    result["safety_warnings"] = check_safety(
        text_to_check
    )

    # Mengambil referensi berdasarkan material
    material = result.get("material")

    result["references"] = get_material_references(
        material
    )

    # Status verifikasi material
    result["verification_required"] = (
        result.get("verification_required", False)
        or material == "Tidak Diketahui"
    )

    return result


# ==========================================================
# 9. VALIDASI KLAIM AI LISTING
# ==========================================================

RISKY_CLAIMS = [

    "100% ramah lingkungan",
    "zero waste",
    "bebas racun",
    "antibakteri",
    "organik",
    "dapat terurai sepenuhnya",
    "aman untuk semua orang"

]


def check_listing_claims(text):

    text = str(text).lower()

    detected = []

    for claim in RISKY_CLAIMS:

        if claim in text:
            detected.append(claim)

    return detected


# ==========================================================
# 10. GENERATE AI LISTING
# ==========================================================

def generate_listing(
    item_name,
    material,
    condition,
    item_description
):

    prompt = f"""
    Anda adalah AI Listing pada marketplace RUPA.

    Buatkan draft listing barang berdasarkan informasi:

    Nama barang: {item_name}

    Material: {material}

    Kondisi: {condition}

    Deskripsi: {item_description}

    Hasil harus berupa JSON:

    {{
        "title": "",
        "category": "",
        "material_tags": [],
        "description": "",
        "keywords": []
    }}

    Aturan:

    1. Gunakan bahasa Indonesia yang jelas.
    2. Judul harus singkat dan informatif.
    3. Jangan mengarang kondisi atau karakteristik barang.
    4. Jangan menambahkan klaim lingkungan tanpa bukti.
    5. Deskripsi harus sesuai dengan informasi pengguna.
    6. Material tags harus relevan dengan barang.
    """

    response = client.chat.completions.create(
        model=settings.text_model,
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0.3
    )

    result = extract_json(
        response.choices[0].message.content
    )

    # Pemeriksaan klaim pada judul dan deskripsi
    full_text = " ".join([
        str(result.get("title", "")),
        str(result.get("description", ""))
    ])

    result["risky_claims"] = check_listing_claims(
        full_text
    )

    result["needs_claim_review"] = bool(
        result["risky_claims"]
    )

    # Referensi harga belum tersedia
    # Membutuhkan minimal 3 listing pembanding valid
    result["price_reference"] = None

    result["price_reference_status"] = (
        "Belum tersedia: data pembanding belum mencukupi."
    )

    return result