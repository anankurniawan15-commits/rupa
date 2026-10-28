import { expect, test } from '@playwright/test';
import { extractCriteria, parseBudget, respond } from '@/lib/ai/assistant-engine';
import { intentToCriteria } from '@/lib/ai/assistant-llm';
import { AssistantRequestSchema, IntentSchema, sanitizeGuide, sanitizeRequest } from '@/lib/ai/assistant-schema';

const parseReq = (o: Record<string, unknown>) => sanitizeRequest(AssistantRequestSchema.parse({ mode: 'shop', text: 'oke', ...o }));

test('budget selalu rupiah bulat', () => {
  expect(parseBudget('di bawah 2,05 jt')).toBe(2050000);
  expect(Number.isInteger(parseBudget('maks 1,15 juta'))).toBe(true);
});

test('jenis barang tidak terduplikasi', () => {
  const { types } = extractCriteria('cari tas, dompet, celana, jaket, lampu, dekorasi, baju');
  expect(types).toEqual([...new Set(types)]);
});

test('ctx balasan server selalu diterima lagi oleh server', () => {
  const texts = ['cari tas di bawah 2,05 jt', 'cari tas di bawah 200 juta', 'cari tas, dompet, celana, jaket, lampu, dekorasi, baju'];
  for (const text of texts) {
    const r = respond(text, { mode: 'shop', ctx: {}, compare: [] });
    expect(AssistantRequestSchema.safeParse({ mode: 'shop', text: 'yang lebih murah', ctx: r.ctx }).success).toBe(true);
  }
});

test('ctx: material prototipe ("constructor") dan field rusak dibuang', () => {
  const r = parseReq({ ctx: { mats: ['kayu', 'constructor'], budget: 1e12, lastIds: ['p1', 'p1', 'p404'], gift: 'ya' } });
  expect(r.ctx.mats).toBeUndefined();
  expect(r.ctx.budget).toBe(100_000_000);
  expect(r.ctx.lastIds).toEqual(['p1']);
  expect(r.ctx.gift).toBeUndefined();
});

test('panduan: klaim mutlak dibuang dari judul, nama ide, langkah, dan catatan keamanan', () => {
  const g = sanitizeGuide({
    title: 'Pot dijamin aman',
    paras: [],
    ideas: [{ name: 'Wadah food grade', meta: 'Mudah', steps: ['Cuci.'] }, { name: 'Pot', meta: 'Mudah', steps: ['Potong.', 'Plastik ini bebas racun.'] }],
    safety: 'Botol ini dijamin aman. Jangan membakar plastik.',
  });
  expect(g.title).toBe('');
  expect(g.ideas.map((i) => i.name)).toEqual(['Pot']);
  expect(g.ideas[0].steps).toEqual(['Potong.']);
  expect(g.safety).toBe('Jangan membakar plastik.');
});

test('lanjutan dengan kata asing dari LLM tidak dianggap "tidak ada"', () => {
  const intent = IntentSchema.parse({ intent: 'shop', types: ['kursi'], materials: [] });
  expect(intentToCriteria(intent, 'cari kursi', false)).toBeNull();
  expect(intentToCriteria(intent, 'yang lebih murah', true)).not.toBeNull();
});
