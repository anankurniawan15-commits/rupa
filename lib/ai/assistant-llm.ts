/**
 * Logika server AI Assistant dengan LLM. Pembagian tugas:
 *  - LLM: memahami maksud (parseIntent), menulis alasan (explain), menulis panduan (consultLLM).
 *  - Kode: memilih produk (searchCatalog), angka harga/rating/stok, perbandingan, dan semua fallback.
 * Fungsi chat dan sisa waktu diinjeksi lewat `deps`, jadi modul ini tidak membaca env atau memanggil
 * jaringan sendiri dan bisa diuji dengan LLM palsu. Setiap kegagalan LLM jatuh ke mesin aturan.
 */
import type { z } from 'zod';
import type { ChatOptions, GroqMessage } from '@/lib/clients/groq';
import { MATERIALS } from '@/lib/data';
import { r1, rp } from '@/lib/format';
import {
  clarifyReply, COMPARE_RE, compareResp, consult, extractCriteria, extractFlags, MATRX, MAX_PICKS, mergeCriteria,
  noMatchReply, priceReason, productsReply, respond, ruleReasons, searchCatalog, searchOptions, TYPERX,
  type EngineInput, type ShopCriteria, type ShopFlags,
} from './assistant-engine';
import { CONSULT_PROMPT, EXPLAIN_PROMPT, INTENT_PROMPT, OFFTOPIC_REPLY } from './assistant-prompts';
import {
  ensureSafety, ExplainSchema, GuideSchema, IntentSchema, parseJson, sanitizeExplain, sanitizeGuide,
  type AssistantRequest, type HistoryItem, type Intent,
} from './assistant-schema';
import type { AiMessage, AssistantReply, ChatMode } from '@/types/ai';
import type { MaterialKey, Product } from '@/types/product';

/** groq.chat di server; palsu di uji. */
export type ChatFn = (messages: GroqMessage[], opts: ChatOptions) => Promise<string>;

export interface AssistantDeps {
  chat: ChatFn;
  /** Sisa waktu (ms) sampai tenggat permintaan. */
  remainingMs: () => number;
  /** Log kejadian — tanpa isi pesan pengguna. */
  log?: (event: string, detail?: Record<string, string | number>) => void;
}

const INTENT_OPTS: ChatOptions = { json: true, temperature: 0.1, maxTokens: 200 };
const EXPLAIN_OPTS: ChatOptions = { json: true, temperature: 0.4, maxTokens: 700 };
const CONSULT_OPTS: ChatOptions = { json: true, temperature: 0.4, maxTokens: 900 };
/** Di bawah sisa waktu ini panggilan LLM dilewati supaya respons tetap ≤ 10 detik. */
const MIN_CALL_BUDGET_MS = 1_500;

/** Data dimasukkan ke prompt sebagai JSON; `<` di-escape supaya teks pengguna tidak bisa menutup tag. */
const asData = (v: unknown) => JSON.stringify(v).replace(/</g, '\\u003c');

const historyBlock = (history: HistoryItem[]) =>
  history.length ? '<riwayat>' + asData(history.map((h) => ({ peran: h.role === 'user' ? 'pengguna' : 'asisten', teks: h.text }))) + '</riwayat>\n' : '';

/**
 * Key Groq ditolak (401/403) = salah konfigurasi. Tidak di-fallback diam-diam supaya terlihat
 * sebagai pesan galat; galat lain (timeout, 429/5xx, JSON rusak) jatuh ke mesin aturan.
 */
export const isAuthError = (e: unknown) =>
  e instanceof Error && e.name === 'GroqError' && 'status' in e && (e.status === 401 || e.status === 403);

