import { CRISP_DM_SPEC, applySortirConfidenceGate } from './crisp-dm';
import { buildScenarioFromLlm, type SortirLlmRaw } from './sortir-schema';
import type { SortirMaterialCategory, SortirOutcome } from '@/types/ai';

export type SupportedMaterialCategory = Exclude<SortirMaterialCategory, 'unknown'>;

export const LOCAL_CV_ARCHITECTURE = 'ConvNeXt-Tiny (CVPR 2022) + SigLIP-ViT-B/16 (ICCV 2023)';

export interface RawClassScore {
  label: string;
  score: number;
}

export interface SiglipPromptSpec {
  id: string;
  prompt: string;
  category: SupportedMaterialCategory | '__unsupported__';
  conditionHint?: 'broken' | 'intact' | 'worn';
  itemLabel?: string;
}

export const SIGLIP_MATERIAL_PROMPTS: SiglipPromptSpec[] = [
  {
    id: 'tekstil',
    prompt: 'textile fabric, jeans, clothing, cotton cloth',
    category: 'Tekstil',
    itemLabel: 'kain atau pakaian bekas',
  },
  {
    id: 'plastik',
    prompt: 'plastic bottle, plastic container, plastic packaging',
    category: 'Plastik',
    itemLabel: 'wadah atau kemasan plastik',
  },
  {
    id: 'kertas',
    prompt: 'cardboard box, corrugated paper, newspaper',
    category: 'Kertas',
    itemLabel: 'kertas atau kardus bekas',
  },
  {
    id: 'kaca_pecah',
    prompt: 'broken cracked shattered glass shards',
    category: 'Kaca',
    conditionHint: 'broken',
    itemLabel: 'pecahan / kaca retak tajam',
  },
  {
    id: 'kaca_utuh',
    prompt: 'intact clear glass bottle, glass jar, drinking glass',
    category: 'Kaca',
    conditionHint: 'intact',
    itemLabel: 'botol atau gelas kaca',
  },
  {
    id: 'logam',
    prompt: 'metal tin can, aluminum scrap, iron hardware',
    category: 'Logam',
    itemLabel: 'wadah atau barang logam',
  },
  {
    id: 'kayu',
    prompt: 'wooden chair, wood plank, wooden furniture',
    category: 'Kayu',
    itemLabel: 'barang atau potongan kayu',
  },
  {
    id: 'karet',
    prompt: 'rubber tire, inner tube, rubber sandal',
    category: 'Karet',
    itemLabel: 'bahan karet bekas',
  },
  {
    id: 'campuran',
    prompt: 'mixed material waste or electronic parts',
    category: 'Lainnya / Campuran',
    itemLabel: 'barang material campuran',
  },
  {
    id: 'unsupported',
    prompt: 'computer screenshot of a website or user interface',
    category: '__unsupported__',
  },
];

const IMAGENET_CATEGORY_KEYWORDS: Record<SupportedMaterialCategory | '__unsupported__', string[]> = {
  __unsupported__: ['web site', 'website', 'internet site', 'monitor', 'crt screen', 'television', 'menu'],
  Tekstil: [
    'jean',
    'blue jean',
    'denim',
    'jersey',
    'cardigan',
    'sweatshirt',
    'trench coat',
    'abaya',
    'kimono',
    'apron',
    'velvet',
    'wool',
    'sock',
    'backpack',
    'mailbag',
    'purse',
    'wallet',
    'pillow',
    'quilt',
    'handkerchief',
    'dishcloth',
    'bath towel',
    'miniskirt',
    'sarong',
    'shirt',
    'suit',
    'stole',
    'poncho',
    'cloak',
    'sleeping bag',
  ],
  Plastik: [
    'water bottle',
    'pop bottle',
    'soda bottle',
    'pill bottle',
    'plastic bag',
    'bucket',
    'pail',
    'soap dispenser',
    'lotion',
    'hair spray',
    'syringe',
    'tub',
    'nipple',
    'measuring cup',
  ],
  Kertas: [
    'carton',
    'envelope',
    'book jacket',
    'comic book',
    'binder',
    'toilet tissue',
    'paper towel',
    'origami',
    'packet',
  ],
  Kaca: [
    'beer glass',
    'beer bottle',
    'wine bottle',
    'red wine',
    'goblet',
    'beaker',
    'hourglass',
    'perfume',
    'pitcher',
    'ewer',
    'water jug',
    'vase',
    'mixing bowl',
    'sunglass',
    'sunglasses',
    'cocktail shaker',
    'whiskey jug',
    'magnifying glass',
  ],
  Logam: [
    'ashcan',
    'can opener',
    'frying pan',
    'wok',
    'caldron',
    'teapot',
    'coffeepot',
    'ladle',
    'spatula',
    'strainer',
    'screw',
    'nail',
    'hammer',
    'wrench',
    'padlock',
    'safety pin',
    'barrel',
    'steel drum',
    'toaster',
    'chain',
  ],
  Kayu: [
    'folding chair',
    'rocking chair',
    'dining table',
    'desk',
    'park bench',
    'bookcase',
    'wardrobe',
    'wooden spoon',
    'crate',
    'clog',
    'chest',
    'bamboo',
    'birdhouse',
  ],
  Karet: [
    'car wheel',
    'tire',
    'rubber eraser',
    'sandal',
    'running shoe',
    'plunger',
    'hose',
    'balloon',
    'flip-flop',
  ],
  'Lainnya / Campuran': [
    'notebook computer',
    'laptop',
    'cellular telephone',
    'printer',
    'keyboard',
    'mouse',
  ],
};

