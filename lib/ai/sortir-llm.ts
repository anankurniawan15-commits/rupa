import type { ChatOptions, GroqMessage } from '@/lib/clients/groq';
import { CRISP_DM_SPEC } from './crisp-dm';
import { safetyWarnings } from './safety';
import {
  buildScenarioFromLlm,
  extractJsonObject,
  normalizeMaterialCategory,
  SORTIR_MATERIAL_CATEGORIES,
  SortirLlmRawSchema,
  type SortirLlmRaw,
  type SortirRequest,
} from './sortir-schema';
import type { SortirOutcome } from '@/types/ai';

export type SortirPath = 'llm' | 'fallback';

export interface SortirAnalyzeResult {
  outcome: SortirOutcome;
  path: SortirPath;
  reason?: string;
}

export interface SortirDeps {
  vision: (imageDataUrl: string, prompt: string, opts?: ChatOptions) => Promise<string>;
  chat: (messages: GroqMessage[], opts?: ChatOptions) => Promise<string>;
}

export type SortirVisionProviderFn = (
  imageDataUrl: string,
  prompt: string,
  opts?: ChatOptions,
) => Promise<{ text: string; provider: 'Groq' | 'Gemini'; model: string }>;

/** Prompt AI Sortir Vision — diselaraskan dengan `build_vision_prompt` di `sortir.py` terbaru (tanpa rekomendasi DIY/upcycle). */
export function buildSortirVisionPrompt(description?: string | null): string {
  const note = description && description.trim() ? description.trim() : 'Tidak ada catatan.';
  return `Anda adalah sistem AI Sortir Barang untuk RUPA,
platform pemanfaatan dan upcycle barang bekas.

Tugas Anda adalah menganalisis gambar barang yang diberikan.

KATEGORI MATERIAL:

${JSON.stringify(SORTIR_MATERIAL_CATEGORIES)}

ANALISIS YANG HARUS DILAKUKAN:

1. Identifikasi nama atau jenis barang.
2. Identifikasi material utama barang.
3. Identifikasi material tambahan jika terlihat.
4. Perkirakan komposisi material berdasarkan ciri visual.
5. Identifikasi kondisi fisik yang benar-benar terlihat.
6. Berikan estimasi confidence dari 0 sampai 100.

ATURAN ANALISIS:

- Pilih satu kategori material utama dari daftar.
- Gunakan "Lainnya / Campuran" jika barang memiliki beberapa material atau material tidak dapat dipastikan.
- Jangan menganggap jenis barang sama dengan materialnya.
- Contoh: sepatu dapat terdiri dari tekstil, karet, kulit sintetis, dan logam.
- Contoh: tas dapat terdiri dari kain, kulit sintetis, plastik, dan logam.
- Contoh: furnitur dapat terdiri dari kayu, logam, plastik, atau material gabungan.
- Jangan menyatakan komposisi kimia secara pasti hanya berdasarkan gambar.
- Jangan mengarang kondisi yang tidak terlihat.
- Jika gambar bukan barang fisik, set supported menjadi false.
- Jika gambar buram atau objek tidak jelas, berikan confidence yang rendah.
- Confidence merupakan estimasi keyakinan visual, bukan probabilitas statistik yang sudah dikalibrasi.
- Jangan menghasilkan rekomendasi upcycle atau ide DIY.

CATATAN PENGGUNA:

${note}

FORMAT OUTPUT:

Kembalikan hanya JSON valid dengan struktur berikut:

{
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
}`;
}

