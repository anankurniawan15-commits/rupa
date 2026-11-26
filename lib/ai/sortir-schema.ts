import { z } from 'zod';
import { PRODUCTS } from '@/lib/data';
import { safetyWarnings } from './safety';
import type { ActionKey, SortirIdea, SortirMaterialCategory, SortirScenario } from '@/types/ai';
import type { MaterialKey } from '@/types/product';

export const SORTIR_MATERIAL_CATEGORIES: Exclude<SortirMaterialCategory, 'unknown'>[] = [
  'Tekstil',
  'Plastik',
  'Kertas',
  'Kaca',
  'Logam',
  'Kayu',
  'Karet',
  'Lainnya / Campuran',
];

export const SortirRequestSchema = z
  .object({
    imageDataUrl: z.string().max(4_500_000).optional(),
    description: z.string().max(800).optional(),
  })
  .refine((d) => Boolean(d.imageDataUrl?.trim() || d.description?.trim()), {
    message: 'Masukkan foto atau deskripsi barang.',
  });

export type SortirRequest = z.infer<typeof SortirRequestSchema>;

export const SortirLlmRawSchema = z.object({
  supported: z.boolean().optional().default(true),
  item_name: z.string().max(120).optional().default('Barang bekas'),
  material_category: z.string().max(80).optional().default('unknown'),
  composition_estimate: z.string().max(300).optional().default('Belum dapat dipastikan.'),
  detected_objects: z.array(z.string().max(120)).max(8).optional().default([]),
  visible_conditions: z.array(z.string().max(220)).max(6).optional().default([]),
  limitations: z.array(z.string().max(260)).max(6).optional().default([]),
  recommended_action: z.string().max(320).optional().default('Periksa barang secara langsung sebelum digunakan.'),
  confidence: z.number().min(0).max(100).nullable().optional(),
  confidence_note: z.string().max(300).optional(),
  warnings: z.array(z.string().max(260)).max(8).optional().default([]),
  vision_provider: z.string().max(60).nullable().optional(),
  vision_backbone: z.string().max(120).nullable().optional(),
  needs_manual_review: z.boolean().optional(),
  crisp_dm_version: z.string().max(40).optional(),
  upcycle_ideas: z
    .array(
      z.object({
        title: z.string().max(120).optional().default('Ide pemanfaatan'),
        description: z.string().max(500).optional().default(''),
      }),
    )
    .max(5)
    .optional()
    .default([]),
  marketplace_search_terms: z.array(z.string().max(60)).max(10).optional().default([]),
});

export type SortirLlmRaw = z.infer<typeof SortirLlmRawSchema>;
export type SortirLlmRawInput = z.input<typeof SortirLlmRawSchema>;

export function extractJsonObject(rawText: string): unknown {
  const cleaned = rawText.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        return undefined;
      }
    }
    return undefined;
  }
}

export function normalizeMaterialCategory(raw: string | undefined | null): SortirMaterialCategory {
  const v = (raw || '').trim().toLowerCase();
  if (!v || v === 'unknown' || v === 'tidak diketahui' || v.includes('belum diketahui')) return 'unknown';
  if (v.includes('tekstil') || v.includes('kain') || v.includes('denim') || v.includes('katun') || v.includes('pakaian')) return 'Tekstil';
  if (v.includes('plastik') || v.includes('pet') || v.includes('hdpe') || v.includes('pp')) return 'Plastik';
  if (v.includes('kertas') || v.includes('kardus') || v.includes('karton')) return 'Kertas';
  if (v.includes('kaca') || v.includes('beling') || v.includes('gelas')) return 'Kaca';
  if (v.includes('logam') || v.includes('kaleng') || v.includes('besi') || v.includes('aluminium')) return 'Logam';
  if (v.includes('kayu') || v.includes('bambu') || v.includes('rotan')) return 'Kayu';
  if (v.includes('karet') || v.includes('ban')) return 'Karet';
  if (v.includes('lain') || v.includes('campur')) return 'Lainnya / Campuran';
  return 'unknown';
}

