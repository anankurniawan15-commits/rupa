import 'server-only';
import { z } from 'zod';
import {
  classifyHttpStatusForRotation,
  collectKeysFromEnv,
  executeWithKeyRotation,
  isTokenOrQuotaMessage,
  parseRetryAfterFromText,
  RotatingKeyPool,
} from '@/lib/ai/key-rotation';

/**
 * Client Groq Text (API kompatibel OpenAI) dengan rotasi API Key otomatis (Round-Robin + Cooldown).
 * Hanya dipakai di server (`server-only`) untuk pembuatan teks saran, assistant, dan listing.
 * Analisis gambar tidak memakai Groq Vision, melainkan model Computer Vision jurnal internasional.
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
  /** Batas waktu total termasuk rotasi/coba ulang. */
  timeoutMs?: number;
  /** Model override (opsional). */
  model?: string;
}

export type GroqErrorKind = 'config' | 'http' | 'timeout' | 'network' | 'format';

/** Galat Groq tanpa isi rahasia, supaya aman dicatat di log server & dipakai rotasi. */
export class GroqError extends Error {
  constructor(
    public readonly kind: GroqErrorKind,
    public readonly status?: number,
    public readonly retryAfterMs?: number,
    public readonly detail?: string,
  ) {
    super('groq_' + kind + (status ? '_' + status : ''));
    this.name = 'GroqError';
  }
}

const DEFAULT_BASE_URL = 'https://api.groq.com/openai/v1';
const getBaseUrl = () => (process.env.OPENAI_COMPATIBLE_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
const getChatUrl = () => getBaseUrl() + '/chat/completions';
const isGroqEndpoint = () => getBaseUrl().includes('api.groq.com');

// llama-3.3-70b-versatile dimatikan Groq 16 Agustus 2026; ini pengganti yang direkomendasikan.
const DEFAULT_CHAT_MODEL = 'openai/gpt-oss-120b';
const FALLBACK_CHAT_MODEL = 'llama-3.3-70b-versatile';
const DEFAULT_VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';
const FALLBACK_VISION_MODELS = [
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'meta-llama/llama-4-maverick-17b-128e-instruct',
  'qwen/qwen2.5-vl-7b-instruct',
];

function resolveChatModel(): string {
  const explicit = process.env.GROQ_TEXT_MODEL?.trim() || process.env.GROQ_CHAT_MODEL?.trim();
  if (explicit) return explicit;
  const legacy = process.env.TEXT_MODEL?.trim();
  if (!legacy) return DEFAULT_CHAT_MODEL;
  if (isGroqEndpoint() && legacy === 'llama-3.3-70b-versatile') return DEFAULT_CHAT_MODEL;
  return legacy;
}

function resolveVisionModels(override?: string): string[] {
  const primary = override?.trim() || process.env.GROQ_VISION_MODEL?.trim();
  return Array.from(new Set([primary, DEFAULT_VISION_MODEL, ...FALLBACK_VISION_MODELS].filter(Boolean) as string[]));
}

export const GROQ_TIMEOUT_MS = 9_000;
const getConfiguredTimeoutMs = (fallbackMs: number, minMs = 0) => {
  const raw = Number(process.env.REQUEST_TIMEOUT);
  if (Number.isFinite(raw) && raw > 0) {
    return Math.max(minMs, Math.min(30_000, Math.round(raw * 1_000)));
  }
  return fallbackMs;
};
const DEFAULT_MAX_TOKENS = 512;
const REASONING_TOKEN_HEADROOM = 512;
const isReasoningModel = (model: string) => model.startsWith('openai/gpt-oss');
const DEFAULT_TEMPERATURE = 0.3;
const RETRY_DELAY_MS = 350;
const MIN_RETRY_BUDGET_MS = 2_000;
const MAX_RETRY_WAIT_MS = 1_800;

const CompletionSchema = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string().nullable() }) })).min(1),
});

const isTransient = (e: unknown): e is GroqError =>
  e instanceof GroqError && e.kind === 'http' && (e.status === 429 || (e.status ?? 0) >= 500);
const isUnsupportedModelError = (e: unknown): e is GroqError =>
  e instanceof GroqError && e.kind === 'http' && (e.status === 400 || e.status === 404);
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const globalForGroqPool = globalThis as typeof globalThis & { __rupaGroqKeyPool?: RotatingKeyPool };
const groqPool = (globalForGroqPool.__rupaGroqKeyPool ??= new RotatingKeyPool(60_000));