/** Prompt AI Sortir Barang lama (tetap dipertahankan untuk kompatibilitas modul/unit test). */
export const SORTIR_PROMPT = `Anda adalah AI Sortir Barang untuk RUPA.
Periksa foto dengan teliti: amati kilau permukaan, ketebalan dinding, garis patahan/retakan (misalnya pecahan kaca bening vs plastik tipis/akrilik), tekstur serat kain, serat kayu, karat/pantulan logam, dan kondisi keausan.
Perkirakan material hanya dari bukti yang terlihat pada foto atau deskripsi pengguna.
Jangan mengarang komposisi kimia, jenis polimer, persentase serat, atau keamanan barang.
Jangan keluarkan angka confidence atau persentase keyakinan.
Jika bukti tidak cukup untuk menentukan material, gunakan material_category = "unknown".
Jika foto berupa tangkapan layar aplikasi, dokumen, meme, teks saja, atau bukan barang fisik nyata, isi supported = false.

Kategori material yang diizinkan (pilih tepat satu):
Tekstil, Plastik, Kertas, Kaca, Logam, Kayu, Karet, Lainnya / Campuran, unknown

Keluarkan JSON valid dengan struktur persis berikut:
{
  "supported": true,
  "item_name": "nama barang singkat dalam bahasa Indonesia (mis. gelas kaca pecah, botol plastik, celana denim)",
  "material_category": "salah satu kategori di atas",
  "composition_estimate": "perkiraan singkat atau ketidakpastiannya",
  "visible_conditions": ["kondisi terlihat 1", "kondisi terlihat 2"],
  "limitations": ["batasan analisis dari foto/deskripsi"],
  "recommended_action": "saran langkah awal yang aman dan realistis",
  "upcycle_ideas": [
    {"title": "ide 1", "description": "penjelasan singkat cara pemanfaatan"},
    {"title": "ide 2", "description": "penjelasan singkat cara pemanfaatan"},
    {"title": "ide 3", "description": "penjelasan singkat cara pemanfaatan"}
  ],
  "marketplace_search_terms": ["kata kunci 1", "kata kunci 2"]
}

Aturan:
- Gunakan Bahasa Indonesia sederhana dan jujur.
- Jika terlihat pecahan tajam, retak, atau barang rusak, sebutkan kondisi tersebut di visible_conditions dan utamakan langkah aman di recommended_action.
- Berikan tepat tiga ide upcycle atau pengolahan ulang yang realistis untuk kondisi barang tersebut.
- Pisahkan fakta yang terlihat dari perkiraan, dan jangan menganggap barang aman tanpa pemeriksaan langsung.`;

const FALLBACK_RULES: { re: RegExp; material: string; label: string; action: string }[] = [
  {
    re: /\b(kaca|beling|cermin|botol kaca|toples kaca|gelas kaca)\b/i,
    material: 'Kaca',
    label: 'wadah atau barang kaca',
    action: 'Periksa retakan atau tepi tajam terlebih dahulu; bersihkan untuk dipakai ulang atau setor ke bank sampah kaca.',
  },
  {
    re: /\b(jeans|denim|jins|kain|katun|kaos|kemeja|jaket|baju|celana|perca|handuk|tekstil)\b/i,
    material: 'Tekstil',
    label: 'pakaian atau kain bekas',
    action: 'Jika masih kuat dan bersih, jahit ulang menjadi tas/pouch atau tawarkan ke kreator tekstil.',
  },
  {
    re: /\b(botol|plastik|galon|tutup botol|wadah plastik|ember|sedotan|jerigen|kresek|hdpe|pet)\b/i,
    material: 'Plastik',
    label: 'wadah atau kemasan plastik',
    action: 'Lepas label, cuci bersih, lalu setor ke bank sampah atau pisahkan tutup HDPE untuk kreator.',
  },
  {
    re: /\b(kursi|meja|kayu|lemari|palet|rak|papan|jati|triplek|bambu|rotan)\b/i,
    material: 'Kayu',
    label: 'barang atau furnitur kayu',
    action: 'Periksa kekuatan sambungan dan retakan terlebih dahulu sebelum diperbaiki atau diambil kayunya.',
  },
  {
    re: /\b(kertas|kardus|karton|koran|majalah|buku bekas|kotak paket)\b/i,
    material: 'Kertas',
    label: 'kertas atau kardus bekas',
    action: 'Pastikan kering dan bebas minyak, lalu pakai ulang untuk packing atau setor ke daur ulang kertas.',
  },
  {
    re: /\b(kaleng|logam|besi|aluminium|seng|baja|kaleng cat|kaleng biskuit|panci)\b/i,
    material: 'Logam',
    label: 'wadah atau barang logam',
    action: 'Hati-hati tepi tajam; bersihkan kaleng yang aman untuk dijadikan pot atau salurkan ke kreator/bank sampah logam.',
  },
  {
    re: /\b(karet|ban|ban dalam|selang|sandal karet|sol karet)\b/i,
    material: 'Karet',
    label: 'bahan karet bekas',
    action: 'Cuci bersih dan keringkan; bahan karet yang masih elastis bisa diolah menjadi tali atau disalurkan ke kreator karet.',
  },
];

/**
 * Sesuai Section B `sortir.py` terbaru:
 * Jika hanya terdapat deskripsi teks tanpa gambar, jalankan Safety Gate lalu minta pengguna memilih material manual.
 */
