import { NextResponse, type NextRequest } from 'next/server';
import { groqFirstTextChatWithMeta, hasAnyTextLlmKey, rotatedTextChat } from '@/lib/clients/text-router';
import { CRISP_DM_SPEC, pythonListingToResponse } from '@/lib/ai/crisp-dm';
import { ListingAssistRequestSchema, runListingAssistWithLlm, type ListingAssistRequest } from '@/lib/ai/listing-llm';
import { extractJsonObject } from '@/lib/ai/sortir-schema';
import { createRateLimiter } from '@/lib/rate-limit';

const RATE_LIMIT = 25;
const RATE_WINDOW_MS = 60_000;
const MAX_BODY_CHARS = 24_000;

const takeToken = createRateLimiter(RATE_LIMIT, RATE_WINDOW_MS);

function clientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0].trim() || request.headers.get('x-real-ip') || 'unknown';
}

async function readBody(request: NextRequest): Promise<unknown> {
  if (Number(request.headers.get('content-length') || 0) > MAX_BODY_CHARS) return undefined;
  const text = await request.text();
  return text.length > MAX_BODY_CHARS ? undefined : extractJsonObject(text);
}

async function tryPythonListing(req: ListingAssistRequest) {
  const baseUrl = process.env.PYTHON_AI_URL?.trim();
  if (!baseUrl) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10_000);
  try {
    const res = await fetch(baseUrl.replace(/\/+$/, '') + '/api/listing-assist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    return pythonListingToResponse(await res.json(), req);
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
    return NextResponse.json(
      { error: 'Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } },
    );
  }

  const parsed = ListingAssistRequestSchema.safeParse(await readBody(request));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Data listing tidak valid.' }, { status: 400 });
  }

  const pyResult = await tryPythonListing(parsed.data);
  if (pyResult) {
    console.info(JSON.stringify({ scope: 'listing-assist', v: CRISP_DM_SPEC.version, task: pyResult.task, path: pyResult.path, ms: Date.now() - started }));
    return NextResponse.json(pyResult);
  }

  const hasKeys = hasAnyTextLlmKey();
  const chat = hasKeys
    ? rotatedTextChat
    : async () => {
        throw new Error('no_key');
      };
  const chatWithMeta = hasKeys ? groqFirstTextChatWithMeta : undefined;

  const result = await runListingAssistWithLlm(parsed.data, { chat, chatWithMeta });
  console.info(JSON.stringify({ scope: 'listing-assist', v: CRISP_DM_SPEC.version, task: result.task, path: result.path, ms: Date.now() - started }));
  return NextResponse.json(result);
}