function retryAfterMs(header: string | null): number | undefined {
  if (!header) return undefined;
  const trimmed = header.trim();
  const sec = Number(trimmed);
  if (Number.isFinite(sec) && sec >= 0) return sec * 1_000;
  return parseRetryAfterFromText(trimmed);
}

async function readSafeErrorInfo(res: Response): Promise<{ detail?: string; retryMs?: number }> {
  const headerRetry =
    retryAfterMs(res.headers.get('retry-after')) ??
    parseRetryAfterFromText(res.headers.get('x-ratelimit-reset-tokens') ?? undefined) ??
    parseRetryAfterFromText(res.headers.get('x-ratelimit-reset-requests') ?? undefined);
  let rawText = '';
  try {
    rawText = await res.text();
  } catch {
    return { retryMs: headerRetry };
  }
  let detail = '';
  try {
    const parsed = JSON.parse(rawText) as { error?: { code?: unknown; message?: unknown; type?: unknown } };
    const code = typeof parsed?.error?.code === 'string' ? parsed.error.code : '';
    const type = typeof parsed?.error?.type === 'string' ? parsed.error.type : '';
    const msg = typeof parsed?.error?.message === 'string' ? parsed.error.message : '';
    detail = [code, type, msg].filter(Boolean).join(': ');
  } catch {
    detail = rawText;
  }
  const sanitized = detail
    .replace(/\b(gsk_|AIza)[A-Za-z0-9_-]{8,}\b/g, '[redacted]')
    .slice(0, 240)
    .trim();
  const retryMs = headerRetry ?? parseRetryAfterFromText(sanitized);
  return { detail: sanitized || undefined, retryMs };
}

type GroqWireMessage =
  | GroqMessage
  | {
      role: 'user';
      content: ({ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } })[];
    };

