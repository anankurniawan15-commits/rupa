/**
 * Mesin AI Sortir — pendukung alur contoh, kompresi/konversi foto dari browser,
 * serta helper aksi dan kategori material RUPA (8 kategori + unknown).
 */
import { SORTIR_ACTIONS, SORTIR_LOW_CONFIDENCE, SORTIR_SCENARIOS } from '@/lib/data';
import type { ActionKey, ScenarioKey, SortirMaterialCategory, SortirOutcome, SortirScenario, SortirSource } from '@/types/ai';

export const LOW_CONFIDENCE = SORTIR_LOW_CONFIDENCE; // 60

/** Kenali skenario contoh dari deskripsi teks manual (untuk helper lokal). */
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
  return { status: 'done', scen, low: (SORTIR_SCENARIOS[scen].conf ?? 100) < LOW_CONFIDENCE };
}

export const scenario = (k: ScenarioKey): SortirScenario => SORTIR_SCENARIOS[k];

/** Lima aksi untuk skenario dinamis maupun contoh; yang disarankan ('rec') di urutan pertama. */
export function orderedActionsFor(S: SortirScenario) {
  return SORTIR_ACTIONS.slice()
    .sort((a, b) => Number(S.actions[b[0]][0] === 'rec') - Number(S.actions[a[0]][0] === 'rec'))
    .map(([key, title]) => ({
      key,
      title,
      body: S.actions[key][1],
      rec: S.actions[key][0] === 'rec',
      caution: S.actions[key][0] === 'caution',
    }));
}

/** Lima aksi; yang disarankan ('rec') di urutan pertama. */
export function orderedActions(k: ScenarioKey) {
  return orderedActionsFor(SORTIR_SCENARIOS[k]);
}

export const actionTitle = (k: ActionKey) => (SORTIR_ACTIONS.find((a) => a[0] === k) || ['', ''])[1];

export function confidenceClass(conf: number) {
  return conf >= 80 ? 'cf-hi' : conf >= LOW_CONFIDENCE ? 'cf-mid' : 'cf-lo';
}

export const LOAD_LINES = [
  'Mengamati bentuk dan permukaan barang',
  'Memperkirakan material dan memeriksa keamanan',
  'Menyusun saran langkah dan ide pemanfaatan',
];

export const MATERIAL_PICKS: [Exclude<SortirMaterialCategory, 'unknown'>, string][] = [
  ['Tekstil', 'Tekstil (kain / jeans / pakaian)'],
  ['Plastik', 'Plastik (botol / wadah / tutup)'],
  ['Kertas', 'Kertas atau kardus'],
  ['Kaca', 'Kaca (botol / toples)'],
  ['Logam', 'Logam atau kaleng'],
  ['Kayu', 'Kayu atau furnitur'],
  ['Karet', 'Karet atau ban dalam'],
  ['Lainnya / Campuran', 'Lainnya / Campuran'],
];

export const LOW_PICKS = MATERIAL_PICKS;
export const UPLOAD_PICKS = MATERIAL_PICKS;
export const SORTIR_STEPS = ['Unggah', 'Identifikasi', 'Langkah', 'Ide', 'Marketplace'];

export const ACCEPTED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
  'image/bmp',
  'image/x-icon',
  'image/heic',
  'image/heif',
];

const ACCEPTED_EXT_RE = /\.(jpe?g|jfif|pjp|pjpeg|png|webp|avif|gif|bmp|heic|heif)$/i;
export const ACCEPT_IMAGE_ATTR = 'image/*,.jpg,.jpeg,.jfif,.png,.webp,.avif,.bmp,.gif,.heic,.heif';
export const MAX_BYTES = 25 * 1024 * 1024;

export function validateFile(f: { type: string; size: number; name?: string }): string {
  const mime = (f.type || '').toLowerCase().trim();
  const name = (f.name || '').toLowerCase().trim();
  const mimeOk = mime.startsWith('image/') || ACCEPTED_TYPES.includes(mime);
  const extOk = ACCEPTED_EXT_RE.test(name);
  if (!mimeOk && !extOk) {
    return 'Format belum didukung. Gunakan file gambar seperti JPG, JPEG, JFIF, PNG, WebP, atau AVIF.';
  }
  if (f.size > MAX_BYTES) return 'Ukuran foto lebih dari 25 MB. Coba kompres atau pilih foto lain.';
  return '';
}

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

function loadImageElement(srcUrl: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = srcUrl;
  });
}

/**
 * Mengubah dan mengecilkan gambar apa pun yang bisa dirender browser (termasuk AVIF, JFIF, WebP, PNG)
 * menjadi data URL JPEG (maks. 1280px) agar konsisten diterima oleh Vision API.
 */
export async function compressImageToDataUrl(file: File, maxDim = 1280, quality = 0.82): Promise<string> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return '';

  const drawToJpeg = (source: CanvasImageSource, width: number, height: number): string => {
    const scale = Math.min(1, maxDim / Math.max(width, height));
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(source, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', quality);
  };

  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      const out = drawToJpeg(bitmap, bitmap.width, bitmap.height);
      bitmap.close();
      if (out) return out;
    } catch {
      /* fallback ke HTMLImageElement / FileReader */
    }
  }

  let objectUrl = '';
  try {
    objectUrl = URL.createObjectURL(file);
    const img = await loadImageElement(objectUrl);
    if (img && img.naturalWidth > 0) {
      const out = drawToJpeg(img, img.naturalWidth, img.naturalHeight);
      if (out) return out;
    }
  } catch {
    /* lanjut ke FileReader */
  } finally {
    if (objectUrl) {
      try {
        URL.revokeObjectURL(objectUrl);
      } catch {
        /* noop */
      }
    }
  }

  const rawDataUrl = await readAsDataUrl(file);
  if (!rawDataUrl) return '';
  const img = await loadImageElement(rawDataUrl);
  if (img && img.naturalWidth > 0) {
    const out = drawToJpeg(img, img.naturalWidth, img.naturalHeight);
    if (out) return out;
  }
  return /^data:image\/(jpeg|jpg|png|webp)/i.test(rawDataUrl) ? rawDataUrl : '';
}
