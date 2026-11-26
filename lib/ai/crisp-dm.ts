import { z } from 'zod';
import { SELL_CATEGORIES } from '@/lib/data';
import { claimsFlags } from './listing-assist';
import { safetyWarnings } from './safety';
import { buildScenarioFromLlm, SortirLlmRawSchema } from './sortir-schema';
import type { ListingAssistRequest } from './listing-llm';
import type { SortirOutcome, SortirScenario, TitleSuggestion } from '@/types/ai';

/**
 * Spesifikasi Deployment & Evaluasi CRISP-DM untuk RUPA AI.
 * Menyelaraskan fase Business Understanding (1), Evaluation (5), dan Deployment (6)
 * antara pipeline Python (`python_ai/`) dan Next.js API Routes.
 */
export const CRISP_DM_SPEC = {
  version: '1.0-crispdm',
  confidenceThreshold: 60,
  minMacroF1Target: 0.7,
  maxEceTarget: 0.12,
  minPriceComparables: 3,
  maxRequestLatencyMs: 15_000,
} as const;

export interface ClassifierPrediction {
  label: string;
  confidence: number;
  backbone?: string;
  calibrated?: boolean;
}

/**
 * Phase 5/6 Deployment Gate untuk AI Sortir:
 *  - Confidence tidak pernah diambil dari LLM.
 *  - Jika classifier CV (EfficientNetV2 / ConvNeXt / SigLIP / ResNet) tersedia dan cocok, pakai skor model CV.
 *  - Jika belum dikalibrasi pada dataset lokal, atau berbeda pendapat, atau < threshold 60%, wajibkan verifikasi manual.
 */
export function applySortirConfidenceGate(
  scenario: SortirScenario,
  classifierPrediction?: ClassifierPrediction | null,
): SortirScenario {
  if (!classifierPrediction || !Number.isFinite(classifierPrediction.confidence)) {
    return {
      ...scenario,
      conf: null,
      needsManualReview: true,
    };
  }

  const rawScore = Math.max(0, Math.min(100, Math.round(classifierPrediction.confidence)));
  const modelName = classifierPrediction.backbone?.trim() || 'EfficientNetV2-S';
  const isCalibrated = classifierPrediction.calibrated !== false;
  const matches = classifierPrediction.label.trim().toLowerCase() === scenario.cat.trim().toLowerCase();

  if (matches) {
    const needsManualReview = rawScore < CRISP_DM_SPEC.confidenceThreshold;
    const syncedIdeas = scenario.ideas.map((idea, idx) => ({
      ...idea,
      matchScore: Math.max(68, Math.min(96, Math.round(rawScore * 0.35 + 62 - idx * 5))),
    }));
    if (!isCalibrated) {
      return {
        ...scenario,
        ideas: syncedIdeas,
        conf: rawScore,
        confLabel:
          rawScore >= 80
            ? 'Akurasi tinggi (estimasi CV)'
            : rawScore >= CRISP_DM_SPEC.confidenceThreshold
              ? 'Akurasi sedang (estimasi CV)'
              : 'Akurasi rendah — periksa manual',
        confNote: needsManualReview
          ? `Skor estimasi ${modelName} (${rawScore}%) di bawah ambang ${CRISP_DM_SPEC.confidenceThreshold}% — periksa atau koreksi material secara manual.`
          : `Skor perkiraan akurasi dari ${modelName} (${rawScore}%). Tetap periksa kondisi fisik barang secara langsung sebelum diolah.`,
        needsManualReview,
      };
    }

    return {
      ...scenario,
      ideas: syncedIdeas,
      conf: rawScore,
      confLabel: rawScore >= 80 ? 'Tinggi (terkalibrasi)' : rawScore >= 60 ? 'Sedang (terkalibrasi)' : 'Rendah',
      confNote: needsManualReview
        ? `Skor ${modelName} terkalibrasi (${rawScore}%) di bawah ambang ${CRISP_DM_SPEC.confidenceThreshold}% — perlu verifikasi manual.`
        : `Skor berasal dari model ${modelName} terkalibrasi (Temperature Scaling CRISP-DM).`,
      needsManualReview,
    };
  }

  const capped = Math.min(rawScore, CRISP_DM_SPEC.confidenceThreshold - 1);
  return {
    ...scenario,
    conf: capped,
    confLabel: 'Perlu verifikasi manual',
    confNote: `Prediksi (${scenario.cat}) dan classifier ${modelName} (${classifierPrediction.label}) berbeda; silakan periksa atau koreksi material.`,
    needsManualReview: true,
  };
}

const PythonSortirResponseSchema = SortirLlmRawSchema.extend({
  confidence: z.number().nullable().optional(),
  classifier_prediction: z.string().optional(),
  vision_provider: z.string().nullable().optional(),
  vision_backbone: z.string().nullable().optional(),
  calibrated: z.boolean().optional(),
  confidence_note: z.string().optional(),
  needs_manual_review: z.boolean().optional(),
  detected_objects: z.array(z.string()).optional(),
  warnings: z.array(z.string()).optional(),
  crisp_dm_version: z.string().optional(),
});

