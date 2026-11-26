import 'server-only';
import { gemini, GeminiClientError, getGeminiKeys } from './gemini';
import { groq, GroqError, getGroqKeys, type ChatOptions, type GroqMessage } from './groq';

/**
 * Router Teks LLM dengan rotasi antar-key dan failover otomatis lintas provider (Groq <-> Gemini).
 * Digunakan untuk:
 *  - Pembuatan teks saran pengolahan bahan setelah Computer Vision mengenali gambar (/api/sortir)
 *  - Asisten Rupa (/api/assistant)
 *  - Asisten Listing (/api/listing-assist)
 */

type ProviderName = 'groq' | 'gemini';

const globalForProviderCursor = globalThis as typeof globalThis & { __rupaProviderCursor?: number };

export function hasAnyTextLlmKey(): boolean {
  return getGroqKeys().length > 0 || getGeminiKeys().length > 0;
}

function prioritizeHealthyProviders(order: ProviderName[]): ProviderName[] {
  if (order.length <= 1) return order;
  const isHealthy = (p: ProviderName) => (p === 'groq' ? groq.hasHealthyKey() : gemini.hasHealthyKey());
  const healthy = order.filter(isHealthy);
  const cooling = order.filter((p) => !isHealthy(p));
  return [...healthy, ...cooling];
}

function resolveProviderOrder(): ProviderName[] {
  const groqCount = getGroqKeys().length;
  const geminiCount = getGeminiKeys().length;
  const available: ProviderName[] = [];
  if (groqCount > 0) available.push('groq');
  if (geminiCount > 0) available.push('gemini');
  if (available.length <= 1) return available;

  const explicit = (process.env.TEXT_PROVIDER_ORDER || '').trim().toLowerCase();
  if (explicit.startsWith('gemini')) return prioritizeHealthyProviders(['gemini', 'groq']);
  if (explicit.startsWith('groq')) return prioritizeHealthyProviders(['groq', 'gemini']);

  // Mode default: rotasi bergantian (round-robin) antara Groq dan Gemini agar pemakaian token seimbang.
  const idx = (globalForProviderCursor.__rupaProviderCursor ?? 0) % 2;
  globalForProviderCursor.__rupaProviderCursor = idx + 1;
  return prioritizeHealthyProviders(idx === 0 ? ['groq', 'gemini'] : ['gemini', 'groq']);
}

function resolveGroqFirstOrder(): ProviderName[] {
  const base: ProviderName[] = [];
  if (getGroqKeys().length > 0) base.push('groq');
  if (getGeminiKeys().length > 0) base.push('gemini');
  return prioritizeHealthyProviders(base);
}

export function isRotatedAuthError(err: unknown): boolean {
  if (err instanceof GroqError) return err.status === 401 || err.status === 403;
  if (err instanceof GeminiClientError) return err.status === 401 || err.status === 403;
  return false;
}

export async function rotatedTextChat(messages: GroqMessage[], opts: ChatOptions = {}): Promise<string> {
  const providers = resolveProviderOrder();
  if (!providers.length) {
    throw new GroqError('config');
  }

  let lastError: unknown;
  for (let i = 0; i < providers.length; i++) {
    const provider = providers[i];
    try {
      return provider === 'groq' ? await groq.chat(messages, opts) : await gemini.chat(messages, opts);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError;
}

/**
 * Sesuai listing.py terbaru: Groq menjadi provider utama dan Gemini cadangan otomatis
 * (otomatis mendahulukan Gemini sementara jika seluruh key Groq sedang cooldown karena token habis).
 */
export async function groqFirstTextChatWithMeta(
  messages: GroqMessage[],
  opts: ChatOptions = {},
): Promise<{ text: string; provider: 'Groq' | 'Gemini'; model: string }> {
  const providers = resolveGroqFirstOrder();
  if (!providers.length) throw new GroqError('config');

  let lastError: unknown;
  for (const provider of providers) {
    try {
      return provider === 'groq' ? await groq.chatWithMeta(messages, opts) : await gemini.chatWithMeta(messages, opts);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError;
}

/**
 * Sesuai sortir.py terbaru: Groq Vision menjadi provider utama dan Gemini Vision cadangan otomatis
 * (otomatis mendahulukan Gemini sementara jika seluruh key Groq sedang cooldown karena token habis).
 */
export async function rotatedVision(
  imageDataUrl: string,
  prompt: string,
  opts: ChatOptions = {},
): Promise<{ text: string; provider: 'Groq' | 'Gemini'; model: string }> {
  const providers = resolveGroqFirstOrder();
  if (!providers.length) throw new GroqError('config');

  let lastError: unknown;
  for (const provider of providers) {
    try {
      return provider === 'groq' ? await groq.vision(imageDataUrl, prompt, opts) : await gemini.vision(imageDataUrl, prompt, opts);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError;
}
