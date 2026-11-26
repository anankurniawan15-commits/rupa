/**
 * Pemeriksaan peringatan keamanan berbasis kata kunci — port dari `safety.py` dan `ai_features.py`.
 * Catatan: ini saringan aturan awal, bukan sertifikasi keselamatan atau uji laboratorium.
 */

interface SafetyRule {
  category: string;
  patterns: RegExp[];
}

const SAFETY_RULES: SafetyRule[] = [
  {
    category: 'Bahan kimia atau cairan berbahaya',
    patterns: [
      /\bpestisida\b/i,
      /\bracun\b/i,
      /\bthinner\b/i,
      /\bpelarut\b/i,
      /\basam kuat\b/i,
      /\boli bekas\b/i,
      /\bbahan kimia\b/i,
      /\bcat\b/i,
      /\boli\b/i,
    ],
  },
  {
    category: 'Benda tajam',
    patterns: [
      /\bpecahan kaca\b/i,
      /\bkaca pecah\b/i,
      /\bjarum\b/i,
      /\bpisau\b/i,
      /\bsilet\b/i,
      /\bpaku menonjol\b/i,
      /\bujung tajam\b/i,
      /\blogam tajam\b/i,
    ],
  },
  {
    category: 'Potensi kontaminasi',
    patterns: [
      /\bdarah\b/i,
      /\bjamur\b/i,
      /\bberjamur\b/i,
      /\blimbah medis\b/i,
      /\bkotoran\b/i,
      /\bberlumpur\b/i,
      /\bberbau\b/i,
    ],
  },
  {
    category: 'Komponen listrik',
    patterns: [
      /\bbaterai bocor\b/i,
      /\bkabel terkelupas\b/i,
      /\baki\b/i,
      /\bkapasitor\b/i,
      /\bkomponen elektronik rusak\b/i,
    ],
  },
];

export interface SafetyWarningItem {
  category: string;
  message: string;
}

export function detectSafetyWarnings(text: string): SafetyWarningItem[] {
  const input = (text || '').trim();
  if (!input) return [];
  const out: SafetyWarningItem[] = [];
  for (const rule of SAFETY_RULES) {
    if (rule.patterns.some((re) => re.test(input))) {
      out.push({
        category: rule.category,
        message: `Terindikasi risiko ${rule.category}. Jangan dibongkar atau digunakan sebelum diperiksa pihak kompeten.`,
      });
    }
  }
  return out;
}

export function safetyWarnings(text: string): string[] {
  return detectSafetyWarnings(text).map((w) => w.message);
}
