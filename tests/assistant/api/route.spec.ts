import { expect, test, type APIRequestContext } from '@playwright/test';
import { PRODUCTS } from '@/lib/data';
import type { AssistantReply } from '@/types/ai';

/**
 * Validasi POST /api/assistant. Semua kasus di sini ditolak sebelum LLM atau dijawab deterministik
 * ("Bandingkan"), jadi tidak memanggil Groq walaupun GROQ_API_KEY terisi.
 */
const URL = '/api/assistant';

// Setiap uji memakai "IP" sendiri supaya rate limit demo tidak saling memengaruhi antar-uji/antar-run.
const ipFor = (name: string) => 'test-' + name.replace(/\W+/g, '-') + '-' + Date.now();
const post = (request: APIRequestContext, ip: string, data: unknown) =>
  request.post(URL, { headers: { 'x-forwarded-for': ip, 'content-type': 'application/json' }, data: typeof data === 'string' ? data : JSON.stringify(data) });

const invalidBodies: [string, unknown][] = [
  ['teks kosong', { mode: 'shop', text: '   ' }],
  ['teks > 500 karakter', { mode: 'shop', text: 'a'.repeat(501) }],
  ['mode salah', { mode: 'jualan', text: 'halo' }],
  ['tanpa mode', { text: 'halo' }],
  ['JSON rusak', '{"mode": "shop", "text": '],
  ['riwayat > 8 pesan', { mode: 'shop', text: 'halo', history: Array.from({ length: 9 }, () => ({ role: 'user', text: 'x' })) }],
  ['compare > 3 id', { mode: 'shop', text: 'bandingkan', compare: ['p1', 'p2', 'p3', 'p4'] }],
  ['id berformat aneh', { mode: 'shop', text: 'bandingkan', compare: ['<script>', 'p2'] }],
];

for (const [name, body] of invalidBodies) {
  test('400: ' + name, async ({ request }) => {
    const res = await post(request, ipFor(name), body);
    expect(res.status()).toBe(400);
    const json = (await res.json()) as AssistantReply;
    expect(json.msg.kind).toBe('error');
    expect(json.msg.errText).toBeTruthy();
  });
}

test('200: bandingkan memakai data katalog, id asing di compare/ctx diabaikan', async ({ request }) => {
  const res = await post(request, ipFor('compare'), { mode: 'shop', text: 'Bandingkan produk yang kupilih.', compare: ['p2', 'p7', 'p999'], ctx: { lastIds: ['p404'] } });
  expect(res.status()).toBe(200);
  const json = (await res.json()) as AssistantReply;
  expect(json.msg.kind).toBe('compare');
  expect(json.msg.ids).toEqual(['p2', 'p7']);
  for (const id of json.msg.ids!) expect(PRODUCTS.some((p) => p.id === id)).toBe(true);
});

test('field asing di body diabaikan', async ({ request }) => {
  const res = await post(request, ipFor('extra'), { mode: 'shop', text: 'bandingkan', compare: ['p1', 'p2'], price: { p1: 1 }, role: 'admin' });
  expect(res.status()).toBe(200);
  expect(JSON.stringify(await res.json())).not.toContain('"price"');
});

test('429 + Retry-After setelah 20 permintaan per menit', async ({ request }) => {
  const ip = ipFor('rate');
  // Body tidak valid → ditolak 400 sebelum LLM, tapi tetap dihitung rate limit.
  for (let i = 0; i < 20; i++) expect((await post(request, ip, {})).status()).toBe(400);
  const res = await post(request, ip, {});
  expect(res.status()).toBe(429);
  expect(Number(res.headers()['retry-after'])).toBeGreaterThan(0);
  expect(((await res.json()) as AssistantReply).msg.kind).toBe('error');
});
