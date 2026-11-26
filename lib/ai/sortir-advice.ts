import { z } from 'zod';
import { applySortirConfidenceGate } from './crisp-dm';
import { buildScenarioFromLlm, extractJsonObject, type SortirLlmRaw } from './sortir-schema';
import {
  buildVisionSortirRaw,
  LOCAL_CV_ARCHITECTURE,
  type SupportedMaterialCategory,
  type VisionEnsembleDecision,
} from './vision-classifier';
import type { ChatOptions, GroqMessage } from '@/lib/clients/groq';
import type { SortirOutcome } from '@/types/ai';

export type AdviceChatFn = (messages: GroqMessage[], opts?: ChatOptions) => Promise<string>;

export interface CvSummaryForAdvice {
  category: SupportedMaterialCategory;
  confidence: number;
  architecture: string;
  calibrated: boolean;
  conditionHint?: 'broken' | 'intact' | 'worn';
  detectedObjects: string[];
  itemLabel?: string;
}

const AdviceLlmOutputSchema = z.object({
  item_name: z.string().min(2).max(120).optional(),
  composition_estimate: z.string().min(4).max(300).optional(),
  visible_conditions: z.array(z.string().max(220)).max(5).optional(),
  limitations: z.array(z.string().max(260)).max(5).optional(),
  recommended_action: z.string().min(5).max(320).optional(),
  upcycle_ideas: z
    .array(
      z.object({
        title: z.string().min(2).max(120),
        description: z.string().min(4).max(500),
      }),
    )
    .max(4)
    .optional(),
  marketplace_search_terms: z.array(z.string().max(60)).max(8).optional(),
});

export function buildCvAdvicePrompt(cv: CvSummaryForAdvice, description?: string): string {
  const note = (description || '').trim();
  const condText =
    cv.conditionHint === 'broken'
      ? 'pecah / retak / bertepi tajam'
      : cv.conditionHint === 'intact'
        ? 'tampak utuh'
        : 'perlu pemeriksaan fisik langsung';

  return `Anda adalah konsultan pengolahan & upcycle barang bekas untuk RUPA.
Model Computer Vision (${cv.architecture}) telah menganalisis foto yang diunggah pengguna dan mengidentifikasi:
- Kategori material (KUNCI TETAP): ${cv.category}
- Perkiraan jenis barang: ${cv.itemLabel || `barang ${cv.category.toLowerCase()}`}
- Indikasi kondisi visual: ${condText}
- Pola objek terdekat: ${cv.detectedObjects.length ? cv.detectedObjects.join(', ') : 'tidak ada'}
- Catatan tambahan pengguna: ${note || 'Tidak ada'}

Tugas Anda:
Susun saran teks pengolahan barang yang praktis, aman, dan realistis dalam Bahasa Indonesia khusus untuk bahan "${cv.category}" dengan kondisi di atas.
Jangan mengubah kategori material menjadi bahan lain (tetap fokus pada ${cv.category}).
Jangan mengarang klaim absolut seperti "100% ramah lingkungan" atau "bebas racun".
Jika ada indikasi barang pecah/retak/tajam (misalnya pecahan kaca), utamakan keselamatan (sarung tangan tebal, kemasan aman/cullet, atau proyek tertutup) dan JANGAN sarankan untuk wadah minum/makanan.

Kembalikan JSON valid persis seperti struktur ini:
{
  "item_name": "nama barang singkat (mis. pecahan gelas kaca bening)",
  "composition_estimate": "perkiraan singkat bahan & catatan bahwa komposisi pasti perlu dicek langsung",
  "visible_conditions": ["kondisi 1", "kondisi 2"],
  "limitations": ["batasan analisis visual"],
  "recommended_action": "1 kalimat langkah awal paling aman & realistis",
  "upcycle_ideas": [
    {"title": "ide 1", "description": "penjelasan singkat langkah pengolahan"},
    {"title": "ide 2", "description": "penjelasan singkat langkah pengolahan"},
    {"title": "ide 3", "description": "penjelasan singkat langkah pengolahan"}
  ],
  "marketplace_search_terms": ["kata kunci 1", "kata kunci 2", "kata kunci 3"]
}`;
}

