/**
 * Rate limit jendela tetap di memori. HANYA UNTUK DEMO: hitungan disimpan per instans server,
 * hilang saat restart, dan tidak dibagi antar-instans (serverless). Produksi butuh penyimpanan bersama.
 */
export interface RateResult {
  ok: boolean;
  /** Detik sampai jendela berikutnya (untuk header Retry-After). */
  retryAfterSec: number;
}

/** Batas jumlah kunci supaya memori tidak tumbuh tanpa batas saat banyak IP berbeda. */
const MAX_KEYS = 10_000;

/** `take(key, now)` menghitung satu permintaan; `now` diinjeksi supaya bisa diuji. */
export function createRateLimiter(limit: number, windowMs: number) {
  const hits = new Map<string, { start: number; count: number }>();
  const sweep = (now: number) => {
    for (const [k, w] of hits) if (now - w.start >= windowMs) hits.delete(k);
    if (hits.size >= MAX_KEYS) hits.clear();
  };
  return function take(key: string, now: number): RateResult {
    let w = hits.get(key);
    if (!w || now - w.start >= windowMs) {
      if (!w && hits.size >= MAX_KEYS) sweep(now);
      w = { start: now, count: 0 };
      hits.set(key, w);
    }
    w.count += 1;
    if (w.count <= limit) return { ok: true, retryAfterSec: 0 };
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((w.start + windowMs - now) / 1000)) };
  };
}
