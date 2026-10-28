import 'server-only';
import { z } from 'zod';

/**
 * Client Groq (API kompatibel OpenAI). Hanya boleh dipanggil di server (route handler),
 * karena GROQ_API_KEY rahasia — `server-only` membuat build gagal kalau modul ini terimpor ke klien.
 *
 * Dipakai oleh:
 *  - assistant (app/api/assistant) → chat(messages, opts)
 *  - listing-assist                → chat(messages, opts) (belum disambung)
 *  - sortir.service                → vision(image, prompt) (STUB)
 */
export interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  /** Minta keluaran JSON (`response_format: json_object`); prompt wajib menyebut kata "JSON". */
  json?: boolean;
  temperature?: number;
  maxTokens?: number;
  /** Batas waktu total termasuk satu kali coba ulang. */
  timeoutMs?: number;
}

export type GroqErrorKind = 'config' | 'http' | 'timeout' | 'network' | 'format';

/** Galat Groq tanpa isi respons, supaya aman dicatat di log server. */
export class GroqError extends Error {
  constructor(public readonly kind: GroqErrorKind, public readonly status?: number, public readonly retryAfterMs?: number) {
    super('groq_' + kind + (status ? '_' + status : ''));
    this.name = 'GroqError';
  }
}

const CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';
// llama-3.3-70b-versatile dimatikan Groq 16 Agustus 2026; ini pengganti yang direkomendasikan.
const DEFAULT_CHAT_MODEL = 'openai/gpt-oss-120b';
export const GROQ_TIMEOUT_MS = 9_000;
const DEFAULT_MAX_TOKENS = 512;
/**
 * Model gpt-oss bernalar dulu sebelum menjawab. Upaya nalar dibuat rendah supaya cepat, dan
 * token nalar diberi ruang tambahan supaya tidak menghabiskan `maxTokens` milik jawaban.
 */
const REASONING_TOKEN_HEADROOM = 512;
const isReasoningModel = (model: string) => model.startsWith('openai/gpt-oss');
const DEFAULT_TEMPERATURE = 0.3;
const RETRY_DELAY_MS = 400;
/** Coba ulang hanya kalau sisa waktu masih cukup untuk satu panggilan yang berguna. */
const MIN_RETRY_BUDGET_MS = 2_500;
/** `retry-after` lebih lama dari ini → langsung fallback, daripada pengguna menunggu lama untuk hasil yang sama. */
const MAX_RETRY_WAIT_MS = 2_000;

const CompletionSchema = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string().nullable() }) })).min(1),
});

const isTransient = (e: unknown): e is GroqError => e instanceof GroqError && e.kind === 'http' && (e.status === 429 || (e.status ?? 0) >= 500);
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Header `retry-after` (detik, boleh pecahan) yang dikirim Groq bersama 429. */
function retryAfterMs(header: string | null): number | undefined {
  const sec = Number(header);
  return header && Number.isFinite(sec) && sec >= 0 ? sec * 1_000 : undefined;
}

async function requestOnce(key: string, messages: GroqMessage[], opts: ChatOptions, timeoutMs: number): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const model = process.env.GROQ_CHAT_MODEL || DEFAULT_CHAT_MODEL;
  const reasoning = isReasoningModel(model);
  const maxTokens = opts.maxTokens ?? DEFAULT_MAX_TOKENS;
  try {
    const res = await fetch(CHAT_URL, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        temperature: opts.temperature ?? DEFAULT_TEMPERATURE,
        max_tokens: reasoning ? maxTokens + REASONING_TOKEN_HEADROOM : maxTokens,
        ...(reasoning ? { reasoning_effort: 'low', include_reasoning: false } : {}),
        ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new GroqError('http', res.status, retryAfterMs(res.headers.get('retry-after')));
    const parsed = CompletionSchema.safeParse(await res.json());
    const content = parsed.success ? parsed.data.choices[0].message.content : null;
    if (!content) throw new GroqError('format');
    return content;
  } catch (e) {
    if (e instanceof GroqError) throw e;
    throw new GroqError(ctrl.signal.aborted ? 'timeout' : 'network');
  } finally {
    clearTimeout(timer);
  }
}

export const groq = {
  /**
   * Satu chat completion → teks jawaban. 429/5xx dicoba ulang maksimal sekali dalam batas waktu
   * yang sama, setelah menunggu `retry-after` dari Groq (kalau ada).
   */
  async chat(messages: GroqMessage[], opts: ChatOptions = {}): Promise<string> {
    const key = process.env.GROQ_API_KEY;
    if (!key) throw new GroqError('config');
    const timeoutMs = opts.timeoutMs ?? GROQ_TIMEOUT_MS;
    const deadline = Date.now() + timeoutMs;
    try {
      return await requestOnce(key, messages, opts, timeoutMs);
    } catch (e) {
      if (!isTransient(e)) throw e;
      const wait = Math.max(RETRY_DELAY_MS, e.retryAfterMs ?? 0);
      const remaining = deadline - Date.now() - wait;
      if (wait > MAX_RETRY_WAIT_MS || remaining < MIN_RETRY_BUDGET_MS) throw e;
      await sleep(wait);
      return requestOnce(key, messages, opts, remaining);
    }
  },
  async vision(_imageBase64: string, _prompt: string): Promise<string> {
    if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY belum diisi. Fase ini tidak menganalisis foto sungguhan.');
    throw new Error('Stub: kirim gambar ke model vision Groq dari route handler.');
  },
};
