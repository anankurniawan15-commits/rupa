/**
 * Skema zod + penyaring murni untuk AI Assistant.
 *  - Masukan klien ke POST /api/assistant tidak tepercaya → divalidasi dan id dicocokkan ke katalog.
 *  - Keluaran LLM tidak tepercaya → divalidasi, dipotong, dan disaring sebelum sampai ke UI.
 * Tidak ada I/O di sini supaya mudah diuji.
 */
import { z } from 'zod';
import { CLAIM_RULES, MATERIALS, PRODUCTS } from '@/lib/data';
import type { GuideIdea, ShopContext } from '@/types/ai';
import type { MaterialKey } from '@/types/product';

/* ---------- batas ---------- */
export const MAX_TEXT = 500;
export const MAX_HISTORY = 8;
const MAX_COMPARE = 3;
/** Cukup untuk seluruh katalog contoh; nanti status listing dibaca server dari Supabase. */
const MAX_HIDDEN = 200;
const MAX_BUDGET = 100_000_000;
const MAX_LIST = 10;
const MAX_REASONS = 2;
const MAX_REASON_CHARS = 160;
const MAX_INTRO_CHARS = 220;
const MAX_TITLE_CHARS = 80;
const MAX_PARA_CHARS = 320;
const MAX_PARAS = 2;
const MAX_IDEAS = 3;
const MAX_STEPS = 5;
const MAX_STEP_CHARS = 200;
const MAX_META_CHARS = 40;
const MAX_SAFETY_CHARS = 600;

/* ---------- masukan klien ---------- */
const ProductId = z.string().regex(/^p\d{1,4}$/);
// hasOwn, bukan `in`: "constructor"/"toString" tidak boleh lolos sebagai material.
const Material = z.custom<MaterialKey>((v) => typeof v === 'string' && Object.hasOwn(MATERIALS, v));

/**
 * Konteks belanja berasal dari balasan server sebelumnya, jadi field yang rusak/kelewat batas
 * dibuang (`catch`) alih-alih menolak seluruh permintaan — percakapan tidak boleh macet di 400.
 */
const CtxSchema = z.object({
  budget: z.number().min(0).transform((n) => Math.min(Math.round(n), MAX_BUDGET)).optional().catch(undefined),
  mats: z.array(Material).max(MAX_LIST).optional().catch(undefined),
  types: z.array(z.string().max(30)).max(MAX_LIST).optional().catch(undefined),
  words: z.array(z.string().max(30)).max(MAX_LIST).optional().catch(undefined),
  gift: z.boolean().optional().catch(undefined),
  lastIds: z.array(ProductId).max(MAX_LIST).optional().catch(undefined),
  awaiting: z.literal('gift').nullable().optional().catch(undefined),
});

export const AssistantRequestSchema = z.object({
  mode: z.enum(['shop', 'upcycle']),
  text: z.string().trim().min(1).max(MAX_TEXT),
  history: z.array(z.object({ role: z.enum(['user', 'ai']), text: z.string().max(MAX_TEXT) })).max(MAX_HISTORY).default([]),
  ctx: CtxSchema.default({}),
  compare: z.array(ProductId).max(MAX_COMPARE).default([]),
  hidden: z.array(ProductId).max(MAX_HIDDEN).default([]),
});
export type AssistantRequest = z.infer<typeof AssistantRequestSchema>;
export type HistoryItem = AssistantRequest['history'][number];

const CATALOG_IDS = new Set(PRODUCTS.map((p) => p.id));
const PRODUCT_TYPES = new Set(PRODUCTS.map((p) => p.type));
export const isCatalogId = (id: string) => CATALOG_IDS.has(id);

const catalogIds = (ids: string[]) => ids.filter((id, i, a) => isCatalogId(id) && a.indexOf(id) === i);

/** Buang id yang tidak ada di katalog dan duplikat (klien bisa mengirim apa saja) — mencegah crash di mesin aturan. */
export function sanitizeRequest(req: AssistantRequest): AssistantRequest {
  const ctx: ShopContext = { ...req.ctx };
  if (ctx.lastIds) ctx.lastIds = catalogIds(ctx.lastIds);
  if (ctx.types) ctx.types = ctx.types.filter((t) => PRODUCT_TYPES.has(t));
  return { ...req, ctx, compare: catalogIds(req.compare), hidden: catalogIds(req.hidden) };
}

/* ---------- keluaran LLM ---------- */
const words = z.array(z.string().max(40)).max(MAX_LIST).catch([]);

export const IntentSchema = z.object({
  intent: z.enum(['shop', 'consult', 'compare', 'clarify', 'offtopic']),
  budget: z.number().int().min(0).max(MAX_BUDGET).nullable().catch(null),
  materials: words,
  types: words,
  uses: words,
  gift: z.boolean().catch(false),
  refine: z.enum(['cheaper', 'other']).nullable().catch(null),
});
export type Intent = z.infer<typeof IntentSchema>;

export const ExplainSchema = z.object({
  intro: z.string().catch(''),
  reasons: z.record(z.string(), z.array(z.string()).catch([])).catch({}),
});
export type Explain = z.infer<typeof ExplainSchema>;

export const GuideSchema = z.object({
  title: z.string().min(1),
  paras: z.array(z.string()).catch([]),
  ideas: z.array(z.object({ name: z.string().min(1), meta: z.string().catch(''), steps: z.array(z.string()).min(1) })).min(1),
  safety: z.string().catch(''),
});
export type Guide = z.infer<typeof GuideSchema>;