/** Panggil LLM lalu validasi JSON-nya; null untuk galat, timeout, atau keluaran tidak valid. */
async function callJson<T>(deps: AssistantDeps, task: string, system: string, user: string, opts: ChatOptions, schema: z.ZodType<T>): Promise<T | null> {
  const budget = deps.remainingMs();
  if (budget < MIN_CALL_BUDGET_MS) {
    deps.log?.('llm_skipped', { task });
    return null;
  }
  try {
    const messages: GroqMessage[] = [{ role: 'system', content: system }, { role: 'user', content: user }];
    const parsed = schema.safeParse(parseJson(await deps.chat(messages, { ...opts, timeoutMs: budget })));
    if (parsed.success) return parsed.data;
    deps.log?.('llm_invalid', { task });
  } catch (e) {
    if (isAuthError(e)) throw e;
    // GroqError hanya berisi jenis + status HTTP; galat lain tidak dicatat isinya.
    deps.log?.('llm_error', { task, error: e instanceof Error && e.name === 'GroqError' ? e.message : 'unexpected' });
  }
  return null;
}

/** Klasifikasi maksud + ekstraksi kriteria. null → pakai regex mesin aturan. */
export function parseIntent(text: string, mode: ChatMode, history: HistoryItem[], deps: AssistantDeps): Promise<Intent | null> {
  const user = historyBlock(history) + '<mode>' + mode + '</mode><pesan_pengguna>' + asData(text) + '</pesan_pengguna>';
  return callJson(deps, 'intent', INTENT_PROMPT, user, INTENT_OPTS, IntentSchema);
}

const matchTypes = (xs: string[]) => TYPERX.filter(([re, , w]) => xs.some((x) => x === w || re.test(x.toLowerCase())));
const matchMats = (xs: string[]): MaterialKey[] =>
  MATRX.filter(([re, k]) => xs.some((x) => x === k || re.test(x.toLowerCase()))).map(([, k]) => k).filter((k, i, a) => a.indexOf(k) === i);

/**
 * Intent LLM → kriteria katalog, digabung dengan hasil regex supaya kata yang terlewat LLM tetap terbaca.
 * Material/jenis disaring ke kunci yang dikenal katalog. null kalau pengguna meminta material atau jenis
 * barang yang tidak dijual di katalog (mis. "kursi emas") — jawaban jujur, bukan produk pengganti.
 * Pada lanjutan (`refine`), kata asing diabaikan saja karena kriteria diwarisi dari konteks.
 */
export function intentToCriteria(intent: Intent, t: string, refine: boolean): ShopCriteria | null {
  const rx = extractCriteria(t);
  const types = matchTypes(intent.types);
  const mats = matchMats(intent.materials);
  const unknownType = intent.types.length > 0 && !types.length && !rx.types.length;
  const unknownMat = intent.materials.length > 0 && !mats.length && !rx.mats.length;
  if (!refine && (unknownType || unknownMat)) return null;
  const union = <T,>(a: T[], b: T[]) => a.concat(b).filter((x, i, all) => all.indexOf(x) === i);
  return {
    budget: rx.budget || intent.budget || 0,
    mats: union(rx.mats, mats),
    types: union(rx.types, types.flatMap(([, arr]) => arr)),
    words: union(rx.words, types.map(([, , w]) => w)),
    gift: rx.gift || intent.gift,
  };
}

export function mergeFlags(flags: ShopFlags, intent: Intent): ShopFlags {
  const cheaper = flags.cheaper || intent.refine === 'cheaper';
  const other = flags.other || intent.refine === 'other';
  return { ...flags, cheaper, other, refine: flags.refine || cheaper || other };
}

/** Alasan "kenapa cocok" ditulis LLM; null → alasan mesin aturan. */
export async function explain(picks: Product[], crit: ShopCriteria, uses: string[], text: string, deps: AssistantDeps) {
  const kriteria = { jenis: crit.words, material: crit.mats.map((m) => MATERIALS[m]), kegunaan: uses, hadiah: crit.gift };
  const produk = picks.map((p) => ({ id: p.id, judul: p.title, material: p.matShort, asal: p.originShort, kegunaan: p.uses, harga: rp(p.price), rating: r1(p.rating) }));
  const user = '<pesan_pengguna>' + asData(text) + '</pesan_pengguna>\n<kriteria>' + asData(kriteria) + '</kriteria>\n<data_produk>' + asData(produk) + '</data_produk>';
  const out = await callJson(deps, 'explain', EXPLAIN_PROMPT, user, EXPLAIN_OPTS, ExplainSchema);
  return out ? sanitizeExplain(out, picks.map((p) => p.id)) : null;
}