export function analyzeTextOnlySortir(description: string): SortirOutcome {
  const trimmed = (description || '').trim();
  const warnings = safetyWarnings(trimmed);
  return {
    status: 'done',
    scen: null,
    customScenario: null,
    low: true,
    warnings,
    limitations: [
      'Tidak ada gambar yang dianalisis menggunakan Vision API.',
      'Identifikasi material perlu dilakukan secara manual.',
    ],
    noteText: 'Material belum dapat dipastikan karena tidak terdapat gambar.',
  };
}

/**
 * Sesuai Section A `sortir.py` terbaru:
 * Groq Vision API utama -> Gemini Vision API fallback, dengan Safety Gate & confidence threshold 60%.
 * Tidak menghasilkan rekomendasi DIY/upcycle pada tahap sortir gambar.
 */
export async function analyzeSortirVision(
  req: { imageDataUrl: string; description?: string },
  visionFn: SortirVisionProviderFn,
): Promise<SortirAnalyzeResult> {
  const note = (req.description || '').trim();
  const prompt = buildSortirVisionPrompt(note);
  const res = await visionFn(req.imageDataUrl, prompt, { json: true, temperature: 0.2, maxTokens: 1200 });

  const json = extractJsonObject(res.text);
  if (json === undefined || typeof json !== 'object' || json === null) {
    throw new Error(`Respons ${res.provider} bukan JSON yang valid.`);
  }

  const parsed = SortirLlmRawSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error(`Struktur respons ${res.provider} tidak valid.`);
  }

  const d = parsed.data;
  if (d.supported === false) {
    return {
      outcome: {
        status: 'unsupported',
        warnings: d.warnings || [],
        reason: d.composition_estimate || 'Gambar tidak menunjukkan barang fisik yang dapat dianalisis.',
      },
      path: 'llm',
    };
  }

  const normalizedCat = normalizeMaterialCategory(d.material_category);
  const rawConf = typeof d.confidence === 'number' && Number.isFinite(d.confidence) ? d.confidence : null;
  if (rawConf === null || rawConf < 0 || rawConf > 100) {
    throw new Error(`Nilai confidence dari ${res.provider} tidak valid.`);
  }

  const detectedObjects = (d.detected_objects || []).map((x) => x.trim()).filter(Boolean);
  const visibleConditions = (d.visible_conditions || []).map((x) => x.trim()).filter(Boolean);
  if (note) {
    visibleConditions.push(`Catatan pengguna: ${note}`);
  }

  const evidence = [
    note,
    d.item_name || '',
    normalizedCat,
    d.composition_estimate || '',
    ...detectedObjects,
    ...visibleConditions,
  ].join(' ');
  const gateWarnings = safetyWarnings(evidence);
  const warnings = Array.from(new Set([...(d.warnings || []), ...gateWarnings]));

  if (normalizedCat === 'unknown') {
    return {
      outcome: {
        status: 'done',
        scen: null,
        customScenario: null,
        low: true,
        warnings,
        limitations: [
          `Klasifikasi gambar dilakukan menggunakan ${res.provider} Vision (${res.model}).`,
          'Material belum dapat dipastikan dari gambar; silakan pilih kategori material secara manual.',
        ],
        noteText: d.composition_estimate || 'Kategori material belum dapat dipastikan dari foto.',
      },
      path: 'llm',
    };
  }

  const roundedConf = Math.max(0, Math.min(100, Math.round(rawConf)));
  const needsManualReview =
    roundedConf < CRISP_DM_SPEC.confidenceThreshold || normalizedCat === 'Lainnya / Campuran';

  const limitations = [
    `Klasifikasi gambar dilakukan menggunakan ${res.provider} Vision (${res.model}).`,
    'Confidence merupakan estimasi keyakinan model dan belum dikalibrasi secara statistik.',
    'Komposisi kimia, ketebalan, kebersihan, dan kekuatan struktur barang tidak dapat dipastikan hanya melalui foto.',
  ];
  const confNote =
    'Confidence merupakan estimasi keyakinan visual dari Vision API dan bukan probabilitas yang telah dikalibrasi secara statistik.';

  const rawForBuilder: SortirLlmRaw = {
    supported: true,
    item_name: (d.item_name || '').trim() || 'Barang tidak teridentifikasi secara spesifik',
    material_category: normalizedCat,
    composition_estimate: (d.composition_estimate || '').trim() || 'Komposisi material belum dapat dipastikan.',
    detected_objects: detectedObjects,
    visible_conditions: visibleConditions.length ? visibleConditions : ['Perlu pemeriksaan kondisi fisik secara langsung'],
    limitations,
    recommended_action: needsManualReview
      ? 'Confidence berada di bawah ambang atau material campuran — lakukan verifikasi material secara manual sebelum dipilah atau dijual.'
      : 'Periksa kondisi fisik dan potensi risiko keamanan secara langsung sebelum dipilah atau disalurkan.',
    confidence: roundedConf,
    confidence_note: confNote,
    warnings,
    vision_provider: res.provider,
    vision_backbone: res.model,
    needs_manual_review: needsManualReview,
    crisp_dm_version: CRISP_DM_SPEC.version,
    upcycle_ideas: [],
    marketplace_search_terms: [],
  };

  const built = buildScenarioFromLlm(rawForBuilder, note, 'llm');
  if (built.low || !built.scenario) {
    return {
      outcome: {
        status: 'done',
        scen: null,
        customScenario: null,
        low: true,
        warnings,
        limitations,
      },
      path: 'llm',
    };
  }

  return {
    outcome: { status: 'done', scen: null, customScenario: built.scenario, low: false },
    path: 'llm',
  };
}