async function requestOnce(
  key: string,
  messages: GroqWireMessage[],
  opts: ChatOptions,
  timeoutMs: number,
  defaultModel: string,
): Promise<{ text: string; model: string }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const model = opts.model || defaultModel;
  const reasoning = isReasoningModel(model);
  const maxTokens = opts.maxTokens ?? DEFAULT_MAX_TOKENS;
  try {
    const res = await fetch(getChatUrl(), {
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
    if (!res.ok) {
      const errInfo = await readSafeErrorInfo(res);
      throw new GroqError('http', res.status, errInfo.retryMs, errInfo.detail);
    }
    const parsed = CompletionSchema.safeParse(await res.json());
    const content = parsed.success ? parsed.data.choices[0].message.content : null;
    if (!content) throw new GroqError('format');
    return { text: content, model };
  } catch (e) {
    if (e instanceof GroqError) throw e;
    throw new GroqError(ctrl.signal.aborted ? 'timeout' : 'network');
  } finally {
    clearTimeout(timer);
  }
}

function isQuotaOrTokenError(err: unknown): err is GroqError {
  return (
    err instanceof GroqError &&
    err.kind === 'http' &&
    (err.status === 429 || err.status === 402 || err.status === 413 || isTokenOrQuotaMessage(err.detail))
  );
}

async function callSingleKeyWithModelFallback(
  key: string,
  messages: GroqWireMessage[],
  opts: ChatOptions,
  models: string[],
  deadline: number,
  perKeyCapMs: number,
  hasBackupKeys: boolean,
): Promise<{ text: string; model: string }> {
  let lastError: unknown;
  const keyDeadline = Math.min(deadline, Date.now() + perKeyCapMs);
  for (let i = 0; i < models.length; i++) {
    const m = models[i];
    const remaining = keyDeadline - Date.now();
    if (remaining < MIN_RETRY_BUDGET_MS && i > 0) break;
    try {
      return await requestOnce(key, messages, { ...opts, model: m }, Math.max(MIN_RETRY_BUDGET_MS, remaining), m);
    } catch (e) {
      lastError = e;
      if (isQuotaOrTokenError(lastError)) {
        if (hasBackupKeys) {
          throw lastError;
        }
      }
      if (opts.json && e instanceof GroqError && e.kind === 'http' && e.status === 400 && !isTokenOrQuotaMessage(e.detail)) {
        const remNoJson = keyDeadline - Date.now();
        if (remNoJson >= MIN_RETRY_BUDGET_MS) {
          try {
            return await requestOnce(key, messages, { ...opts, json: false, model: m }, remNoJson, m);
          } catch (e2) {
            lastError = e2;
          }
        }
      }
      if (isUnsupportedModelError(lastError) && !isQuotaOrTokenError(lastError) && i + 1 < models.length) {
        continue;
      }
      if (hasBackupKeys && isQuotaOrTokenError(lastError)) {
        throw lastError;
      }
      if (!hasBackupKeys && isTransient(lastError)) {
        const wait = Math.max(RETRY_DELAY_MS, (lastError as GroqError).retryAfterMs ?? 0);
        const remAfterWait = keyDeadline - Date.now() - wait;
        if (wait <= MAX_RETRY_WAIT_MS && remAfterWait >= MIN_RETRY_BUDGET_MS) {
          await sleep(wait);
          try {
            return await requestOnce(key, messages, { ...opts, model: m }, remAfterWait, m);
          } catch (e3) {
            lastError = e3;
          }
        }
        if (i + 1 < models.length) continue;
      }
      throw lastError;
    }
  }
  throw lastError;
}

export function getGroqKeys(): string[] {
  return collectKeysFromEnv(process.env, 'GROQ');
}

function classifyGroqError(err: unknown) {
  if (err instanceof GroqError) {
    if (err.kind === 'http') return classifyHttpStatusForRotation(err.status, err.retryAfterMs, err.detail);
    if (err.kind === 'timeout' || err.kind === 'network') {
      return { rotate: true, cooldownMs: 15_000, reason: err.kind };
    }
  }
  return { rotate: false, cooldownMs: 0, reason: 'format' };
}

export const groq = {
  hasKeys(): boolean {
    return getGroqKeys().length > 0;
  },

  hasHealthyKey(): boolean {
    const keys = getGroqKeys();
    return keys.length > 0 && groqPool.hasHealthyKey(keys);
  },

  async chatWithMeta(messages: GroqMessage[], opts: ChatOptions = {}): Promise<{ text: string; provider: 'Groq'; model: string }> {
    const keys = getGroqKeys();
    if (!keys.length) throw new GroqError('config');

    const preferredModel = opts.model || resolveChatModel();
    const models = Array.from(
      new Set([preferredModel, DEFAULT_CHAT_MODEL, isGroqEndpoint() ? '' : FALLBACK_CHAT_MODEL].filter(Boolean)),
    );
    const timeoutMs = opts.timeoutMs ?? getConfiguredTimeoutMs(GROQ_TIMEOUT_MS);
    const deadline = Date.now() + timeoutMs;
    const perKeyCapMs = keys.length > 1 ? Math.max(4_500, Math.floor(timeoutMs / Math.min(keys.length, 2))) : timeoutMs;

    const out = await executeWithKeyRotation(
      keys,
      groqPool,
      async (key, idx) => {
        if (idx > 0 && deadline - Date.now() < MIN_RETRY_BUDGET_MS) {
          throw new GroqError('timeout');
        }
        return callSingleKeyWithModelFallback(key, messages, opts, models, deadline, perKeyCapMs, keys.length > 1);
      },
      classifyGroqError,
    );
    return { ...out, provider: 'Groq' };
  },

  async chat(messages: GroqMessage[], opts: ChatOptions = {}): Promise<string> {
    const out = await this.chatWithMeta(messages, opts);
    return out.text;
  },

  async vision(
    imageDataUrl: string,
    prompt: string,
    opts: ChatOptions = {},
  ): Promise<{ text: string; provider: 'Groq'; model: string }> {
    const keys = getGroqKeys();
    if (!keys.length) throw new GroqError('config');

    const models = resolveVisionModels(opts.model);
    const timeoutMs = opts.timeoutMs ?? getConfiguredTimeoutMs(14_000);
    const deadline = Date.now() + timeoutMs;
    const perKeyCapMs = keys.length > 1 ? Math.max(6_000, Math.floor(timeoutMs / Math.min(keys.length, 2))) : timeoutMs;
    const wireMessages: GroqWireMessage[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageDataUrl } },
        ],
      },
    ];

    const out = await executeWithKeyRotation(
      keys,
      groqPool,
      async (key, idx) => {
        if (idx > 0 && deadline - Date.now() < MIN_RETRY_BUDGET_MS) {
          throw new GroqError('timeout');
        }
        return callSingleKeyWithModelFallback(
          key,
          wireMessages,
          { ...opts, json: opts.json ?? true, temperature: opts.temperature ?? 0.2, maxTokens: opts.maxTokens ?? 1200 },
          models,
          deadline,
          perKeyCapMs,
          keys.length > 1,
        );
      },
      classifyGroqError,
    );
    return { ...out, provider: 'Groq' };
  },
};
