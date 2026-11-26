import { NextResponse, type NextRequest } from 'next/server';
import { CRISP_DM_SPEC, pythonSortirToOutcome } from '@/lib/ai/crisp-dm';
import { analyzeSortirVision, analyzeTextOnlySortir } from '@/lib/ai/sortir-llm';
import { extractJsonObject, SortirRequestSchema } from '@/lib/ai/sortir-schema';
import { hasAnyTextLlmKey, rotatedVision } from '@/lib/clients/text-router';
import { createRateLimiter } from '@/lib/rate-limit';
import type { SortirOutcome } from '@/types/ai';

const RATE_LIMIT = 15;
const RATE_WINDOW_MS = 60_000;
const MAX_BODY_CHARS = 5_000_000;

const takeToken = createRateLimiter(RATE_LIMIT, RATE_WINDOW_MS);

function clientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0].trim() || request.headers.get('x-real-ip') || 'unknown';
}

async function readBody(request: NextRequest): Promise<unknown> {
  if (Number(request.headers.get('content-length') || 0) > MAX_BODY_CHARS) return undefined;
  const text = await request.text();
  return text.length > MAX_BODY_CHARS ? undefined : extractJsonObject(text);
}

function log(event: string, detail: Record<string, string | number | undefined> = {}) {
  console.info(JSON.stringify({ scope: 'sortir', v: CRISP_DM_SPEC.version, event, ...detail }));
}

async function tryPythonBackend(imageDataUrl: string | undefined, description: string | undefined): Promise<SortirOutcome | null> {
  const baseUrl = process.env.PYTHON_AI_URL?.trim();
  if (!baseUrl) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 18_000);
  try {
    const res = await fetch(baseUrl.replace(/\/+$/, '') + '/api/sortir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageDataUrl, description }),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    return pythonSortirToOutcome(await res.json(), description || '');
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(request: NextRequest) {
  const started = Date.now();
  const limit = takeToken(clientIp(request), started);
  if (!limit.ok) {
    log('rate_limited');
    return NextResponse.json<SortirOutcome>(
      { status: 'error', errMsg: 'Terlalu banyak permintaan analisis. Tunggu sebentar lalu coba lagi.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } },
    );
  }

  const body = await readBody(request);
  const parsed = SortirRequestSchema.safeParse(body);
  if (!parsed.success) {
    log('bad_request');
    return NextResponse.json<SortirOutcome>(
      { status: 'error', errMsg: 'Masukkan foto barang atau deskripsi yang valid terlebih dahulu.' },
      { status: 400 },
    );
  }

  const req = parsed.data;
  const hasImage = Boolean(req.imageDataUrl?.trim());

  // 1. Jika backend Python CRISP-DM aktif (Groq Vision -> Gemini Vision fallback), utamakan itu.
  const pyOutcome = await tryPythonBackend(req.imageDataUrl, req.description);
  if (pyOutcome) {
    log('reply', { path: 'python_crispdm', status: pyOutcome.status, ms: Date.now() - started });
    return NextResponse.json<SortirOutcome>(pyOutcome);
  }

  // 2. Sesuai Section A `sortir.py` terbaru:
  //    Input FOTO -> Groq Vision API utama dengan Gemini Vision API sebagai fallback otomatis.
  if (hasImage) {
    if (!hasAnyTextLlmKey()) {
      log('vision_no_key', { ms: Date.now() - started });
      return NextResponse.json<SortirOutcome>({
        status: 'uploadChoice',
        choiceReason:
          'Layanan Vision API (Groq Vision / Gemini Vision) belum aktif — isi GROQ_API_KEY atau GEMINI_API_KEY di .env.local. Anda dapat memilih kategori material secara manual di bawah.',
        canRetry: true,
      });
    }

    try {
      const res = await analyzeSortirVision(
        { imageDataUrl: req.imageDataUrl!, description: req.description },
        rotatedVision,
      );
      const custom = res.outcome.status === 'done' ? res.outcome.customScenario : null;
      log('reply', {
        path: 'vision_api',
        provider: custom?.visionProvider || undefined,
        model: custom?.visionBackbone || undefined,
        category: custom?.cat,
        confidence: custom?.conf ?? undefined,
        status: res.outcome.status,
        ms: Date.now() - started,
      });
      return NextResponse.json<SortirOutcome>(res.outcome);
    } catch (err) {
      log('vision_error', {
        reason: err instanceof Error ? err.message.slice(0, 140) : 'vision_failed',
        ms: Date.now() - started,
      });
      return NextResponse.json<SortirOutcome>({
        status: 'uploadChoice',
        choiceReason:
          'Semua Vision API (Groq Vision dan Gemini Vision) gagal memproses foto ini. Anda dapat mencoba ulang atau memilih kategori material secara manual di bawah.',
        canRetry: true,
      });
    }
  }

  // 3. Sesuai Section B `sortir.py` terbaru:
  //    Jika hanya deskripsi teks tanpa gambar, jalankan Safety Gate lalu minta pengguna memilih material secara manual.
  const textOnlyOutcome = analyzeTextOnlySortir(req.description!);
  log('reply', { path: 'text_only_manual_review', status: textOnlyOutcome.status, ms: Date.now() - started });
  return NextResponse.json<SortirOutcome>(textOnlyOutcome);
}
