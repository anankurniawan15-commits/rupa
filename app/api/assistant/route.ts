import { NextResponse, type NextRequest } from 'next/server';
import { hasAnyTextLlmKey, isRotatedAuthError, rotatedTextChat } from '@/lib/clients/text-router';
import { respond } from '@/lib/ai/assistant-engine';
import { answer, groqReason, type AnswerPath, type AnswerResult, type FailReason } from '@/lib/ai/assistant-llm';
import { ASSISTANT_PROMPT_VERSION } from '@/lib/ai/assistant-prompts';
import { AssistantRequestSchema, parseJson, sanitizeRequest, type AssistantRequest } from '@/lib/ai/assistant-schema';
import { createRateLimiter } from '@/lib/rate-limit';
import type { AssistantReply } from '@/types/ai';

/**
 * POST /api/assistant — AI Assistant (publik: tamu boleh memakai, proxy.ts tidak mencakup rute ini).
 * Alur: rate limit → validasi zod → sanitasi id → Router Teks Groq/Gemini (rotasi key) → fallback mesin aturan.
 */

const REQUEST_BUDGET_MS = 9_000;
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;
const MAX_BODY_CHARS = 16_000;

const takeToken = createRateLimiter(RATE_LIMIT, RATE_WINDOW_MS);

const MSG_RATE = 'Terlalu banyak pertanyaan dalam waktu singkat. Tunggu sebentar lalu coba lagi.';
const MSG_BAD = 'Pesanmu belum bisa diproses. Pastikan tidak kosong dan maksimal 500 karakter.';
const MSG_DOWN = 'Asisten sedang tidak bisa dihubungi. Coba lagi beberapa saat lagi.';

const errorReply = (errText: string): AssistantReply => ({ msg: { role: 'ai', kind: 'error', errText } });

function log(event: string, detail: Record<string, string | number | undefined> = {}) {
  console.info(JSON.stringify({ scope: 'assistant', v: ASSISTANT_PROMPT_VERSION, event, ...detail }));
}

type RouteResult = Omit<AnswerResult, 'path' | 'reason'> & { path: AnswerPath | 'error'; reason?: FailReason | 'no_key' | 'exception' };

function clientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0].trim() || request.headers.get('x-real-ip') || 'unknown';
}

async function readBody(request: NextRequest): Promise<unknown> {
  if (Number(request.headers.get('content-length') || 0) > MAX_BODY_CHARS) return undefined;
  const text = await request.text();
  return text.length > MAX_BODY_CHARS ? undefined : parseJson(text);
}

async function replyFor(req: AssistantRequest, started: number): Promise<RouteResult> {
  const engine = { mode: req.mode, ctx: req.ctx, compare: req.compare, hidden: req.hidden };
  if (!hasAnyTextLlmKey()) return { reply: respond(req.text, engine), path: 'fallback', reason: 'no_key' };
  const deadline = started + REQUEST_BUDGET_MS;
  try {
    return await answer(req, { chat: rotatedTextChat, remainingMs: () => deadline - Date.now() });
  } catch (e) {
    if (isRotatedAuthError(e)) return { reply: errorReply(MSG_DOWN), path: 'error', reason: groqReason(e) };
    return { reply: respond(req.text, engine), path: 'fallback', reason: 'exception' };
  }
}

export async function POST(request: NextRequest) {
  const started = Date.now();
  const limit = takeToken(clientIp(request), started);
  if (!limit.ok) {
    log('rate_limited');
    return NextResponse.json(errorReply(MSG_RATE), { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } });
  }
  const parsed = AssistantRequestSchema.safeParse(await readBody(request));
  if (!parsed.success) {
    log('bad_request', { issues: parsed.error.issues.length });
    return NextResponse.json(errorReply(MSG_BAD), { status: 400 });
  }
  const req = sanitizeRequest(parsed.data);
  try {
    const { reply, path, reason, task } = await replyFor(req, started);
    log('reply', { path, reason, task, mode: req.mode, kind: reply.msg.kind, ms: Date.now() - started });
    return NextResponse.json(reply);
  } catch {
    // Mesin aturan pun gagal (seharusnya tidak terjadi) — tetap kirim body yang bisa ditampilkan UI.
    log('internal_error', { ms: Date.now() - started });
    return NextResponse.json(errorReply(MSG_DOWN), { status: 500 });
  }
}
