"""Aturan keamanan berbasis kata kunci dan pemeriksaan klaim berisiko AI Listing."""
import re

SAFETY_RULES = {
    "Bahan kimia atau cairan berbahaya": [
        r"\bpestisida\b",
        r"\bracun\b",
        r"\bthinner\b",
        r"\bpelarut\b",
        r"\basam kuat\b",
        r"\boli bekas\b",
        r"\bbahan kimia\b",
        r"\bcat\b",
        r"\boli\b",
    ],
    "Benda tajam": [
        r"\bpecahan kaca\b",
        r"\bkaca pecah\b",
        r"\bjarum\b",
        r"\bpisau\b",
        r"\bsilet\b",
        r"\bpaku menonjol\b",
        r"\bujung tajam\b",
        r"\blogam tajam\b",
    ],
    "Potensi kontaminasi": [
        r"\bdarah\b",
        r"\bjamur\b",
        r"\bberjamur\b",
        r"\blimbah medis\b",
        r"\bkotoran\b",
        r"\bberlumpur\b",
        r"\bberbau\b",
    ],
    "Komponen listrik": [
        r"\bbaterai bocor\b",
        r"\bkabel terkelupas\b",
        r"\baki\b",
        r"\bkapasitor\b",
        r"\bkomponen elektronik rusak\b",
    ],
}

CLAIM_RULES = {
    "100% ramah lingkungan": "Klaim 100% ramah lingkungan memerlukan bukti yang jelas.",
    "ramah lingkungan": "Klaim ramah lingkungan terlalu umum; jelaskan material dan proses nyatanya.",
    "zero waste": "Klaim zero waste memerlukan bukti proses dan cakupan limbah.",
    "bebas racun": "Klaim bebas racun memerlukan pengujian atau dokumen pendukung.",
    "bebas bahan kimia": "Semua material mengandung zat kimia; ganti dengan penjelasan bahan aktual.",
    "antibakteri": "Klaim antibakteri memerlukan hasil uji laboratorium.",
    "organik": "Klaim organik memerlukan bukti atau sertifikasi yang sesuai.",
    "dapat terurai sepenuhnya": "Klaim penguraian penuh memerlukan bukti uji material.",
    "aman untuk semua orang": "Hindari jaminan keamanan mutlak tanpa pengujian.",
}


def safety_warnings(text: str) -> list[str]:
    low = (text or "").lower()
    warnings: list[str] = []
    for category, patterns in SAFETY_RULES.items():
        if any(re.search(p, low) for p in patterns):
            warnings.append(
                f"Terindikasi risiko {category}. Jangan dibongkar atau digunakan sebelum diperiksa pihak kompeten."
            )
    return warnings


def check_listing_claims(text: str) -> list[dict[str, str]]:
    low = (text or "").lower()
    detected: list[dict[str, str]] = []
    for phrase, why in CLAIM_RULES.items():
        if phrase in low:
            detected.append({"phrase": phrase, "why": why})
    return detected