/** Baris harga selalu dari katalog, lalu alasan LLM; produk tanpa alasan LLM yang lolos memakai alasan aturan. */
function combineReasons(picks: Product[], crit: ShopCriteria, relaxed: boolean, cheaper: boolean, llm: Record<string, string[]>) {
  const rules = ruleReasons(picks, crit, relaxed, cheaper);
  const reasons: Record<string, string[]> = {};
  for (const p of picks) reasons[p.id] = llm[p.id]?.length ? [priceReason(p, crit, relaxed, cheaper), ...llm[p.id]] : rules[p.id];
  return reasons;
}

async function shopLLM(req: AssistantRequest, intent: Intent, deps: AssistantDeps): Promise<AssistantReply> {
  const t = req.text.toLowerCase();
  const ctx = req.ctx;
  const flags = mergeFlags(extractFlags(t), intent);
  const raw = intentToCriteria(intent, t, flags.refine);
  if (!raw) return noMatchReply(mergeCriteria(extractCriteria(t), ctx, flags), flags);
  const crit = mergeCriteria(raw, ctx, flags);
  const clarify = clarifyReply(crit, flags, raw.gift || ctx.awaiting === 'gift');
  if (clarify) return clarify;
  const { list, relaxed } = searchCatalog(crit, searchOptions(ctx, flags, req.hidden, intent.uses));
  const picks = list.slice(0, MAX_PICKS);
  if (!picks.length) return noMatchReply(crit, flags);
  const llm = await explain(picks, crit, intent.uses, req.text, deps);
  if (!llm) return productsReply(picks, crit, ctx, flags, relaxed);
  const reasons = combineReasons(picks, crit, relaxed, flags.cheaper, llm.reasons);
  // Saat budget dilonggarkan, kalimat pembuka aturan (jujur soal budget) dipertahankan.
  return productsReply(picks, crit, ctx, flags, relaxed, { reasons, paras: llm.intro && !relaxed ? [llm.intro] : undefined });
}

/** Panduan upcycle dari LLM (kind 'guide'); null → panduan mesin aturan. */
export async function consultLLM(text: string, history: HistoryItem[], deps: AssistantDeps): Promise<AiMessage | null> {
  const user = historyBlock(history) + '<pesan_pengguna>' + asData(text) + '</pesan_pengguna>';
  const out = await callJson(deps, 'consult', CONSULT_PROMPT, user, CONSULT_OPTS, GuideSchema);
  if (!out) return null;
  const guide = sanitizeGuide(out);
  if (!guide.title || !guide.ideas.length) return null;
  return { role: 'ai', kind: 'guide', title: guide.title, paras: guide.paras, ideas: guide.ideas, safety: ensureSafety(text, guide), chips: consult(text.toLowerCase()).chips };
}

/** Jawab satu pesan. Masukan harus sudah divalidasi dan disanitasi (sanitizeRequest). */
export async function answer(req: AssistantRequest, deps: AssistantDeps): Promise<AssistantReply> {
  const t = req.text.toLowerCase();
  const engine: EngineInput = { mode: req.mode, ctx: req.ctx, compare: req.compare, hidden: req.hidden };
  if (COMPARE_RE.test(t)) return compareResp(engine);
  const intent = await parseIntent(req.text, req.mode, req.history, deps);
  if (!intent) {
    deps.log?.('fallback', { reason: 'intent' });
    return respond(req.text, engine);
  }
  if (intent.intent === 'compare') return compareResp(engine);
  if (intent.intent === 'offtopic') return { msg: structuredClone(OFFTOPIC_REPLY) };
  if (intent.intent === 'consult' || (intent.intent === 'clarify' && req.mode === 'upcycle')) {
    return { msg: (await consultLLM(req.text, req.history, deps)) || consult(t) };
  }
  return shopLLM(req, intent, deps);
}
