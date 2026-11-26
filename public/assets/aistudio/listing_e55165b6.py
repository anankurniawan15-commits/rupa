from rupa_ai.llm import ask_text
from rupa_ai.safety import safety_warnings

def generate_listing(name, material, condition, process, price):
    prompt = f"""
Anda adalah AI Listing untuk marketplace RUPA. Buat draf yang jujur dan tidak
mengarang fakta. Hindari klaim absolut seperti 100% ramah lingkungan, zero waste,
bebas racun, antibakteri, atau aman untuk semua orang tanpa bukti.
Data produk:
Nama: {name}
Material pilihan penjual: {material}
Kondisi: {condition}
Proses/informasi: {process or 'Tidak diberikan'}
Harga input penjual: Rp{price}
Kembalikan JSON:
{{
 "title": "judul",
 "category": "kategori",
 "material_tags": ["tag material"],
 "description": "deskripsi produk",
 "keywords": ["kata kunci"]
}}
Bahasa Indonesia sederhana. Jangan membuat referensi harga.
"""
    result = ask_text(prompt)
    result.setdefault("title", name)
    result.setdefault("category", material)
    result.setdefault("material_tags", [material.lower()])
    result.setdefault("description", process)
    result.setdefault("keywords", [name.lower(), material.lower()])
    text = " ".join([result.get("title", ""), result.get("description", ""), " ".join(result.get("material_tags", []))])
    warnings = safety_warnings(text)
    claims = {
        "100% ramah lingkungan": "Klaim 100% ramah lingkungan memerlukan bukti yang jelas.",
        "zero waste": "Klaim zero waste memerlukan bukti proses dan cakupan.",
        "bebas racun": "Klaim bebas racun memerlukan pengujian atau dokumen pendukung.",
        "antibakteri": "Klaim antibakteri memerlukan hasil pengujian.",
        "organik": "Klaim organik memerlukan bukti atau sertifikasi yang sesuai."
    }
    for phrase, warning in claims.items():
        if phrase in text.lower():
            warnings.append(warning)
    result["claim_warnings"] = warnings
    # Tidak ada database listing pembanding pada prototipe ini.
    result["price_comparisons"] = []
    return result