interface MaterialMeta {
  mat: MaterialKey | null;
  reuse: string;
  rec: ActionKey;
  creators: string[];
  defaultWarnings: string[];
  actions: Record<ActionKey, [string, string]>;
  defaultIdeas: { title: string; description: string }[];
  tags: string[];
}

export const MATERIAL_META: Record<Exclude<SortirMaterialCategory, 'unknown'>, MaterialMeta> = {
  Tekstil: {
    mat: 'denim',
    reuse: 'Upcycle tekstil · tambal atau jahit ulang',
    rec: 'diy',
    creators: ['laras', 'benang', 'tambal', 'arsip'],
    defaultWarnings: [],
    actions: {
      diy: ['rec', 'Kain yang masih kuat bisa dijahit ulang menjadi tas, pouch, atau panel patchwork.'],
      repair: ['', 'Bila kerusakan kecil dan masih layak pakai, cukup ditambal atau diperbaiki.'],
      sell: ['', 'Potongan kain/denim bersih dicari kreator upcycle untuk bahan jahit.'],
      creator: ['', 'Beberapa kreator tekstil di Rupa menerima kain atau pakaian bekas yang sudah dicuci.'],
      recycle: ['', 'Jika kain sudah lapuk atau terlalu kotor, salurkan ke titik pengumpulan tekstil — jangan dibakar.'],
    },
    defaultIdeas: [
      { title: 'Tote bag / pouch kain', description: 'Gunakan panel kain yang masih kuat untuk tas belanja atau tempat alat tulis.' },
      { title: 'Tambalan patchwork', description: 'Potong bagian bersih berukuran seragam untuk melapisi atau menambal produk lain.' },
      { title: 'Lap kerja / pelindung meja', description: 'Jahit rangkap dua untuk alas setrika, lap bengkel, atau celemek sederhana.' },
    ],
    tags: ['tekstil bekas', 'kain upcycle'],
  },
  Plastik: {
    mat: 'plastik',
    reuse: 'Pakai ulang non-pangan · pilah daur ulang',
    rec: 'recycle',
    creators: ['plastik'],
    defaultWarnings: [
      'Jangan gunakan ulang plastik sekali pakai untuk makanan/minuman panas.',
      'Jangan membakar atau melelehkan plastik di rumah karena asapnya berbahaya.',
    ],
    actions: {
      diy: ['', 'Cocok dijadikan pot semai atau wadah alat tulis sederhana setelah tepi potongan dihaluskan.'],
      repair: ['', 'Jika masih utuh dan bersih, pakai sebagai wadah non-makanan seperti penyiram tanaman.'],
      sell: ['', 'Tutup botol HDPE yang dipilah dan dicuci biasanya diterima atau dibeli kreator plastik cacah.'],
      creator: ['', 'Kreator di Rupa menerima plastik cacah atau tutup HDPE yang sudah dibersihkan.'],
      recycle: ['rec', 'Lepas label, bilas bersih, pisahkan tutupnya, lalu setor ke bank sampah atau pengumpul resmi.'],
    },
    defaultIdeas: [
      { title: 'Pot semai tanaman', description: 'Potong bagian bawah wadah, beri lubang drainase, dan haluskan tepinya.' },
      { title: 'Sekat laci atau wadah alat', description: 'Manfaatkan botol/wadah tebal sebagai organizer alat tulis atau baut.' },
      { title: 'Pilah tutup HDPE untuk kreator', description: 'Kumpulkan tutup botol bersih per warna untuk diolah menjadi papan plastik daur ulang.' },
    ],
    tags: ['plastik', 'kemasan'],
  },
  Kertas: {
    mat: null,
    reuse: 'Pakai ulang kemasan · kompos/daur ulang kertas',
    rec: 'recycle',
    creators: [],
    defaultWarnings: ['Kertas/kardus yang terkena minyak berat, jamur, atau basah sebaiknya tidak disimpan lama di dalam ruangan.'],
    actions: {
      diy: ['', 'Kardus tebal dapat dipotong dan dilapis menjadi kotak penyimpanan atau sekat laci.'],
      repair: ['', 'Kardus yang masih kering dan kokoh dapat langsung dipakai ulang untuk pengiriman barang.'],
      sell: ['', 'Kardus bersih dalam jumlah banyak biasanya bernilai di bank sampah atau pengepul kertas.'],
      creator: ['', 'Kreator kertas daur ulang atau pengrajin kemasan lokal kadang memanfaatkan karton tebal bersih.'],
      recycle: ['rec', 'Lipat rata, pastikan kering dan bebas minyak, lalu setor ke bank sampah atau fasilitas daur ulang kertas.'],
    },
    defaultIdeas: [
      { title: 'Kotak organizer meja', description: 'Potong kardus kokoh, rekatkan dengan lem kertas, dan rapikan tepinya.' },
      { title: 'Pelindung packing pengiriman', description: 'Gunakan lembaran kardus sebagai penyekat atau pelapis paket barang pecah belah.' },
      { title: 'Bahan bubur kertas kerajinan', description: 'Rendam potongan kertas bersih tanpa lapisan plastik untuk membuat kertas daur ulang.' },
    ],
    tags: ['kertas', 'kardus bekas'],
  },
  Kaca: {
    mat: null,
    reuse: 'Kemas aman pecahan ke bank sampah kaca · wadah dekorasi bila utuh',
    rec: 'recycle',
    creators: [],
    defaultWarnings: [
      'Periksa retakan atau tepi kaca yang tajam dengan hati-hati sebelum disentuh; gunakan sarung tangan tebal jika sudah pecah.',
      'Jangan memotong atau mengampelas kaca di rumah tanpa alat pelindung mata, masker debu silika, dan perlengkapan khusus.',
    ],
    actions: {
      diy: ['caution', 'Jika masih utuh, cocok jadi vas atau lentera. Jika sudah pecah, hanya aman untuk proyek mozaik tertutup dengan sarung tangan tebal.'],
      repair: ['', 'Jika hanya kotor (tanpa retak), cuci air hangat berbusa untuk dipakai ulang sebagai wadah non-retak. Kaca yang sudah pecah tidak disarankan dilem untuk wadah minum/makanan.'],
      sell: ['', 'Botol atau toples kaca utuh dalam jumlah seragam diminati pengrajin lilin, sedangkan pecahan kaca bersih disalurkan ke pengepul cullet kaca.'],
      creator: ['', 'Tanyakan dulu ke bank sampah atau pengrajin lebur kaca lokal apakah menerima kaca bening atau pecahan kaca (cullet).'],
      recycle: ['rec', 'Jika pecah atau retak, bungkus rapat dalam kardus berlapis bertuliskan "Awas Pecahan Kaca" lalu setor ke bank sampah yang menerima kaca.'],
    },
    defaultIdeas: [
      { title: 'Mozaik tatakan / bingkai kaca (khusus pecahan)', description: 'Pakai sarung tangan tebal, tata kepingan kaca di dalam cetakan adukan semen/nat atau bingkai resin tertutup agar sisi tajam terkunci aman.' },
      { title: 'Kemas aman pecahan kaca untuk bank sampah cullet', description: 'Kumpulkan pecahan bersih di kotak kardus tebal berlapis koran, tutup rapat dengan lakban, beri label peringatan tajam, dan setor ke bank sampah kaca.' },
      { title: 'Vas atau lentera kaca (khusus bila masih utuh)', description: 'Untuk botol/gelas yang tidak retak, cuci bersih dengan air sabun hangat dan gunakan sebagai vas bunga kering atau tempat lilin LED.' },
    ],
    tags: ['kaca', 'botol kaca', 'daur ulang kaca'],
  },
  Logam: {
    mat: 'logam',
    reuse: 'Wadah tanam/alat · daur ulang logam',
    rec: 'creator',
    creators: ['kaleng'],
    defaultWarnings: [
      'Hati-hati pada bagian tepi kaleng/logam yang tajam atau berkarat.',
      'Jika bekas cat, oli, atau bahan kimia, jangan dipakai untuk makanan atau tanaman konsumsi.',
    ],
    actions: {
      diy: ['', 'Kaleng utuh dapat dibersihkan, dilapis cat luar, dan dijadikan pot atau tempat kuas.'],
      repair: ['', 'Bersihkan karat ringan dan lipat atau haluskan bibir kaleng agar tidak melukai tangan.'],
      sell: ['', 'Logam bersih seperti aluminium/besi dapat disetor ke bank sampah atau pengumpul logam.'],
      creator: ['rec', 'Kreator di Rupa seperti pengrajin pot kaleng menerima kaleng biskuit atau kaleng bersih.'],
      recycle: ['', 'Pisahkan dari sampah basah dan serahkan ke bank sampah atau fasilitas daur ulang logam.'],
    },
    defaultIdeas: [
      { title: 'Tempat kuas dan alat tulis', description: 'Haluskan bibir kaleng, lapisi kain perca atau cat dasar air di sisi luar.' },
      { title: 'Pot tanaman hias', description: 'Buat lubang drainase di bagian bawah kaleng bersih untuk tanaman hias non-konsumsi.' },
      { title: 'Setor ke bank sampah logam', description: 'Kumpulkan wadah aluminium atau besi agar mudah didaur ulang.' },
    ],
    tags: ['logam', 'kaleng bekas'],
  },
  Kayu: {
    mat: 'kayu',
    reuse: 'Perbaiki struktur · upcycle kayu reklamasi',
    rec: 'repair',
    creators: ['kayu'],
    defaultWarnings: [
      'Kekuatan struktur kayu tidak dapat dipastikan dari foto; periksa sambungan dan lapuk sebelum dipakai menopang beban.',
      'Cat lama dapat mengandung timbal — gunakan masker dan ampelas basah saat mengelupas cat.',
    ],
    actions: {
      diy: ['caution', 'Potongan kayu yang masih padat bisa dijadikan rak kecil, tatakan, atau gantungan.'],
      repair: ['rec', 'Jika hanya sambungan longgar atau retak ringan, perbaiki dengan lem kayu dan klem terlebih dahulu.'],
      sell: ['', 'Kayu solid bekas furnitur atau palet dicari pengrajin kecil untuk bahan baku reklamasi.'],
      creator: ['', 'Kreator kayu reklamasi di Rupa menerima kayu solid, kusen, dan palet yang masih kering.'],
      recycle: ['', 'Kayu yang berjamur berat, lapuk, atau terkena rayap sebaiknya tidak dipakai untuk furnitur dalam rumah.'],
    },
    defaultIdeas: [
      { title: 'Perkuat sambungan dan cat ulang', description: 'Bersihkan retakan, beri lem kayu, klem semalaman, lalu finising ulang.' },
      { title: 'Ambalan rak dinding kecil', description: 'Ambil papan kayu yang masih lurus dan kuat untuk dijadikan rak pajang ringan.' },
      { title: 'Tatakan atau papan dekorasi', description: 'Potong dan ampelas bagian kayu yang utuh untuk tatakan pot atau hiasan dinding.' },
    ],
    tags: ['kayu bekas', 'kayu reklamasi'],
  },
  Karet: {
    mat: 'karet',
    reuse: 'Upcycle tali/pelindung · kreator karet',
    rec: 'creator',
    creators: ['karet'],
    defaultWarnings: ['Jangan membakar karet bekas karena menghasilkan asap beracun.'],
    actions: {
      diy: ['', 'Potongan karet atau ban dalam dapat dijadikan tali pengikat barang atau bantalan kaki furnitur.'],
      repair: ['', 'Jika masih cukup elastis, gunakan sebagai pelindung sudut atau gasket sederhana non-pangan.'],
      sell: ['', 'Ban dalam bekas yang sudah dibersihkan dicari pengrajin tas tahan air dan aksesori.'],
      creator: ['rec', 'Kreator di Rupa menerima ban dalam bekas bersih untuk diolah menjadi dompet atau tali tas.'],
      recycle: ['', 'Serahkan ban bekas yang getas ke bengkel atau titik pengumpulan daur ulang karet.'],
    },
    defaultIdeas: [
      { title: 'Bantalan anti-selip kaki meja', description: 'Potong karet menjadi kotak kecil dan tempel di bawah kaki kursi atau meja.' },
      { title: 'Tali pengikat serbaguna', description: 'Iris memanjang bagian karet yang masih elastis untuk mengikat barang di bagasi/gudang.' },
      { title: 'Kirim ke kreator upcycle karet', description: 'Cuci bersih dengan sabun dan keringkan sebelum menawarkan ke kreator.' },
    ],
    tags: ['karet', 'ban dalam bekas'],
  },
  'Lainnya / Campuran': {
    mat: null,
    reuse: 'Periksa pemisahan material · konsultasi bank sampah',
    rec: 'recycle',
    creators: [],
    defaultWarnings: [
      'Material campuran sulit dipisahkan tanpa pemeriksaan fisik langsung.',
      'Periksa apakah ada komponen listrik, baterai, atau kaca sebelum membongkar barang.',
    ],
    actions: {
      diy: ['caution', 'Pisahkan bagian yang jelas bahannya terlebih dahulu sebelum mencoba diolah ulang.'],
      repair: ['', 'Jika fungsi utamanya masih berjalan atau dapat diperbaiki ringan, perpanjang masa pakainya dulu.'],
      sell: ['', 'Jelaskan komponen bahan yang terlihat dengan jujur jika ingin dijual sebagai bahan atau barang bekas.'],
      creator: ['', 'Diskusikan dengan kreator apakah komponen tertentu pada barang ini bisa dimanfaatkan.'],
      recycle: ['rec', 'Pisahkan komponen berbeda (logam/plastik/kertas) dan bawa ke bank sampah atau fasilitas e-waste bila perlu.'],
    },
    defaultIdeas: [
      { title: 'Pisahkan komponen berdasarkan bahan', description: 'Kelompokkan bagian logam, kain, atau plastik yang bisa dilepas dengan aman.' },
      { title: 'Gunakan ulang komponen yang masih baik', description: 'Simpan ring, kancing, sekrup, atau tali yang masih kuat sebagai suku cadang.' },
      { title: 'Konsultasikan ke titik pilah terdekat', description: 'Tanyakan ke bank sampah lokal mengenai jalur penerimaan material campuran.' },
    ],
    tags: ['material campuran', 'perlu pilah'],
  },
};