export function mapImageNetLabelToCategory(label: string): SupportedMaterialCategory | '__unsupported__' {
  const lower = (label || '').toLowerCase();
  if (!lower) return 'Lainnya / Campuran';
  const order: (SupportedMaterialCategory | '__unsupported__')[] = [
    '__unsupported__',
    'Lainnya / Campuran',
    'Kaca',
    'Tekstil',
    'Plastik',
    'Kertas',
    'Logam',
    'Kayu',
    'Karet',
  ];
  for (const cat of order) {
    if (IMAGENET_CATEGORY_KEYWORDS[cat].some((kw) => lower.includes(kw))) {
      return cat;
    }
  }
  return 'Lainnya / Campuran';
}

export interface VisionEnsembleDecision {
  supported: boolean;
  category: SupportedMaterialCategory;
  confidence: number;
  agreed: boolean;
  siglipTopCategory: SupportedMaterialCategory | '__unsupported__';
  convnextTopCategory: SupportedMaterialCategory | '__unsupported__';
  detectedObjects: string[];
  conditionHint?: 'broken' | 'intact' | 'worn';
  itemLabel?: string;
}

const ALL_MATERIAL_CATS: SupportedMaterialCategory[] = [
  'Tekstil',
  'Plastik',
  'Kertas',
  'Kaca',
  'Logam',
  'Kayu',
  'Karet',
  'Lainnya / Campuran',
];