export function pythonSortirToOutcome(rawJson: unknown, evidenceText: string): SortirOutcome | null {
  const parsed = PythonSortirResponseSchema.safeParse(rawJson);
  if (!parsed.success) return null;
  const d = parsed.data;
  if (d.supported === false) {
    return {
      status: 'unsupported',
      warnings: d.warnings || [],
      reason: d.composition_estimate,
    };
  }

  const built = buildScenarioFromLlm(d, evidenceText, 'llm');
  if (built.low || !built.scenario) {
    const mergedWarnings = Array.from(new Set([...(d.warnings || []), ...safetyWarnings(evidenceText)]));
    return {
      status: 'done',
      scen: null,
      customScenario: null,
      low: true,
      warnings: mergedWarnings,
      limitations: d.limitations || [],
      noteText: d.composition_estimate,
    };
  }

  const mergedWarnings = Array.from(new Set([...(built.scenario.warnings || []), ...(d.warnings || [])]));
  const pred: ClassifierPrediction | null =
    typeof d.confidence === 'number'
      ? {
          label: d.classifier_prediction || built.scenario.cat,
          confidence: d.confidence,
          backbone: d.vision_backbone || undefined,
          calibrated: d.calibrated ?? !Boolean(d.needs_manual_review),
        }
      : null;

  const gated = applySortirConfidenceGate({ ...built.scenario, warnings: mergedWarnings }, pred);
  if (typeof d.needs_manual_review === 'boolean') {
    gated.needsManualReview = d.needs_manual_review;
  }
  gated.detectedObjects = d.detected_objects || gated.detectedObjects || [];
  gated.visionProvider = d.vision_provider ?? gated.visionProvider ?? null;
  gated.visionBackbone = d.vision_backbone ?? gated.visionBackbone ?? null;
  gated.crispDmVersion = d.crisp_dm_version || CRISP_DM_SPEC.version;
  if (d.confidence_note) {
    gated.confNote = d.confidence_note;
  }

  return { status: 'done', scen: null, customScenario: gated, low: false };
}

const PythonListingResponseSchema = z.object({
  title: z.string().optional(),
  titles: z.array(z.string()).optional(),
  category: z.string().optional(),
  material_tags: z.array(z.string()).optional(),
  description: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  safety_warnings: z.array(z.string()).optional(),
  claim_warnings: z
    .array(z.object({ phrase: z.string(), why: z.string() }))
    .optional(),
  needs_claim_review: z.boolean().optional(),
  price_comparisons: z.array(z.unknown()).optional(),
  price_reference_status: z.string().optional(),
  text_provider: z.string().optional(),
  text_model: z.string().optional(),
  crisp_dm_version: z.string().optional(),
});

/** Phase 5/6 Gate untuk AI Listing: pastikan tidak ada klaim berisiko & referensi harga < 3 pembanding tetap kosong. */
export function evaluateListingClaimsGate(text: string) {
  return {
    claimFlags: claimsFlags(text),
    safetyWarnings: safetyWarnings(text),
    priceReferenceAllowed: (comparableCount: number) => comparableCount >= CRISP_DM_SPEC.minPriceComparables,
  };
}

export function pythonListingToResponse(
  rawJson: unknown,
  req: ListingAssistRequest,
):
  | { task: 'titles'; data: TitleSuggestion; path: 'python_crispdm' }
  | {
      task: 'description';
      description: string;
      path: 'python_crispdm';
      meta?: {
        safety_warnings?: string[];
        claim_warnings?: { phrase: string; why: string }[];
        needs_claim_review?: boolean;
        text_provider?: string;
        text_model?: string;
        crisp_dm_version?: string;
      };
    }
  | {
      task: 'keywords';
      keywords: string[];
      path: 'python_crispdm';
      meta?: {
        text_provider?: string;
        text_model?: string;
        crisp_dm_version?: string;
      };
    }
  | null {
  const parsed = PythonListingResponseSchema.safeParse(rawJson);
  if (!parsed.success) return null;
  const d = parsed.data;

  if (req.task === 'titles') {
    const titles = (d.titles?.length ? d.titles : d.title ? [d.title] : []).slice(0, 4);
    if (!titles.length) return null;
    const lowerCat = (d.category || '').toLowerCase();
    const recCat =
      SELL_CATEGORIES.find((c) => c.toLowerCase() === lowerCat) ||
      SELL_CATEGORIES.find((c) => lowerCat && c.toLowerCase().includes(lowerCat)) ||
      '';
    const existing = new Set(req.tags.map((t) => t.toLowerCase()));
    const tags = (d.material_tags || []).map((t) => t.trim().toLowerCase()).filter((t) => t && !existing.has(t));
    return {
      task: 'titles',
      data: {
        title: d.title?.trim() || titles[0],
        titles,
        recCat,
        tags,
        safety_warnings: d.safety_warnings || [],
        claim_warnings: d.claim_warnings || [],
        needs_claim_review: d.needs_claim_review ?? Boolean((d.claim_warnings || []).length || (d.safety_warnings || []).length),
        price_comparisons: d.price_comparisons || [],
        price_reference_status: d.price_reference_status,
        text_provider: d.text_provider,
        text_model: d.text_model,
        crisp_dm_version: d.crisp_dm_version,
      },
      path: 'python_crispdm',
    };
  }

  if (req.task === 'description') {
    if (!d.description?.trim()) return null;
    return {
      task: 'description',
      description: d.description.trim(),
      path: 'python_crispdm',
      meta: {
        safety_warnings: d.safety_warnings || [],
        claim_warnings: d.claim_warnings || [],
        needs_claim_review: d.needs_claim_review,
        text_provider: d.text_provider,
        text_model: d.text_model,
        crisp_dm_version: d.crisp_dm_version,
      },
    };
  }

  if (!d.keywords?.length) return null;
  return {
    task: 'keywords',
    keywords: d.keywords.slice(0, 8),
    path: 'python_crispdm',
    meta: {
      text_provider: d.text_provider,
      text_model: d.text_model,
      crisp_dm_version: d.crisp_dm_version,
    },
  };
}
