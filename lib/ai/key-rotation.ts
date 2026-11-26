/**
 * Manajemen pool & rotasi API Key (Round-Robin + Cooldown saat limit/token habis).
 * Dipakai di server oleh klien Groq & Gemini teks agar layanan saran pengolahan material
 * tetap berjalan meski salah satu key terkena rate limit (429) atau kuota habis.
 */

export interface KeyCooldownEntry {
  until: number;
  reason: string;
}

export interface KeyAttemptOutcome {
  ok: boolean;
  /** Apakah kesalahan bersifat fatal terhadap key ini (429/402/401/403/5xx/timeout) sehingga perlu rotasi ke key berikutnya. */
  rotate?: boolean;
  /** Lama cooldown dalam ms bila key harus diistirahatkan sementara. */
  cooldownMs?: number;
  reason?: string;
}

/**
 * Ekstrak daftar API key unik dari variabel lingkungan:
 *  - `<PREFIX>_API_KEYS` (dipisah koma, titik koma, spasi, atau baris baru)
 *  - `<PREFIX>_API_KEY` (satu key atau dipisah koma/baris baru)
 *  - `<PREFIX>_API_KEY_1` s.d. `<PREFIX>_API_KEY_20`
 */
export function collectKeysFromEnv(
  env: Record<string, string | undefined>,
  prefix: 'GROQ' | 'GEMINI',
): string[] {
  const seen = new Set<string>();
  const keys: string[] = [];

  const pushRaw = (raw: string | undefined) => {
    if (!raw) return;
    for (const part of raw.split(/[\s,;]+/)) {
      const k = part.trim();
      if (k && !seen.has(k)) {
        seen.add(k);
        keys.push(k);
      }
    }
  };

  pushRaw(env[`${prefix}_API_KEYS`]);
  pushRaw(env[`${prefix}_API_KEY`]);
  for (let i = 1; i <= 20; i++) {
    pushRaw(env[`${prefix}_API_KEY_${i}`]);
  }
  return keys;
}

export class RotatingKeyPool {
  private cursor = 0;
  private cooldowns = new Map<string, KeyCooldownEntry>();

  constructor(private readonly defaultCooldownMs = 60_000) {}

  /** Pilih key yang aktif dalam urutan round-robin: key sehat didahulukan, lalu key cooldown paling cepat pulih. */
  orderKeys(keys: readonly string[], now = Date.now()): string[] {
    if (keys.length <= 1) return [...keys];

    const start = this.cursor % keys.length;
    this.cursor = (this.cursor + 1) % keys.length;

    const rotated: string[] = [];
    for (let i = 0; i < keys.length; i++) {
      rotated.push(keys[(start + i) % keys.length]);
    }

    const healthy: string[] = [];
    const cooling: { key: string; until: number }[] = [];

    for (const key of rotated) {
      const cd = this.cooldowns.get(key);
      if (cd && cd.until > now) {
        cooling.push({ key, until: cd.until });
      } else {
        if (cd && cd.until <= now) this.cooldowns.delete(key);
        healthy.push(key);
      }
    }

    cooling.sort((a, b) => a.until - b.until);
    return [...healthy, ...cooling.map((c) => c.key)];
  }

  markCooldown(key: string, durationMs?: number, reason = 'rate_limit', now = Date.now()): void {
    const ms = Math.max(1_000, durationMs ?? this.defaultCooldownMs);
    this.cooldowns.set(key, { until: now + ms, reason });
  }

  clearCooldown(key: string): void {
    this.cooldowns.delete(key);
  }

  isCoolingDown(key: string, now = Date.now()): boolean {
    const cd = this.cooldowns.get(key);
    if (!cd) return false;
    if (cd.until <= now) {
      this.cooldowns.delete(key);
      return false;
    }
    return true;
  }

  hasHealthyKey(keys: readonly string[], now = Date.now()): boolean {
    return keys.some((k) => !this.isCoolingDown(k, now));
  }

  getCooldownInfo(key: string, now = Date.now()): KeyCooldownEntry | null {
    if (!this.isCoolingDown(key, now)) return null;
    return this.cooldowns.get(key) ?? null;
  }

  activeCooldownCount(keys: readonly string[], now = Date.now()): number {
    return keys.filter((k) => this.isCoolingDown(k, now)).length;
  }

  reset(): void {
    this.cursor = 0;
    this.cooldowns.clear();
  }
}

export interface KeyErrorClassification {
  rotate: boolean;
  cooldownMs: number;
  reason: string;
}