export function combineVisionPredictions(
  siglipResults: RawClassScore[],
  convnextResults: RawClassScore[],
): VisionEnsembleDecision {
  const siglipTotals: Record<SupportedMaterialCategory | '__unsupported__', number> = {
    Tekstil: 0,
    Plastik: 0,
    Kertas: 0,
    Kaca: 0,
    Logam: 0,
    Kayu: 0,
    Karet: 0,
    'Lainnya / Campuran': 0,
    __unsupported__: 0,
  };

  let siglipSum = 0;
  for (const r of siglipResults) {
    const spec = SIGLIP_MATERIAL_PROMPTS.find((p) => p.prompt === r.label);
    if (!spec) continue;
    const score = Math.max(0, Number(r.score) || 0);
    siglipTotals[spec.category] += score;
    siglipSum += score;
  }

  const siglipRel: Record<SupportedMaterialCategory | '__unsupported__', number> = { ...siglipTotals };
  if (siglipSum > 0) {
    for (const k of Object.keys(siglipRel) as (SupportedMaterialCategory | '__unsupported__')[]) {
      siglipRel[k] = siglipTotals[k] / siglipSum;
    }
  }

  const convnextTotals: Record<SupportedMaterialCategory | '__unsupported__', number> = {
    Tekstil: 0,
    Plastik: 0,
    Kertas: 0,
    Kaca: 0,
    Logam: 0,
    Kayu: 0,
    Karet: 0,
    'Lainnya / Campuran': 0,
    __unsupported__: 0,
  };
  let convnextWeightSum = 0;
  const detectedObjects: string[] = [];
  for (const r of convnextResults.slice(0, 5)) {
    const score = Math.max(0, Number(r.score) || 0);
    const mapped = mapImageNetLabelToCategory(r.label);
    convnextTotals[mapped] += score;
    convnextWeightSum += score;
    if (r.label) detectedObjects.push(r.label.split(',')[0].trim());
  }

  const convnextNorm: Record<SupportedMaterialCategory | '__unsupported__', number> = { ...convnextTotals };
  if (convnextWeightSum > 0) {
    for (const k of Object.keys(convnextNorm) as (SupportedMaterialCategory | '__unsupported__')[]) {
      convnextNorm[k] = convnextTotals[k] / convnextWeightSum;
    }
  }

  const siglipTopEntry = (Object.entries(siglipRel) as [SupportedMaterialCategory | '__unsupported__', number][]).sort(
    (a, b) => b[1] - a[1],
  )[0];
  const convnextTopRaw = convnextResults[0] ? mapImageNetLabelToCategory(convnextResults[0].label) : 'Lainnya / Campuran';

  const topConvUnsupported = convnextTopRaw === '__unsupported__' && (convnextResults[0]?.score || 0) >= 0.35;
  const topSiglipUnsupported = siglipTopEntry?.[0] === '__unsupported__' && siglipTopEntry[1] >= 0.65;
  if (topConvUnsupported || topSiglipUnsupported) {
    return {
      supported: false,
      category: 'Lainnya / Campuran',
      confidence: 0,
      agreed: topConvUnsupported && topSiglipUnsupported,
      siglipTopCategory: siglipTopEntry?.[0] || '__unsupported__',
      convnextTopCategory: convnextTopRaw,
      detectedObjects: detectedObjects.slice(0, 3),
    };
  }

  let bestCat: SupportedMaterialCategory = 'Lainnya / Campuran';
  let bestScore = -1;
  for (const cat of ALL_MATERIAL_CATS) {
    const mixedPenalty = cat === 'Lainnya / Campuran' ? 0.65 : 1;
    const score = (0.62 * siglipRel[cat] + 0.38 * convnextNorm[cat]) * mixedPenalty;
    if (score > bestScore) {
      bestScore = score;
      bestCat = cat;
    }
  }

  const siglipSorted = ALL_MATERIAL_CATS.slice().sort((a, b) => siglipRel[b] - siglipRel[a]);
  const topSiglipMat = siglipSorted[0];
  const secondSiglipMat = siglipSorted[1] ?? topSiglipMat;
  const siglipMargin = Math.max(0, siglipRel[topSiglipMat] - siglipRel[secondSiglipMat]);

  const specificConvnextTop = ALL_MATERIAL_CATS.filter((c) => c !== 'Lainnya / Campuran').sort(
    (a, b) => convnextNorm[b] - convnextNorm[a],
  )[0];
  const convnextMaterial =
    convnextNorm[specificConvnextTop] >= 0.15 ? specificConvnextTop : convnextTopRaw;

  const agreed = topSiglipMat === convnextMaterial;
  const confidence = agreed
    ? Math.round(Math.min(93, Math.max(62, bestScore * 82 + siglipMargin * 12)))
    : Math.round(
        Math.min(CRISP_DM_SPEC.confidenceThreshold - 2, Math.max(38, bestScore * 72 + siglipMargin * 8)),
      );

  let conditionHint: 'broken' | 'intact' | 'worn' | undefined;
  let itemLabel: string | undefined;
  if (bestCat === 'Kaca') {
    const brokenScore = siglipResults.find((r) => r.label.includes('broken cracked shattered glass'))?.score || 0;
    const intactScore = siglipResults.find((r) => r.label.includes('intact clear glass bottle'))?.score || 0;
    conditionHint = brokenScore >= intactScore ? 'broken' : 'intact';
    itemLabel = conditionHint === 'broken' ? 'pecahan kaca tajam / retak' : 'botol atau gelas kaca';
  } else {
    itemLabel = SIGLIP_MATERIAL_PROMPTS.find((p) => p.category === bestCat)?.itemLabel;
  }

  return {
    supported: true,
    category: bestCat,
    confidence,
    agreed,
    siglipTopCategory: siglipTopEntry?.[0] || bestCat,
    convnextTopCategory: convnextMaterial,
    detectedObjects: detectedObjects.slice(0, 3),
    conditionHint,
    itemLabel,
  };
}

export function buildVisionSortirRaw(decision: VisionEnsembleDecision, description?: string): SortirLlmRaw {
  const note = (description || '').trim();
  const isBrokenGlass = decision.category === 'Kaca' && decision.conditionHint === 'broken';

  const visibleConditions: string[] = [
    `Terdeteksi oleh model Computer Vision (${LOCAL_CV_ARCHITECTURE}) sebagai ${decision.category}.`,
  ];
  if (isBrokenGlass) {
    visibleConditions.push('Terdeteksi pola pecahan/tepi kaca tajam; tangani dengan sarung tangan tebal.');
  }
  if (decision.detectedObjects.length) {
    visibleConditions.push(`Pola visual terdekat (ImageNet ConvNeXt-Tiny): ${decision.detectedObjects.join(', ')}.`);
  }
  if (note) {
    visibleConditions.push(`Catatan pengguna: ${note}`);
  }

  const limitations = [
    `Klasifikasi gambar dijalankan langsung dengan arsitektur Computer Vision jurnal internasional (${LOCAL_CV_ARCHITECTURE}) tanpa Vision LLM.`,
    'Model belum dikalibrasi (Temperature Scaling CRISP-DM) pada dataset lokal, sehingga verifikasi manual pengguna tetap diperlukan.',
  ];

  let recommendedAction = '';
  if (isBrokenGlass) {
    recommendedAction =
      'Pakai sarung tangan tebal; bungkus pecahan kaca di dalam kardus berlapis bertuliskan "Awas Pecahan Kaca" lalu setor ke bank sampah kaca.';
  } else if (decision.category === 'Kaca') {
    recommendedAction =
      'Periksa apakah ada retakan halus; jika utuh bersih dapat dipakai ulang sebagai vas/wadah, atau kemas aman ke bank sampah kaca.';
  }

  return {
    supported: true,
    item_name: decision.itemLabel || `barang ${decision.category.toLowerCase()}`,
    material_category: decision.category,
    composition_estimate: `Perkiraan visual fitur neural network (${decision.category}); komposisi detail tetap perlu diperiksa langsung.`,
    detected_objects: [],
    visible_conditions: visibleConditions,
    limitations,
    recommended_action: recommendedAction,
    warnings: [],
    upcycle_ideas: [],
    marketplace_search_terms: isBrokenGlass ? ['kaca', 'cullet', 'daur ulang kaca'] : [],
  };
}

