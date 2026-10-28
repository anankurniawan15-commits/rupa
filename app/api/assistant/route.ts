import { NextResponse, type NextRequest } from 'next/server';
import { groq } from '@/lib/clients/groq';
import { respond } from '@/lib/ai/assistant-engine';
import { answer, isAuthError } from '@/lib/ai/assistant-llm';
import { ASSISTANT_PROMPT_VERSION } from '@/lib/ai/assistant-prompts';
import { AssistantRequestSchema, parseJson, sanitizeRequest, type AssistantRequest } from '@/lib/ai/assistant-schema';
import { createRateLimiter } from '@/lib/rate-limit';
import type { AssistantReply } from '@/types/ai';

/**
 * POST /api/assistant — AI Assistant (publik: tamu boleh memakai, proxy.ts tidak mencakup rute ini).
 * Alur: rate limit → validasi zod → sanitasi id → Groq (answer) → fallback mesin aturan.
 * POST tidak pernah di-cache, jadi selalu dijalankan per permintaan (dengan cacheComponents,
 * export `dynamic` tidak lagi tersedia dan memang tidak diperlukan).
 * TODO(Supabase): katalog dan status listing (`hidden`) dibaca server dari tabel `products`,
 * bukan dari body permintaan; riwayat disimpan ke `assistant_sessions` / `assistant_messages`.
 */

/** Tenggat total jawaban LLM; ditambah overhead jaringan tetap di bawah target 10 detik. */
const REQUEST_BUDGET_MS = 9_000;
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;
/** Body valid paling besar ±6 KB (teks 500 + riwayat 8 × 500 + daftar id); sisanya ditolak tanpa diparse. */
const MAX_BODY_CHARS = 16_000;

// Demo: rate limit di memori per instans server (lihat lib/rate-limit.ts).
const takeToken = createRateLimiter(RATE_LIMIT, RATE_WINDOW_MS);

const MSG_RATE = 'Terlalu banyak pertanyaan dalam waktu singkat. Tunggu sebentar lalu coba lagi.';
const MSG_BAD = 'Pesanmu belum bisa diproses. Pastikan tidak kosong dan maksimal 500 karakter.';
const MSG_DOWN = 'Asisten sedang tidak bisa dihubungi. Coba lagi beberapa saat lagi.';

const errorReply = (errText: string): AssistantReply => ({ msg: { role: 'ai', kind: 'error', errText } });

/** Log server tanpa isi pesan pengguna dan tanpa key. */
function log(event: string, detail: Record<string, string | number> = {}) {
  console.info(JSON.stringify({ scope: 'assistant', v: ASSISTANT_PROMPT_VERSION, event, ...detail }));
}

function clientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0].trim() || request.headers.get('x-real-ip') || 'unknown';
}

async function readBody(request: NextRequest): Promise<unknown> {
  const text = await request.text();
  return text.length > MAX_BODY_CHARS ? undefined : parseJson(text);
}

async function replyFor(req: AssistantRequest, started: number): Promise<AssistantReply> {
  const engine = { mode: req.mode, ctx: req.ctx, compare: req.compare, hidden: req.hidden };
  if (!process.env.GROQ_API_KEY) {
    log('fallback', { reason: 'no_key' });
    return respond(req.text, engine);
  }
  const deadline = started + REQUEST_BUDGET_MS;
  try {
    return await answer(req, { chat: groq.chat, remainingMs: () => deadline - Date.now(), log });
  } catch (e) {
    if (isAuthError(e)) {
      log('groq_auth_error', { error: e instanceof Error ? e.message : 'unknown' });
      return errorReply(MSG_DOWN);
    }
    log('fallback', { reason: 'exception' });
    return respond(req.text, engine);
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
  const reply = await replyFor(req, started);
  log('reply', { mode: req.mode, kind: reply.msg.kind, ms: Date.now() - started });
  return NextResponse.json(reply);
}