const TOKEN_QUOTA_REGEX =
  /\b(429|402|413|tpd|tpm|rpd|rpm)\b|rate[_ -]?limit|insufficient[_ -]?quota|quota|resource[_ -]?exhausted|tokens?\s+per\s+(day|minute|hour)|too\s+many\s+requests|limit\s+reached|credit\s+balance|exceeded/i;

const DAILY_QUOTA_REGEX =
  /tokens?\s+per\s+day|requests?\s+per\s+day|\btpd\b|\brpd\b|daily\s+limit|insufficient[_ -]?quota|credit\s+balance/i;

export function isTokenOrQuotaMessage(message?: string): boolean {
  return Boolean(message && TOKEN_QUOTA_REGEX.test(message));
}

export function isDailyQuotaMessage(message?: string): boolean {
  return Boolean(message && DAILY_QUOTA_REGEX.test(message));
}

/**
 * Ekstrak estimasi tunggu (ms) dari teks error seperti:
 * "Please try again in 42.5s", "try again in 2m10s", atau "retryDelay: 30s".
 */
export function parseRetryAfterFromText(message?: string): number | undefined {
  if (!message) return undefined;
  const minSec = /(?:try again in|retry(?: after| in|Delay)?[:\s"]*)\s*(\d+)\s*m(?:in(?:utes?)?)?\s*(\d+(?:\.\d+)?)?\s*s/i.exec(
    message,
  );
  if (minSec) {
    const mins = Number(minSec[1] || 0);
    const secs = Number(minSec[2] || 0);
    const total = (mins * 60 + secs) * 1_000;
    if (Number.isFinite(total) && total > 0) return Math.round(total);
  }
  const secOnly = /(?:try again in|retry(?: after| in|Delay)?[:\s"]*)\s*(\d+(?:\.\d+)?)\s*(ms|s|sec|seconds?)\b/i.exec(
    message,
  );
  if (secOnly) {
    const val = Number(secOnly[1]);
    if (!Number.isFinite(val) || val <= 0) return undefined;
    return secOnly[2].toLowerCase() === 'ms' ? Math.round(val) : Math.round(val * 1_000);
  }
  return undefined;
}

export function classifyHttpStatusForRotation(
  status?: number,
  retryAfterMs?: number,
  errorMessage?: string,
): KeyErrorClassification {
  const quotaHit =
    status === 402 || status === 429 || status === 413 || isTokenOrQuotaMessage(errorMessage);

  if ((status === 401 || status === 403) && !quotaHit) {
    return { rotate: true, cooldownMs: 300_000, reason: `auth_${status}` };
  }

  if (quotaHit) {
    const parsedWait = retryAfterMs ?? parseRetryAfterFromText(errorMessage);
    const defaultWait = isDailyQuotaMessage(errorMessage) ? 300_000 : 60_000;
    const wait =
      parsedWait && parsedWait > 0
        ? Math.min(600_000, Math.max(15_000, parsedWait))
        : defaultWait;
    return { rotate: true, cooldownMs: wait, reason: `quota_${status ?? 'limit'}` };
  }

  if (status && status >= 500) {
    return { rotate: true, cooldownMs: 15_000, reason: `server_${status}` };
  }
  if (status === 400 || status === 404) {
    return { rotate: false, cooldownMs: 0, reason: `client_${status}` };
  }
  return { rotate: true, cooldownMs: 20_000, reason: 'transient' };
}

/**
 * Jalankan pemanggilan dengan rotasi otomatis ke semua key di `keys`.
 * Jika satu key terkena limit/token/auth/5xx, key diistirahatkan di `pool` lalu langsung mencoba key berikutnya.
 */
export async function executeWithKeyRotation<T>(
  keys: readonly string[],
  pool: RotatingKeyPool,
  fn: (key: string, attemptIndex: number) => Promise<T>,
  classifyError: (err: unknown) => KeyErrorClassification,
  nowFn: () => number = () => Date.now(),
): Promise<T> {
  if (!keys.length) {
    throw new Error('no_keys_configured');
  }
  const ordered = pool.orderKeys(keys, nowFn());
  let lastError: unknown;

  for (let i = 0; i < ordered.length; i++) {
    const key = ordered[i];
    try {
      const result = await fn(key, i);
      pool.clearCooldown(key);
      return result;
    } catch (err) {
      lastError = err;
      const cls = classifyError(err);
      if (cls.cooldownMs > 0) {
        pool.markCooldown(key, cls.cooldownMs, cls.reason, nowFn());
      }
      if (!cls.rotate || i === ordered.length - 1) {
        throw err;
      }
    }
  }

  throw lastError;
}