type VisionPipelines = {
  convnext: (img: unknown, opts?: { top_k?: number }) => Promise<RawClassScore[]>;
  siglip: (
    img: unknown,
    labels: string[],
    opts?: { hypothesis_template?: string },
  ) => Promise<RawClassScore[]>;
};

const g = globalThis as typeof globalThis & { __rupaVisionPromise?: Promise<VisionPipelines> };

async function getVisionPipelines(): Promise<VisionPipelines> {
  if (!g.__rupaVisionPromise) {
    g.__rupaVisionPromise = (async () => {
      const { pipeline } = await import('@huggingface/transformers');
      const [convnext, siglip] = await Promise.all([
        pipeline('image-classification', 'Xenova/convnext-tiny-224', { dtype: 'q8' }),
        pipeline('zero-shot-image-classification', 'Xenova/siglip-base-patch16-224', { dtype: 'q8' }),
      ]);
      return {
        convnext: convnext as unknown as VisionPipelines['convnext'],
        siglip: siglip as unknown as VisionPipelines['siglip'],
      };
    })().catch((err) => {
      g.__rupaVisionPromise = undefined;
      throw err;
    });
  }
  return g.__rupaVisionPromise;
}

async function decodeImageDataUrl(imageDataUrl: string) {
  const commaIdx = imageDataUrl.indexOf(',');
  const base64 = commaIdx >= 0 ? imageDataUrl.slice(commaIdx + 1) : imageDataUrl;
  const rawBuffer = Buffer.from(base64, 'base64');
  if (!rawBuffer.length) {
    throw new Error('Data gambar kosong atau tidak valid.');
  }

  const sharpMod = await import('sharp');
  const sharp = sharpMod.default;
  const { RawImage } = await import('@huggingface/transformers');

  const { data, info } = await sharp(rawBuffer)
    .rotate()
    .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  return new RawImage(new Uint8ClampedArray(data), info.width, info.height, info.channels as 1 | 2 | 3 | 4);
}

export async function classifyImageWithVisionDecision(
  imageDataUrl: string,
): Promise<VisionEnsembleDecision> {
  const [image, pipelines] = await Promise.all([
    decodeImageDataUrl(imageDataUrl),
    getVisionPipelines(),
  ]);

  const promptTexts = SIGLIP_MATERIAL_PROMPTS.map((p) => p.prompt);
  const [convnextResults, siglipResults] = await Promise.all([
    pipelines.convnext(image, { top_k: 5 }),
    pipelines.siglip(image, promptTexts, { hypothesis_template: 'This is a photo of {}.' }),
  ]);

  return combineVisionPredictions(siglipResults, convnextResults);
}

export async function classifyImageWithLocalVision(
  imageDataUrl: string,
  description?: string,
): Promise<{ outcome: SortirOutcome; decision: VisionEnsembleDecision }> {
  const decision = await classifyImageWithVisionDecision(imageDataUrl);
  if (!decision.supported) {
    return { outcome: { status: 'unsupported' }, decision };
  }

  const raw = buildVisionSortirRaw(decision, description);
  const built = buildScenarioFromLlm(raw, `${description || ''} ${decision.itemLabel || ''} ${decision.detectedObjects.join(' ')}`, 'llm');
  if (built.low || !built.scenario) {
    return {
      outcome: { status: 'done', scen: null, customScenario: null, low: true },
      decision,
    };
  }

  const gated = applySortirConfidenceGate(built.scenario, {
    label: decision.category,
    confidence: decision.confidence,
    backbone: LOCAL_CV_ARCHITECTURE,
    calibrated: false,
  });

  return {
    outcome: { status: 'done', scen: null, customScenario: gated, low: false },
    decision,
  };
}
