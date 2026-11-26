import 'server-only';
import { GoogleGenAI } from '@google/genai';
import {
  classifyHttpStatusForRotation,
  collectKeysFromEnv,
  executeWithKeyRotation,
  isTokenOrQuotaMessage,
  parseRetryAfterFromText,
  RotatingKeyPool,
} from '@/lib/ai/key-rotation';
import type { ChatOptions, GroqMessage } from './groq';

/**
 * Klien Gemini Text server-side (`@google/genai`) dengan rotasi API Key otomatis (Round-Robin + Cooldown).
 * Memakai `gemini-4-hydrogen` untuk saran teks pengolahan barang, assistant, dan listing.
 * Pengenalan gambar tidak memakai Gemini Vision, melainkan Computer Vision jurnal internasional.
 */
const DEFAULT_GEMINI_MODEL = 'gemini-4-hydrogen';

export class GeminiClientError extends Error {
  constructor(
    public readonly kind: 'config' | 'http' | 'format',
    public readonly status?: number,
    public readonly retryAfterMs?: number,
    public readonly detail?: string,
  ) {
    super('gemini_' + kind + (status ? '_' + status : ''));
    this.name = 'GeminiClientError';
  }
}

const globalForGeminiPool = globalThis as typeof globalThis & { __rupaGeminiKeyPool?: RotatingKeyPool };
const geminiPool = (globalForGeminiPool.__rupaGeminiKeyPool ??= new RotatingKeyPool(60_000));

function createClient(apiKey: string): GoogleGenAI {
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function extractErrorInfo(err: unknown): { status?: number; retryAfterMs?: number; detail?: string } {
  const seen = new Set<unknown>();
  const messages: string[] = [];
  let status: number | undefined;

  const visit = (node: unknown, depth: number) => {
    if (!node || typeof node !== 'object' || seen.has(node) || depth > 4) return;
    seen.add(node);
    const e = node as { status?: unknown; code?: unknown; message?: unknown; cause?: unknown; error?: unknown };
    if (status === undefined) {
      if (typeof e.status === 'number') status = e.status;
      else if (typeof e.code === 'number') status = e.code;
    }
    if (typeof e.status === 'string') messages.push(e.status);
    if (typeof e.message === 'string') messages.push(e.message);
    if (e.error) visit(e.error, depth + 1);
    if (e.cause) visit(e.cause, depth + 1);
  };

  visit(err, 0);
  if (typeof err === 'string') messages.push(err);

  const combined = messages
    .join(' | ')
    .replace(/\b(gsk_|AIza)[A-Za-z0-9_-]{8,}\b/g, '[redacted]')
    .slice(0, 300)
    .trim();

  if (status === undefined) {
    if (isTokenOrQuotaMessage(combined)) status = 429;
    else if (/403|PERMISSION_DENIED/i.test(combined)) status = 403;
    else if (/401|UNAUTHENTICATED|API_KEY_INVALID/i.test(combined)) status = 401;
  }

  return {
    status,
    retryAfterMs: parseRetryAfterFromText(combined),
    detail: combined || undefined,
  };
}

function classifyGeminiError(err: unknown) {
  if (err instanceof GeminiClientError && err.kind === 'http') {
    return classifyHttpStatusForRotation(err.status, err.retryAfterMs, err.detail);
  }
  return { rotate: true, cooldownMs: 15_000, reason: 'transient' };
}

export function getGeminiKeys(): string[] {
  return collectKeysFromEnv(process.env, 'GEMINI');
}

function parseImageDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
  const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec((dataUrl || '').trim());
  if (!m) return null;
  return { mimeType: m[1], data: m[2] };
}

export const gemini = {
  hasKeys(): boolean {
    return getGeminiKeys().length > 0;
  },

  hasHealthyKey(): boolean {
    const keys = getGeminiKeys();
    return keys.length > 0 && geminiPool.hasHealthyKey(keys);
  },

  async chatWithMeta(messages: GroqMessage[], opts: ChatOptions = {}): Promise<{ text: string; provider: 'Gemini'; model: string }> {
    const keys = getGeminiKeys();
    if (!keys.length) throw new GeminiClientError('config');

    const systemParts = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
    const contents = messages
      .filter((m) => m.role !== 'system')
      .map((m) => (m.role === 'assistant' ? `Asisten: ${m.content}` : m.content))
      .join('\n\n');
    const model = opts.model || process.env.GEMINI_TEXT_MODEL?.trim() || DEFAULT_GEMINI_MODEL;

    const text = await executeWithKeyRotation(
      keys,
      geminiPool,
      async (apiKey) => {
        const ai = createClient(apiKey);
        try {
          const response = await ai.models.generateContent({
            model,
            contents: contents || 'Halo',
            config: {
              ...(systemParts ? { systemInstruction: systemParts } : {}),
              ...(opts.json ? { responseMimeType: 'application/json' } : {}),
            },
          });
          const out = response.text?.trim();
          if (!out) throw new GeminiClientError('format');
          return out;
        } catch (err) {
          if (err instanceof GeminiClientError) throw err;
          const info = extractErrorInfo(err);
          throw new GeminiClientError('http', info.status, info.retryAfterMs, info.detail);
        }
      },
      classifyGeminiError,
    );
    return { text, provider: 'Gemini', model };
  },

  async chat(messages: GroqMessage[], opts: ChatOptions = {}): Promise<string> {
    const out = await this.chatWithMeta(messages, opts);
    return out.text;
  },

  async vision(
    imageDataUrl: string,
    prompt: string,
    opts: ChatOptions = {},
  ): Promise<{ text: string; provider: 'Gemini'; model: string }> {
    const keys = getGeminiKeys();
    if (!keys.length) throw new GeminiClientError('config');
    const parsedImg = parseImageDataUrl(imageDataUrl);
    if (!parsedImg) throw new GeminiClientError('format');

    const model = opts.model || process.env.GEMINI_VISION_MODEL?.trim() || process.env.GEMINI_TEXT_MODEL?.trim() || DEFAULT_GEMINI_MODEL;

    const text = await executeWithKeyRotation(
      keys,
      geminiPool,
      async (apiKey) => {
        const ai = createClient(apiKey);
        try {
          const response = await ai.models.generateContent({
            model,
            contents: {
              parts: [
                { inlineData: { mimeType: parsedImg.mimeType, data: parsedImg.data } },
                { text: prompt },
              ],
            },
            config: {
              responseMimeType: 'application/json',
            },
          });
          const out = response.text?.trim();
          if (!out) throw new GeminiClientError('format');
          return out;
        } catch (err) {
          if (err instanceof GeminiClientError) throw err;
          const info = extractErrorInfo(err);
          throw new GeminiClientError('http', info.status, info.retryAfterMs, info.detail);
        }
      },
      classifyGeminiError,
    );
    return { text, provider: 'Gemini', model };
  },
};
