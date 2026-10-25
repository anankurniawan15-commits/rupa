'use client';
/**
 * SortirService — AI Sortir (simulasi). Foto sungguhan tidak dianalisis di versi ini.
 * TODO(Groq): analyze(image) → lib/clients/groq.ts vision(image, prompt) lalu dipetakan ke SortirScenario.
 */
import { PRODUCTS, SELLERS, SORTIR_SAMPLES } from '@/lib/data';
import { useSortir } from '@/lib/store/sortir';
import { analyzeSource, orderedActions, scenario } from '@/lib/ai/sortir-engine';
import { delay } from './util';
import type { ActionKey, ScenarioKey, SortirOutcome, SortirSource } from '@/types/ai';

export const SAMPLE_ENTRIES = Object.entries(SORTIR_SAMPLES) as [keyof typeof SORTIR_SAMPLES, (typeof SORTIR_SAMPLES)[keyof typeof SORTIR_SAMPLES]][];
export const sampleOf = (k: keyof typeof SORTIR_SAMPLES) => SORTIR_SAMPLES[k];

export const sortirService = {
  /**
   * Total ±2,5 detik; onProgress(0..2) untuk tiga baris progres. Bisa dibatalkan (AbortSignal).
   */
  async analyze(src: SortirSource, onProgress?: (idx: number) => void, signal?: AbortSignal): Promise<SortirOutcome> {
    onProgress?.(0);
    await delay(850, signal);
    onProgress?.(1);
    await delay(850, signal);
    onProgress?.(2);
    await delay(800, signal);
    return analyzeSource(src);
  },
  recommendActions: (k: ScenarioKey) => orderedActions(k),
  generateIdeas: (k: ScenarioKey, _action: ActionKey | null) => scenario(k).ideas,
  findCreators: (k: ScenarioKey) => scenario(k).creators.map((id) => SELLERS[id]),
  getScenario: scenario,
  /** Produk jadi dari material serupa (langkah 5). */
  findSimilar: (k: ScenarioKey) => scenario(k).similar.map((id) => PRODUCTS.find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => !!p),

  /** Simpan hasil (tanpa foto) ke profil. */
  async save(title: string, scen: ScenarioKey): Promise<void> {
    const { saved, setSaved } = useSortir.getState();
    setSaved([{ id: 's' + Date.now(), title, date: 'Disimpan hari ini', scen }, ...saved]);
  },
  async removeSaved(id: string): Promise<void> {
    const { saved, setSaved } = useSortir.getState();
    setSaved(saved.filter((x) => x.id !== id));
  },
  /** Buka lagi hasil tersimpan di halaman /sortir (langkah 2). */
  openSaved(scen: ScenarioKey) {
    useSortir.getState().resetFlow({ src: { kind: 'sample', key: scen }, status: 'done', scen, step: 2, maxStep: 5, action: scenario(scen).rec });
  },
};

export function useSavedAnalyses() {
  return useSortir((s) => s.saved);
}