export function fallbackSortirAnalysis(description: string): SortirOutcome {
  const trimmed = (description || '').trim();
  const matched = FALLBACK_RULES.find((r) => r.re.test(trimmed));
  if (!matched) {
    return { status: 'done', scen: null, customScenario: null, low: true };
  }
  const raw: SortirLlmRaw = {
    supported: true,
    item_name: matched.label,
    material_category: matched.material,
    composition_estimate: `Perkiraan berdasarkan deskripsi pengguna (${matched.material}); komposisi pasti perlu dicek langsung.`,
    detected_objects: [],
    visible_conditions: [trimmed.slice(0, 140)],
    limitations: ['Analisis hanya didasarkan pada deskripsi teks singkat (model AI server belum aktif).'],
    recommended_action: matched.action,
    warnings: [],
    upcycle_ideas: [],
    marketplace_search_terms: [matched.material.toLowerCase(), 'upcycle'],
  };
  const built = buildScenarioFromLlm(raw, trimmed, 'fallback');
  if (built.low || !built.scenario) {
    return { status: 'done', scen: null, customScenario: null, low: true };
  }
  return { status: 'done', scen: null, customScenario: built.scenario, low: false };
}

export async function analyzeSortirWithLlm(req: SortirRequest, deps: SortirDeps): Promise<SortirAnalyzeResult> {
  const note = (req.description || '').trim();
  let rawText: string;

  if (req.imageDataUrl) {
    const prompt = `${SORTIR_PROMPT}\nKeterangan tambahan pengguna: ${note || 'Tidak ada.'}`;
    rawText = await deps.vision(req.imageDataUrl, prompt, { json: true, temperature: 0.2, maxTokens: 900 });
  } else {
    const prompt = `${SORTIR_PROMPT}\nDeskripsi pengguna: ${note}`;
    rawText = await deps.chat([{ role: 'user', content: prompt }], { json: true, temperature: 0.2, maxTokens: 900 });
  }

  const json = extractJsonObject(rawText);
  if (json === undefined) {
    return { outcome: note ? fallbackSortirAnalysis(note) : { status: 'error', errMsg: 'Respons AI tidak berbentuk JSON yang valid.' }, path: 'fallback', reason: 'invalid_json' };
  }

  const parsed = SortirLlmRawSchema.safeParse(json);
  if (!parsed.success) {
    return { outcome: note ? fallbackSortirAnalysis(note) : { status: 'error', errMsg: 'Format hasil AI tidak lengkap.' }, path: 'fallback', reason: 'invalid_schema' };
  }

  if (parsed.data.supported === false) {
    return { outcome: { status: 'unsupported' }, path: 'llm' };
  }

  const built = buildScenarioFromLlm(parsed.data, note, 'llm');
  if (built.low || !built.scenario) {
    return {
      outcome: { status: 'done', scen: null, customScenario: null, low: true },
      path: 'llm',
    };
  }

  return {
    outcome: { status: 'done', scen: null, customScenario: built.scenario, low: false },
    path: 'llm',
  };
}
