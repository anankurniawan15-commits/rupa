import re

RULES = {
    "Bahan kimia atau cairan berbahaya": [r"\bpestisida\b", r"\bracun\b", r"\bthinner\b", r"\bpelarut\b", r"\basam kuat\b", r"\boli bekas\b"],
    "Benda tajam": [r"\bpecahan kaca\b", r"\bkaca pecah\b", r"\bjarum\b", r"\bpisau\b", r"\bsilet\b", r"\bpaku menonjol\b"],
    "Potensi kontaminasi": [r"\bdarah\b", r"\bjamur\b", r"\bberjamur\b", r"\blimbah medis\b", r"\bkotoran\b"],
    "Komponen listrik": [r"\bbaterai bocor\b", r"\bkabel terkelupas\b", r"\baki\b", r"\bkapasitor\b"],
}

def safety_warnings(text):
    text = (text or "").lower()
    warnings = []
    for category, patterns in RULES.items():
        if any(re.search(p, text) for p in patterns):
            warnings.append(f"Terindikasi risiko {category}. Jangan dibongkar atau digunakan sebelum diperiksa pihak kompeten.")
    return warnings