function inferActionKey(text: string, fallback: ActionKey): ActionKey {
  const t = text.toLowerCase();
  if (/perbaiki|lem|tambal|jahit ulang kerusakan|pakai ulang|bersihkan/.test(t)) return 'repair';
  if (/kreator|pengrajin/.test(t)) return 'creator';
  if (/jual|tawarkan/.test(t)) return 'sell';
  if (/daur ulang|bank sampah|setor|pilah|titik pengumpulan/.test(t)) return 'recycle';
  if (/upcycle|buat|jahit|potong|diy|jadikan/.test(t)) return 'diy';
  return fallback;
}

function findMatchingProducts(mat: MaterialKey | null): string[] {
  if (!mat) return [];
  const targets: MaterialKey[] = mat === 'denim' || mat === 'kain' ? ['denim', 'kain'] : [mat];
  const matched = PRODUCTS.filter((p) => Array.isArray(p.mats) && p.mats.some((m) => targets.includes(m))).slice(0, 3).map((p) => p.id);
  return matched;
}

const CATEGORY_EVIDENCE_RE: Record<Exclude<SortirMaterialCategory, 'unknown'>, RegExp[]> = {
  Tekstil: [/tekstil|kain|jeans|denim|katun|pakaian|baju|celana|kaos|kemeja|jaket|perca|handuk/i, /jahit|robek|pudar|saku|kancing|tote|tas/i],
  Plastik: [/plastik|botol|galon|tutup|wadah|ember|jerigen|hdpe|pet|kresek|sedotan/i, /retak|bening|label|kemasan|cacah/i],
  Kertas: [/kertas|kardus|karton|koran|majalah|buku|kotak/i, /kering|lembab|minyak|lipat|tebal/i],
  Kaca: [/kaca|beling|cermin|gelas|toples|botol kaca|cullet/i, /pecah|retak|tajam|pecahan|bening/i],
  Logam: [/logam|kaleng|besi|aluminium|seng|baja|panci/i, /karat|penyok|tajam|tutup|biskuit|cat/i],
  Kayu: [/kayu|kursi|meja|lemari|palet|rak|papan|jati|triplek|bambu|rotan/i, /retak|patah|lapuk|sambungan|paku|serat/i],
  Karet: [/karet|ban|selang|sandal|sol/i, /elastis|sobek|getas|vulka/i],
  'Lainnya / Campuran': [/campur|komposit|elektronik|lainnya|kabel|baterai/i, /komponen|lapisan|rusak/i],
};

