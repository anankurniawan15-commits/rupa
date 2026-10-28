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
  constructor(public readonly kind: GroqErrorKind, public readonly status?: number) {
    super('groq_' + kind + (status ? '_' + status : ''));
    this.name = 'GroqError';
  }
}

const CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_CHAT_MODEL = 'llama-3.3-70b-versatile';
export const GROQ_TIMEOUT_MS = 9_000;
const DEFAULT_MAX_TOKENS = 512;
const DEFAULT_TEMPERATURE = 0.3;
const RETRY_DELAY_MS = 400;
/** Coba ulang hanya kalau sisa waktu masih cukup untuk satu panggilan yang berguna. */
const MIN_RETRY_BUDGET_MS = 2_500;

const CompletionSchema = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string().nullable() }) })).min(1),
});

const isTransient = (e: unknown) => e instanceof GroqError && e.kind === 'http' && (e.status === 429 || (e.status ?? 0) >= 500);
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function requestOnce(key: string, messages: GroqMessage[], opts: ChatOptions, timeoutMs: number): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(CHAT_URL, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.GROQ_CHAT_MODEL || DEFAULT_CHAT_MODEL,
        messages,
        temperature: opts.temperature ?? DEFAULT_TEMPERATURE,
        max_tokens: opts.maxTokens ?? DEFAULT_MAX_TOKENS,
        ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new GroqError('http', res.status);
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
  /** Satu chat completion → teks jawaban. 429/5xx dicoba ulang maksimal sekali dalam batas waktu yang sama. */
  async chat(messages: GroqMessage[], opts: ChatOptions = {}): Promise<string> {
    const key = process.env.GROQ_API_KEY;
    if (!key) throw new GroqError('config');
    const timeoutMs = opts.timeoutMs ?? GROQ_TIMEOUT_MS;
    const deadline = Date.now() + timeoutMs;
    try {
      return await requestOnce(key, messages, opts, timeoutMs);
    } catch (e) {
      const remaining = deadline - Date.now() - RETRY_DELAY_MS;
      if (!isTransient(e) || remaining < MIN_RETRY_BUDGET_MS) throw e;
      await sleep(RETRY_DELAY_MS);
      return requestOnce(key, messages, opts, remaining);
    }
  },
  async vision(_imageBase64: string, _prompt: string): Promise<string> {
    if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY belum diisi. Fase ini tidak menganalisis foto sungguhan.');
    throw new Error('Stub: kirim gambar ke model vision Groq dari route handler.');
  },
};
