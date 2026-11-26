from io import BytesIO
from PIL import Image
from rupa_ai.llm import ask_text, ask_vision
from rupa_ai.classifier import classify
from rupa_ai.safety import safety_warnings
from rupa_ai.config import settings

PROMPT = """
Anda adalah AI Sortir Barang untuk RUPA. Perkirakan material hanya dari bukti yang
terlihat atau deskripsi. Jangan mengarang komposisi kimia, jenis polimer, campuran
serat, atau keamanan. Jangan keluarkan angka confidence. Jika tidak cukup bukti,
gunakan material_category='unknown'. Jika bukan barang fisik, supported=false.
Kategori: Tekstil, Plastik, Kertas, Kaca, Logam, Kayu, Karet, Lainnya / Campuran, unknown.
Keluarkan JSON:
{
 "supported": true,
 "item_name": "nama barang",
 "material_category": "kategori",
 "composition_estimate": "perkiraan",
 "visible_conditions": ["kondisi"],
 "limitations": ["batasan analisis"],
 "recommended_action": "langkah awal",
 "upcycle_ideas": [
  {"title":"ide 1","description":"penjelasan"},
  {"title":"ide 2","description":"penjelasan"},
  {"title":"ide 3","description":"penjelasan"}
 ],
 "marketplace_search_terms": ["kata kunci"]
}
Gunakan Bahasa Indonesia sederhana dan berikan tiga ide.
"""

def analyze_item(image_bytes, mime_type, description):
    image = None
    if image_bytes:
        image = Image.open(BytesIO(image_bytes)).convert("RGB")
        # Kirim ulang sebagai JPEG agar tipe MIME dan isi file konsisten.
        buffer = BytesIO()
        image.thumbnail((1600, 1600))
        image.save(buffer, format="JPEG", quality=85)
        clean_bytes = buffer.getvalue()
        data = ask_vision(clean_bytes, "image/jpeg", PROMPT + "\nKeterangan tambahan: " + (description or "Tidak ada."))
    else:
        data = ask_text(PROMPT + "\nDeskripsi pengguna: " + description)

    data.setdefault("supported", True)
    data.setdefault("material_category", "unknown")
    data.setdefault("composition_estimate", "Belum dapat dipastikan.")
    data.setdefault("visible_conditions", [])
    data.setdefault("limitations", [])
    data.setdefault("recommended_action", "Periksa barang secara langsung sebelum digunakan.")
    data.setdefault("upcycle_ideas", [])
    data.setdefault("marketplace_search_terms", [])
    data["upcycle_ideas"] = data["upcycle_ideas"][:3]
    while data["supported"] and len(data["upcycle_ideas"]) < 3:
        data["upcycle_ideas"].append({"title": "Perlu eksplorasi", "description": "Tentukan setelah barang diperiksa langsung."})

    evidence = " ".join([description or "", data.get("item_name", ""), data.get("composition_estimate", ""), " ".join(data.get("visible_conditions", []))])
    data["warnings"] = safety_warnings(evidence)
    data["confidence"] = None
    data["confidence_note"] = "Confidence tidak diambil dari LLM. Skor memerlukan classifier material yang sudah dilatih."
    if image and data["supported"]:
        try:
            pred = classify(image)
            data["classifier_prediction"] = pred["label"]
            if pred["label"].lower() == data["material_category"].lower():
                data["confidence"] = pred["confidence"]
                data["confidence_note"] = "Skor dari EfficientNet-B0 dengan temperature scaling."
            else:
                data["confidence"] = min(pred["confidence"], 59.0)
                data["confidence_note"] = f"Model vision dan classifier berbeda ({data['material_category']} vs {pred['label']}); perlu koreksi manual."
        except (FileNotFoundError, RuntimeError, ValueError) as e:
            data["confidence_note"] = f"Classifier belum tersedia: {e}"
    data["needs_manual_review"] = data["confidence"] is None or data["confidence"] < settings.threshold
    return data