export function computeTextPredictionConfidence(
  evidenceText: string,
  category: Exclude<SortirMaterialCategory, 'unknown'>,
): number {
  const t = (evidenceText || '').trim();
  const [matRe, cueRe] = CATEGORY_EVIDENCE_RE[category];
  const hasMat = matRe.test(t);
  const hasCue = cueRe.test(t);
  const hasConditionWord = /pecah|retak|robek|pudar|bersih|utuh|rusak|karat|patah|bekas|lama/i.test(t);
  const detailBonus = t.length >= 35 ? 6 : t.length >= 16 ? 3 : 0;

  if (!hasMat && !hasCue) return 58 + Math.min(4, detailBonus);
  if (hasMat && hasCue) return Math.min(89, 76 + (hasConditionWord ? 6 : 0) + detailBonus);
  if (hasMat) return Math.min(82, 70 + (hasConditionWord ? 5 : 0) + detailBonus);
  return Math.min(72, 62 + detailBonus);
}

function mapIdeas(
  rawIdeas: { title: string; description: string }[],
  mat: MaterialKey | null,
  searchTerms: string[],
  fallbackIdeas: { title: string; description: string }[],
  baseConf: number,
): SortirIdea[] {
  const relId = findMatchingProducts(mat)[0] || '';
  const list = rawIdeas.slice(0, 3);
  while (list.length < 3) {
    const fb = fallbackIdeas[list.length] || {
      title: 'Perlu eksplorasi',
      description: 'Tentukan langkah setelah kondisi barang diperiksa secara langsung.',
    };
    list.push(fb);
  }
  return list.map((idea, idx) => {
    const matchScore = Math.max(68, Math.min(96, Math.round(baseConf * 0.35 + 62 - idx * 5)));
    return {
      name: idea.title || 'Ide pemanfaatan',
      out: idea.description || 'Ide pemanfaatan ulang berdasarkan material yang teridentifikasi.',
      diff: 'Perlu disesuaikan',
      diffN: 2,
      tools: searchTerms.length ? `Kata kunci bahan/referensi: ${searchTerms.slice(0, 3).join(', ')}` : 'Alat dasar sesuai kondisi fisik barang',
      cost: 'Perkiraan belum ditentukan (bergantung alat & bahan tambahan)',
      time: 'Bergantung kondisi fisik barang',
      steps: [
        'Periksa kondisi fisik, kebersihan, dan potensi bagian tajam/berbahaya secara langsung.',
        idea.description || 'Siapkan bagian material yang masih layak pakai dan pisahkan bagian yang rusak.',
        'Pastikan hasil akhir aman sebelum digunakan atau disalurkan.',
      ],
      rel: relId,
      matchScore,
    };
  });
}

