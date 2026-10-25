/**
 * Mesin AI Sortir simulasi — port dari prototipe.
 * Foto unggahan sungguhan TIDAK dianalisis: hasilnya 'uploadChoice' (pengguna memilih jenis barang)
 * dan hasil diberi label "· contoh".
 * TODO(Groq): sortir.service.ts nanti memanggil Groq vision; ambang keyakinan & urutan aksi tetap di sini.
 */
import { SORTIR_ACTIONS, SORTIR_LOW_CONFIDENCE, SORTIR_SCENARIOS } from '@/lib/data';
import type { ActionKey, ScenarioKey, SortirOutcome, SortirScenario, SortirSource } from '@/types/ai';

export const LOW_CONFIDENCE = SORTIR_LOW_CONFIDENCE; // 60

/** Kenali skenario dari deskripsi teks manual. */
export function classifyText(text: string): ScenarioKey | null {
  const t = text.toLowerCase();
  if (/jeans|denim|jins/.test(t)) return 'jeans';
  if (/botol|plastik|galon|wadah plastik/.test(t)) return 'bottle';
  if (/kursi|meja|kayu|lemari|palet|rak/.test(t)) return 'chair';
  return null;
}

export function analyzeSource(src: SortirSource): SortirOutcome {
  if (src.kind === 'upload') return { status: 'uploadChoice' };
  if (src.kind === 'manual') {
    const k = classifyText(src.text);
    return { status: 'done', scen: k, low: !k };
  }
  if (src.key === 'screen') return { status: 'unsupported' };
  if (src.key === 'error') return { status: 'error' };
  if (src.key === 'blurry') return { status: 'done', scen: null, low: true };
  const scen = src.key as ScenarioKey;
  return { status: 'done', scen, low: SORTIR_SCENARIOS[scen].conf < LOW_CONFIDENCE };
}

export const scenario = (k: ScenarioKey): SortirScenario => SORTIR_SCENARIOS[k];

/** Lima aksi; yang disarankan ('rec') di urutan pertama. */
export function orderedActions(k: ScenarioKey) {
  const S = SORTIR_SCENARIOS[k];
  return SORTIR_ACTIONS.slice()
    .sort((a, b) => Number(S.actions[b[0]][0] === 'rec') - Number(S.actions[a[0]][0] === 'rec'))
    .map(([key, title]) => ({ key, title, body: S.actions[key][1], rec: S.actions[key][0] === 'rec', caution: S.actions[key][0] === 'caution' }));
}

export const actionTitle = (k: ActionKey) => (SORTIR_ACTIONS.find((a) => a[0] === k) || ['', ''])[1];

export function confidenceClass(conf: number) {
  return conf >= 80 ? 'cf-hi' : conf >= LOW_CONFIDENCE ? 'cf-mid' : 'cf-lo';
}

export const LOAD_LINES = ['Mengamati bentuk dan permukaan barang', 'Memperkirakan material dan kondisi', 'Menyusun saran langkah berikutnya'];
export const LOW_PICKS: [ScenarioKey, string][] = [['jeans', 'Tekstil (mis. jeans)'], ['bottle', 'Plastik'], ['chair', 'Kayu']];
export const UPLOAD_PICKS: [ScenarioKey, string][] = [['jeans', 'Pakaian atau kain (contoh: jeans)'], ['bottle', 'Botol atau wadah plastik'], ['chair', 'Furnitur kayu']];
export const SORTIR_STEPS = ['Unggah', 'Identifikasi', 'Langkah', 'Ide', 'Marketplace'];

export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_BYTES = 10 * 1024 * 1024;

export function validateFile(f: { type: string; size: number }): string {
  if (ACCEPTED_TYPES.indexOf(f.type) < 0) return 'Format belum didukung. Gunakan JPG, PNG, atau WebP.';
  if (f.size > MAX_BYTES) return 'Ukuran foto lebih dari 10 MB. Coba kompres atau foto ulang.';
  return '';
}