/** JSON.parse yang tidak melempar. */
export function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

/** Rapikan spasi lalu potong ke `max` karakter. */
export function clip(s: string, max: number): string {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t;
}

const ABSOLUTE_CLAIMS = CLAIM_RULES.filter((c) => !c.generic).map((c) => c.re);
/** Kepastian yang tidak bisa dijamin asisten (keamanan bahan, kekuatan, kelayakan daur ulang). */
const CERTAINTY_RE = /pasti aman|dijamin|terjamin|bebas racun|tidak beracun|food[ -]?grade|aman untuk makanan|pasti kuat|tahan beban|pasti bisa didaur ulang/i;

const isClaimFree = (s: string) => !CERTAINTY_RE.test(s) && !ABSOLUTE_CLAIMS.some((re) => re.test(s));
/** Teks LLM di kartu produk tidak boleh memuat angka: harga, rating, dan stok hanya dari katalog. */
const isCatalogSafe = (s: string) => !/\d/.test(s) && isClaimFree(s);

const uniq = (xs: string[]) => xs.filter((x, i, a) => x && a.indexOf(x) === i);

/**
 * Alasan "kenapa cocok" dari LLM → hanya untuk id terpilih, maks. 2 alasan pendek per produk,
 * tanpa angka dan tanpa klaim mutlak. id karangan diabaikan.
 */
export function sanitizeExplain(out: Explain, pickedIds: string[]): { intro: string; reasons: Record<string, string[]> } {
  const reasons: Record<string, string[]> = {};
  for (const id of pickedIds) {
    const list = (out.reasons[id] || []).map((r) => clip(r, MAX_REASON_CHARS)).filter(isCatalogSafe);
    reasons[id] = uniq(list).slice(0, MAX_REASONS);
  }
  const intro = clip(out.intro, MAX_INTRO_CHARS);
  return { intro: isCatalogSafe(intro) ? intro : '', reasons };
}

/** Potong lalu kosongkan kalau memuat klaim mutlak. */
const claimFreeClip = (s: string, max: number) => {
  const t = clip(s, max);
  return isClaimFree(t) ? t : '';
};

/**
 * Panduan dari LLM → jumlah dan panjang dibatasi, klaim mutlak dibuang (catatan keamanan per kalimat),
 * duplikat dibuang (dipakai sebagai key React). Judul kosong = panduan tidak dipakai.
 */
export function sanitizeGuide(g: Guide): Guide {
  const ideas: GuideIdea[] = [];
  for (const idea of g.ideas) {
    const name = claimFreeClip(idea.name, MAX_TITLE_CHARS);
    const steps = uniq(idea.steps.map((s) => claimFreeClip(s, MAX_STEP_CHARS))).slice(0, MAX_STEPS);
    if (name && steps.length && !ideas.some((x) => x.name === name)) ideas.push({ name, meta: claimFreeClip(idea.meta, MAX_META_CHARS), steps });
    if (ideas.length === MAX_IDEAS) break;
  }
  return {
    title: claimFreeClip(g.title, MAX_TITLE_CHARS),
    paras: uniq(g.paras.map((p) => claimFreeClip(p, MAX_PARA_CHARS))).slice(0, MAX_PARAS),
    ideas,
    safety: clip(g.safety.split(/(?<=[.!?])\s+/).filter(isClaimFree).join(' '), MAX_SAFETY_CHARS),
  };
}

/** [topik, catatan wajib, pola yang menandakan catatan itu sudah ada]. */
const SAFETY_RULES: [RegExp, string, RegExp][] = [
  [/plastik|botol|styrofoam/i, 'Jangan membakar atau melelehkan plastik di rumah — asapnya berbahaya.', /bakar|leleh/i],
  [/kaleng|logam|besi|seng/i, 'Tepi kaleng atau logam bisa tajam — pakai sarung tangan dan haluskan tepinya.', /tajam/i],
  [/amplas|\bcat\b|mengecat|pernis|plitur|\blem\b|pelarut|thinner/i, 'Pakai masker dan kerja di ruang berventilasi saat mengamplas, mengecat, atau memakai lem.', /masker|ventilasi/i],
  [/listrik|lampu|kabel|baterai/i, 'Untuk barang berlistrik, pakai kabel dan fitting standar; minta bantuan teknisi bila ragu.', /kabel|listrik|teknisi/i],
  [/pisau|cutter|gunting|gergaji|\bbor\b/i, 'Hati-hati memakai alat potong; arahkan potongan menjauhi tubuh.', /alat potong|hati-hati|menjauhi/i],
];

/**
 * Pastikan catatan keamanan menyebut risiko yang relevan dengan topik pertanyaan atau isi panduan,
 * walaupun LLM lupa menuliskannya.
 */
export function ensureSafety(topic: string, guide: Guide): string {
  const hay = [topic, guide.title, ...guide.paras, ...guide.ideas.flatMap((i) => [i.name, ...i.steps])].join(' ');
  let safety = guide.safety;
  for (const [re, note, covered] of SAFETY_RULES) {
    if (re.test(hay) && !covered.test(safety)) safety = (safety ? safety + ' ' : '') + note;
  }
  return safety;
}