export function buildScenarioFromLlm(
  raw: SortirLlmRawInput,
  evidenceText: string,
  sourcePath: 'llm' | 'fallback',
): { category: SortirMaterialCategory; scenario: SortirScenario | null; low: boolean } {
  const category = normalizeMaterialCategory(raw.material_category);
  if (category === 'unknown') {
    return { category: 'unknown', scenario: null, low: true };
  }
  const meta = MATERIAL_META[category];
  const rec = inferActionKey(raw.recommended_action || '', meta.rec);
  const actions: Record<ActionKey, [string, string]> = {
    diy: [rec === 'diy' ? 'rec' : meta.actions.diy[0] === 'caution' ? 'caution' : '', meta.actions.diy[1]],
    repair: [rec === 'repair' ? 'rec' : '', meta.actions.repair[1]],
    sell: [rec === 'sell' ? 'rec' : '', meta.actions.sell[1]],
    creator: [rec === 'creator' ? 'rec' : '', meta.actions.creator[1]],
    recycle: [rec === 'recycle' ? 'rec' : '', meta.actions.recycle[1]],
  };
  if (raw.recommended_action && actions[rec]) {
    actions[rec] = ['rec', raw.recommended_action];
  }

  const combinedEvidence = [
    evidenceText,
    raw.item_name,
    raw.composition_estimate,
    ...(raw.detected_objects || []),
    ...(raw.visible_conditions || []),
    raw.recommended_action,
  ].join(' ');
  const ruleWarnings = safetyWarnings(combinedEvidence);
  const warnings = Array.from(new Set([...meta.defaultWarnings, ...ruleWarnings, ...(raw.warnings || [])]));

  const limitations =
    raw.limitations && raw.limitations.length > 0
      ? raw.limitations
      : [
          'Analisis dari foto atau deskripsi tidak dapat memastikan komposisi kimia, kontaminasi, atau kekuatan struktur secara pasti.',
        ];

  const conditions =
    raw.visible_conditions && raw.visible_conditions.length > 0
      ? raw.visible_conditions
      : ['Perlu pemeriksaan kondisi fisik secara langsung'];

  const searchTerms =
    raw.marketplace_search_terms && raw.marketplace_search_terms.length > 0
      ? raw.marketplace_search_terms
      : meta.tags;

  const hasVisionConfidence = typeof raw.confidence === 'number' && Number.isFinite(raw.confidence);
  const computedConf = hasVisionConfidence
    ? Math.max(0, Math.min(100, Math.round(raw.confidence!)))
    : computeTextPredictionConfidence(combinedEvidence, category);
  const needsManualReview =
    typeof raw.needs_manual_review === 'boolean'
      ? raw.needs_manual_review
      : computedConf < 60 || category === 'Lainnya / Campuran';

  const confLabel =
    computedConf >= 80
      ? hasVisionConfidence
        ? 'Tinggi (estimasi visual)'
        : 'Akurasi tinggi (kecocokan teks)'
      : computedConf >= 60
        ? hasVisionConfidence
          ? 'Sedang (estimasi visual)'
          : 'Akurasi sedang (kecocokan teks)'
        : 'Rendah — perlu verifikasi manual';

  const confNote = raw.confidence_note
    ? raw.confidence_note
    : hasVisionConfidence
      ? 'Confidence merupakan estimasi keyakinan visual dari Vision API dan bukan probabilitas yang telah dikalibrasi secara statistik.'
      : sourcePath === 'llm'
        ? `Skor kecocokan dihitung dari bukti kata kunci & konteks deskripsi (${computedConf}%). Tetap periksa kondisi fisik barang secara langsung.`
        : `Skor kecocokan aturan deskripsi (${computedConf}%). Tetap periksa kondisi fisik barang secara langsung.`;

  const scenario: SortirScenario = {
    item: raw.item_name || 'barang ini',
    cat: category,
    catLabel: `${category} — ${raw.item_name || 'perkiraan material'}`,
    sub: raw.recommended_action || meta.reuse,
    comp: raw.composition_estimate || 'Perkiraan visual; tidak dapat memastikan komposisi kimia tanpa pengujian.',
    cond: conditions,
    reuse: meta.reuse,
    conf: computedConf,
    confLabel,
    confNote,
    warnings,
    limitations,
    detectedObjects: raw.detected_objects || [],
    visionProvider: raw.vision_provider ?? null,
    visionBackbone: raw.vision_backbone ?? null,
    crispDmVersion: raw.crisp_dm_version || '1.0-crispdm',
    needsManualReview,
    sourcePath,
    marketplaceSearchTerms: searchTerms,
    mat: meta.mat,
    rec,
    actions,
    ideas: mapIdeas(
      (raw.upcycle_ideas || []).map((i) => ({
        title: i.title || 'Ide pemanfaatan',
        description: i.description || '',
      })),
      meta.mat,
      searchTerms,
      meta.defaultIdeas,
      computedConf,
    ),
    similar: findMatchingProducts(meta.mat),
    creators: meta.creators,
    sellMat: `${raw.item_name || category} (${category})`,
    sellDraft: `${raw.item_name || category}, perkiraan bahan ${category}. Kondisi: ${conditions.join('; ')}.`,
    tags: Array.from(new Set([...meta.tags, ...searchTerms.slice(0, 3)])),
  };

  return { category, scenario, low: false };
}