export function mergeCvRawWithTextAdvice(
  baseRaw: SortirLlmRaw,
  cv: CvSummaryForAdvice,
  adviceJson: unknown,
): SortirLlmRaw {
  const parsed = AdviceLlmOutputSchema.safeParse(adviceJson);
  if (!parsed.success) return baseRaw;
  const d = parsed.data;

  const cvConditionLine = baseRaw.visible_conditions[0];
  const mergedConditions = Array.from(
    new Set([cvConditionLine, ...(d.visible_conditions || []), ...baseRaw.visible_conditions.slice(1)]),
  ).slice(0, 5);

  const cvLimitationLine = baseRaw.limitations[0];
  const mergedLimitations = Array.from(
    new Set([cvLimitationLine, ...(d.limitations || []), ...baseRaw.limitations.slice(1)]),
  ).slice(0, 4);

  return {
    supported: true,
    item_name: d.item_name || baseRaw.item_name,
    // Kunci kategori material ke hasil Computer Vision (LLM teks tidak boleh mengubah kategori CV).
    material_category: cv.category,
    composition_estimate: d.composition_estimate || baseRaw.composition_estimate,
    detected_objects: [],
    visible_conditions: mergedConditions.length ? mergedConditions : baseRaw.visible_conditions,
    limitations: mergedLimitations.length ? mergedLimitations : baseRaw.limitations,
    recommended_action: d.recommended_action || baseRaw.recommended_action,
    warnings: [],
    upcycle_ideas: d.upcycle_ideas && d.upcycle_ideas.length ? d.upcycle_ideas.slice(0, 3) : baseRaw.upcycle_ideas,
    marketplace_search_terms:
      d.marketplace_search_terms && d.marketplace_search_terms.length
        ? d.marketplace_search_terms
        : baseRaw.marketplace_search_terms,
  };
}

export async function generateSortirOutcomeWithAdvice(
  decision: VisionEnsembleDecision,
  description: string | undefined,
  chatFn: AdviceChatFn | null,
  architecture = LOCAL_CV_ARCHITECTURE,
  calibrated = false,
): Promise<{ outcome: SortirOutcome; advicePath: 'llm_rotated' | 'cv_template' }> {
  if (!decision.supported) {
    return { outcome: { status: 'unsupported' }, advicePath: 'cv_template' };
  }

  const cvSummary: CvSummaryForAdvice = {
    category: decision.category,
    confidence: decision.confidence,
    architecture,
    calibrated,
    conditionHint: decision.conditionHint,
    detectedObjects: decision.detectedObjects,
    itemLabel: decision.itemLabel,
  };

  const baseRaw = buildVisionSortirRaw(decision, description);
  let finalRaw = baseRaw;
  let advicePath: 'llm_rotated' | 'cv_template' = 'cv_template';

  if (chatFn) {
    try {
      const prompt = buildCvAdvicePrompt(cvSummary, description);
      const reply = await chatFn([{ role: 'user', content: prompt }], {
        json: true,
        temperature: 0.3,
        maxTokens: 900,
        timeoutMs: 9_000,
      });
      const json = extractJsonObject(reply);
      if (json !== undefined) {
        finalRaw = mergeCvRawWithTextAdvice(baseRaw, cvSummary, json);
        advicePath = 'llm_rotated';
      }
    } catch {
      // Tetap gunakan saran terstruktur dari Computer Vision bila seluruh API key text sedang limit/offline.
      finalRaw = baseRaw;
    }
  }

  const evidence = `${description || ''} ${finalRaw.item_name} ${decision.itemLabel || ''} ${decision.detectedObjects.join(' ')}`;
  const built = buildScenarioFromLlm(finalRaw, evidence, 'llm');
  if (built.low || !built.scenario) {
    return {
      outcome: { status: 'done', scen: null, customScenario: null, low: true },
      advicePath,
    };
  }

  const gated = applySortirConfidenceGate(built.scenario, {
    label: decision.category,
    confidence: decision.confidence,
    backbone: architecture,
    calibrated,
  });

  return {
    outcome: { status: 'done', scen: null, customScenario: gated, low: false },
    advicePath,
  };
}
