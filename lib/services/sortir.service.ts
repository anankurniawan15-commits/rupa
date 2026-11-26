'use client';
/**
 * SortirService — AI Sortir Barang.
 * Foto contoh tetap memakai data simulasi lokal, sedangkan foto unggahan memanggil
 * POST /api/sortir (Computer Vision murni: EfficientNetV2 CRISP-DM / ConvNeXt-Tiny + SigLIP, tanpa Vision LLM).
 */
import { PRODUCTS, SELLERS, SORTIR_SAMPLES } from '@/lib/data';
import { useSortir } from '@/lib/store/sortir';
import { analyzeSource, orderedActions, orderedActionsFor, scenario } from '@/lib/ai/sortir-engine';
import { delay } from './util';
import type { ActionKey, ScenarioKey, SortirOutcome, SortirScenario, SortirSource } from '@/types/ai';

export const SAMPLE_ENTRIES = Object.entries(SORTIR_SAMPLES) as [keyof typeof SORTIR_SAMPLES, (typeof SORTIR_SAMPLES)[keyof typeof SORTIR_SAMPLES]][];
export const sampleOf = (k: keyof typeof SORTIR_SAMPLES) => SORTIR_SAMPLES[k];

export const sortirService = {
  /**
   * Analisis contoh berjalan lokal (±2,5 dtk). Unggahan foto & teks manual dikirim ke /api/sortir.
   */
  async analyze(src: SortirSource, onProgress?: (idx: number) => void, signal?: AbortSignal): Promise<SortirOutcome> {
    if (src.kind === 'sample') {
      onProgress?.(0);
      await delay(850, signal);
      onProgress?.(1);
      await delay(850, signal);
      onProgress?.(2);
      await delay(800, signal);
      return analyzeSource(src);
    }

    onProgress?.(0);
    const t1 = setTimeout(() => { if (!signal?.aborted) onProgress?.(1); }, 900);
    const t2 = setTimeout(() => { if (!signal?.aborted) onProgress?.(2); }, 2100);

    try {
      const payload =
        src.kind === 'upload'
          ? { imageDataUrl: src.dataUrl || '', description: src.note || '' }
          : { description: src.text };

      const res = await fetch('/api/sortir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal,
      });

      const data = (await res.json()) as SortirOutcome;
      if (!res.ok && data.status !== 'error') {
        return { status: 'error', errMsg: 'Layanan AI Sortir sedang sibuk. Coba lagi sebentar lagi.' };
      }
      return data;
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
    }
  },

  recommendActions: (k: ScenarioKey) => orderedActions(k),
  recommendActionsFor: (S: SortirScenario) => orderedActionsFor(S),
  generateIdeas: (k: ScenarioKey, _action: ActionKey | null) => scenario(k).ideas,
  generateIdeasFor: (S: SortirScenario, _action: ActionKey | null) => S.ideas,
  findCreators: (k: ScenarioKey) => scenario(k).creators.map((id) => SELLERS[id]).filter(Boolean),
  findCreatorsFor: (S: SortirScenario) => S.creators.map((id) => SELLERS[id]).filter(Boolean),
  getScenario: scenario,
  /** Produk jadi dari material serupa (langkah 5). */
  findSimilar: (k: ScenarioKey) =>
    scenario(k).similar.map((id) => PRODUCTS.find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => !!p),
  findSimilarFor: (S: SortirScenario) =>
    S.similar.map((id) => PRODUCTS.find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => !!p),

  /** Simpan hasil (tanpa foto) ke profil. */
  async save(title: string, scen: ScenarioKey | null, customScenario?: SortirScenario | null): Promise<void> {
    const { saved, setSaved } = useSortir.getState();
    setSaved([
      {
        id: 's' + Date.now(),
        title,
        date: 'Disimpan hari ini',
        scen: scen || 'custom',
        ...(customScenario ? { customScenario } : {}),
      },
      ...saved,
    ]);
  },

  async removeSaved(id: string): Promise<void> {
    const { saved, setSaved } = useSortir.getState();
    setSaved(saved.filter((x) => x.id !== id));
  },

  /** Buka lagi hasil tersimpan di halaman /sortir (langkah 2). */
  openSaved(scen: string, customScenario?: SortirScenario) {
    if (customScenario) {
      useSortir.getState().resetFlow({
        src: null,
        status: 'done',
        scen: null,
        customScenario,
        step: 2,
        maxStep: 5,
        action: customScenario.rec,
      });
      return;
    }
    const key = (scen === 'jeans' || scen === 'bottle' || scen === 'chair' ? scen : 'jeans') as ScenarioKey;
    useSortir.getState().resetFlow({
      src: { kind: 'sample', key },
      status: 'done',
      scen: key,
      customScenario: null,
      step: 2,
      maxStep: 5,
      action: scenario(key).rec,
    });
  },
};

export function useSavedAnalyses() {
  return useSortir((s) => s.saved);
}