export function applyManualMaterialSelection(
  category: Exclude<SortirMaterialCategory, 'unknown'>,
  existing?: SortirScenario | null,
): SortirScenario {
  const meta = MATERIAL_META[category];
  const sameCategory = existing?.cat === category;
  const defaultItemName =
    category === 'Lainnya / Campuran' ? 'barang material campuran' : `barang ${category.toLowerCase()}`;
  const itemName = sameCategory && existing?.item && existing.item !== 'barang ini' ? existing.item : defaultItemName;
  const condList =
    sameCategory && existing?.cond?.length ? existing.cond : ['Kondisi perlu diperiksa langsung sebelum diolah'];

  const base = buildScenarioFromLlm(
    {
      supported: true,
      item_name: itemName,
      material_category: category,
      composition_estimate: `Dipilih manual sebagai ${category}. Periksa kembali jenis spesifik bahan secara langsung.`,
      visible_conditions: condList,
      limitations:
        sameCategory && existing?.limitations?.length
          ? existing.limitations
          : ['Material ditentukan manual oleh pengguna; pemeriksaan fisik tetap diperlukan untuk keamanan dan kualitas.'],
      recommended_action: meta.actions[meta.rec][1],
      upcycle_ideas: meta.defaultIdeas,
      marketplace_search_terms: meta.tags,
    },
    condList.join(' ') || category,
    existing?.sourcePath === 'llm' ? 'llm' : 'fallback',
  ).scenario!;

  return {
    ...base,
    conf: 100,
    confLabel: 'Ditetapkan olehmu',
    confNote: 'Kamu menentukan kategori material ini secara manual (100%), jadi saran langkah, ide upcycle, dan tautan marketplace disesuaikan dengan kategori ini.',
    needsManualReview: false,
    warnings: Array.from(new Set([...meta.defaultWarnings, ...(sameCategory ? existing?.warnings || [] : [])])),
  };
}
