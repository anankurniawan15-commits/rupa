/**
 * Mesin AI Assistant berbasis aturan — port dari prototipe (respond → shop / consult / compareResp).
 * Dipakai route /api/assistant sebagai cadangan saat Groq tidak tersedia, dan potongan `shop()`
 * (searchCatalog, mergeCriteria, productsReply, …) dipakai ulang jalur LLM di assistant-llm.ts
 * supaya pemilihan produk tetap deterministik.
 */
import { ASSISTANT_KB, CONDITIONS, MATERIAL_PATTERNS, MATERIALS, PRODUCTS, SELLERS, TYPE_PATTERNS } from '@/lib/data';
import { r1, rp } from '@/lib/format';
import type { AiMessage, AssistantReply, ChatMode, ShopContext } from '@/types/ai';
import type { MaterialKey, Product } from '@/types/product';

const P = (id: string) => PRODUCTS.find((p) => p.id === id) as Product;
const kb = (k: string): AiMessage => structuredClone(ASSISTANT_KB[k]);

/** "di bawah Rp150.000", "150rb", "maks 1,5 jt" → angka rupiah; 0 jika tidak ada. */
export function parseBudget(t: string): number {
  let m = t.match(/(?:di ?bawah|bawah|maks(?:imal|imum)?|kurang dari|budget(?:nya)?|sampai|max|<)\s*(?:rp\.?\s*)?(\d[\d.,]*)\s*(rb|ribu|k|jt|juta)?/);
  if (!m) m = t.match(/rp\.?\s*(\d[\d.,]*)\s*(rb|ribu|k|jt|juta)?/);
  if (!m) return 0;
  let n = parseFloat(m[1].replace(/[.,](?=\d{3}\b)/g, '').replace(',', '.'));
  const u = m[2];
  if (u === 'rb' || u === 'ribu' || u === 'k') n *= 1000;
  else if (u === 'jt' || u === 'juta') n *= 1000000;
  else if (n < 1000) n *= 1000;
  return n;
}

export const MATRX = MATERIAL_PATTERNS;
export const TYPERX = TYPE_PATTERNS;

export interface EngineInput {
  mode: ChatMode;
  ctx: ShopContext;
  /** id produk yang dipilih untuk dibandingkan. */
  compare: string[];
  /** id produk yang diturunkan admin (tidak direkomendasikan). */
  hidden?: string[];
}

/** Permintaan membandingkan selalu dijawab deterministik (angka dari katalog), tanpa LLM. */
export const COMPARE_RE = /bandingkan|perbandingan/;

export function respond(text: string, chat: EngineInput): AssistantReply {
  const t = text.toLowerCase();
  if (COMPARE_RE.test(t)) return compareResp(chat);
  const shopWords = /(cari|beli|rekomendasi|di ?bawah|ada produk|carikan|budget|hadiah|kado|yang lebih murah|pilihan lain)/;
  const consultWords = /(bisa dibuat|bisa jadi apa|cara |bagaimana|gimana|\bide\b|material apa|cocok untuk membuat|menentukan harga|harga jual|deskripsi|memanfaatkan|bikin|membuat)/;
  if ((consultWords.test(t) && !shopWords.test(t)) || (chat.mode === 'upcycle' && !shopWords.test(t))) return { msg: consult(t) };
  return shop(t, chat);
}

export function consult(t: string): AiMessage {
  if (/harga/.test(t)) return kb('harga');
  if (/deskripsi|judul listing|foto produk/.test(t)) return kb('deskripsi');
  if (/pensil|alat tulis/.test(t)) return kb('pensil');
  if (/jeans|denim|jins/.test(t)) return kb('jeans');
  if (/botol|plastik/.test(t)) return kb('botol');
  if (/kayu|kursi|meja|palet/.test(t)) return kb('kayu');
  if (/kaleng/.test(t)) return kb('kaleng');
  return kb('fallback');
}

export function compareResp(chat: EngineInput): AssistantReply {
  const ids = chat.compare.length >= 2 ? chat.compare.slice() : (chat.ctx.lastIds || []).slice(0, 3);
  if (ids.length < 2) {
    return { msg: { role: 'ai', kind: 'clarify', paras: ['Pilih minimal dua produk dulu — tekan “Bandingkan” di kartu produk, atau minta aku mencarikan produknya.'], chips: ['Cari tas upcycle di bawah Rp150.000'] } };
  }
  const ps = ids.map(P);
  const cheap = ps.slice().sort((a, b) => a.price - b.price)[0];
  const best = ps.slice().sort((a, b) => b.rating - a.rating)[0];
  return {
    msg: {
      role: 'ai', kind: 'compare', ids,
      paras: ['Perbandingan ' + ps.length + ' produk dari data listing. Termurah: ' + cheap.title + ' (' + rp(cheap.price) + '). Rating tertinggi: ' + best.title + ' (' + r1(best.rating) + ').', 'Perhatikan juga ukuran dan cara perawatannya sebelum memutuskan.'],
      chips: ['Yang lebih murah', 'Ada pilihan lain?'],
    },
    ctx: { ...chat.ctx, lastIds: ids },
  };
}

/** Kriteria pencarian katalog — dari regex (mesin aturan) atau dari intent LLM yang sudah divalidasi. */
export interface ShopCriteria {
  budget: number;
  mats: MaterialKey[];
  types: string[];
  /** Label jenis barang untuk kalimat pembuka ("tas", "dekorasi rumah"). */
  words: string[];
  gift: boolean;
}

/** Sinyal lanjutan percakapan ("yang lebih murah", "pilihan lain"). */
export interface ShopFlags {
  cheaper: boolean;
  other: boolean;
  refine: boolean;
  /** Pengguna menyebut "bahan" → material mentah boleh ikut direkomendasikan. */
  wantsBahan: boolean;
}

/** Jumlah kartu produk per balasan. */
export const MAX_PICKS = 3;

/** Ekstraksi kriteria berbasis regex dari teks huruf kecil. */
export function extractCriteria(t: string): ShopCriteria {
  const mats: MaterialKey[] = [];
  MATRX.forEach(([re, k]) => { if (re.test(t)) mats.push(k); });
  let types: string[] = [];
  const words: string[] = [];
  TYPERX.forEach(([re, arr, w]) => { if (re.test(t)) { types = types.concat(arr); words.push(w); } });
  return { budget: parseBudget(t), mats, types, words, gift: /hadiah|kado/.test(t) };
}

export function extractFlags(t: string): ShopFlags {
  const cheaper = /lebih murah|yang murah|termurah/.test(t);
  const other = /pilihan lain|yang lain|lainnya/.test(t);
  return { cheaper, other, refine: cheaper || other || /^(yang|kalau|terus|oke|ada yang)/.test(t), wantsBahan: /\bbahan\b/.test(t) };
}

/**
 * Gabungkan kriteria giliran ini dengan konteks sebelumnya. Lanjutan ("yang lebih murah") mewarisi
 * kriteria lama yang tidak disebut ulang; "lebih murah" menurunkan budget di bawah pilihan termurah sebelumnya.
 */
export function mergeCriteria(raw: ShopCriteria, ctx: ShopContext, flags: ShopFlags): ShopCriteria {
  const gift = raw.gift || ctx.awaiting === 'gift';
  let crit: ShopCriteria = { ...raw, gift };
  if (flags.refine) {
    crit = {
      budget: raw.budget || ctx.budget || 0,
      mats: raw.mats.length ? raw.mats : ctx.mats || [],
      types: raw.types.length ? raw.types : ctx.types || [],
      words: raw.words.length ? raw.words : ctx.words || [],
      gift: gift || !!ctx.gift,
    };
  }
  if (flags.cheaper && ctx.lastIds && ctx.lastIds.length) crit.budget = Math.min(...ctx.lastIds.map((id) => P(id).price)) - 1;
  return crit;
}

export interface SearchOptions {
  hidden: string[];
  wantsBahan: boolean;
  /** id yang sudah ditunjukkan (untuk "pilihan lain"). */
  exclude: string[];
  /** Kegunaan yang diminta (hanya dari intent LLM) — menaikkan skor, tidak menyaring. */
  uses?: string[];
}

/**
 * Filter + urutan katalog yang deterministik: stok > 0, tidak diturunkan admin, cocok budget/material/jenis.
 * Kalau tidak ada yang masuk budget, budget dilonggarkan dan hasil diurutkan dari termurah (`relaxed`).
 * TODO(Supabase): ganti sumber PRODUCTS dengan query tabel `products` (status aktif, stok > 0) di server.
 */
export function searchCatalog(crit: ShopCriteria, opts: SearchOptions): { list: Product[]; relaxed: boolean } {
  const base = PRODUCTS.filter((p) => p.stock > 0 && opts.hidden.indexOf(p.id) < 0 && opts.exclude.indexOf(p.id) < 0 && (opts.wantsBahan || p.type !== 'bahan'));
  const match = (p: Product, withBudget: boolean) =>
    (!withBudget || !crit.budget || p.price <= crit.budget) &&
    (!crit.mats.length || p.mats.some((m) => crit.mats.indexOf(m) >= 0)) &&
    (!crit.types.length || crit.types.indexOf(p.type) >= 0);
  const uses = opts.uses || [];
  const score = (p: Product) =>
    p.rating * 10 + p.sold / 40 + (crit.gift && p.uses.indexOf('hadiah') >= 0 ? 6 : 0) + (p.uses.some((u) => uses.indexOf(u) >= 0) ? 4 : 0);
  const list = base.filter((p) => match(p, true)).sort((a, b) => score(b) - score(a));
  if (list.length || !crit.budget) return { list, relaxed: false };
  return { list: base.filter((p) => match(p, false)).sort((a, b) => a.price - b.price), relaxed: true };
}

/**
 * Balasan klarifikasi kalau kriteria belum cukup untuk mencari; null kalau sudah cukup.
 * `giftAsked` = hadiah disebut di giliran ini atau sedang ditanyakan (bukan warisan ctx.gift),
 * supaya lanjutan biasa setelah sesi hadiah tidak memicu pertanyaan hadiah lagi.
 */
export function clarifyReply(crit: ShopCriteria, flags: ShopFlags, giftAsked: boolean): AssistantReply | null {
  const nothing = !crit.budget && !crit.mats.length && !crit.types.length;
  if (nothing && giftAsked) {
    return { msg: { role: 'ai', kind: 'clarify', paras: ['Bisa! Supaya pilihannya pas: kira-kira budget-nya berapa, dan temanmu lebih suka barang fashion atau barang untuk kamar dan meja?'], chips: ['Hadiah di bawah Rp100.000', 'Hadiah fashion di bawah Rp150.000', 'Hadiah untuk meja kerja'] }, ctx: { awaiting: 'gift', gift: true } };
  }
  if (nothing && !flags.refine) {
    return { msg: { role: 'ai', kind: 'clarify', paras: ['Aku bisa mencarikan produk dari katalog Rupa. Sebutkan salah satu: budget, jenis barang, material, atau untuk apa barangnya.'], chips: ['Tas di bawah Rp150.000', 'Dekorasi kamar dari kayu', 'Produk berbahan denim bekas'] }, ctx: {} };
  }
  return null;
}

/** Balasan jujur saat tidak ada produk yang cocok — tanpa produk pengganti karangan. */
export function noMatchReply(crit: ShopCriteria, flags: ShopFlags): AssistantReply {
  return {
    msg: { role: 'ai', kind: 'clarify', paras: [flags.other ? 'Itu semua pilihan yang cocok di katalog saat ini.' : 'Belum ada produk di katalog yang cocok dengan kriteria itu.', 'Coba longgarkan salah satu: material, jenis barang, atau budget.'], chips: ['Tampilkan produk di bawah Rp100.000', 'Ada produk berbahan kayu?'] },
    ctx: { ...crit, lastIds: [] },
  };
}

/** Baris harga "kenapa cocok" — selalu dari data katalog, juga dipakai di jalur LLM. */
export function priceReason(p: Product, crit: ShopCriteria, relaxed: boolean, cheaper: boolean): string {
  if (crit.budget && !relaxed) return rp(p.price) + ' — masih di bawah ' + rp(cheaper ? crit.budget + 1 : crit.budget);
  return 'Harga ' + rp(p.price);
}

export function ruleReasons(picks: Product[], crit: ShopCriteria, relaxed: boolean, cheaper: boolean): Record<string, string[]> {
  const reasons: Record<string, string[]> = {};
  picks.forEach((p) => {
    const r: string[] = [priceReason(p, crit, relaxed, cheaper)];
    r.push((crit.mats.length ? 'Material: ' : 'Dibuat dari ') + p.matShort.toLowerCase() + ' (menurut penjual)');
    if (crit.gift) r.push(p.stock === 1 ? 'Satu-satunya — tidak ada yang sama persis' : 'Rating ' + r1(p.rating) + ' dari ' + p.nrev + ' ulasan');
    else r.push('Rating ' + r1(p.rating) + ' · ' + p.sold + ' terjual');
    reasons[p.id] = r;
  });
  return reasons;
}

export function ruleParas(count: number, crit: ShopCriteria, relaxed: boolean, flags: ShopFlags): string[] {
  const { cheaper, other } = flags;
  const desc: string[] = [];
  if (crit.words.length) desc.push(crit.words[0]);
  if (crit.mats.length) desc.push('berbahan ' + crit.mats.map((m) => MATERIALS[m].toLowerCase()).join(' atau '));
  if (crit.budget && !relaxed) desc.push(cheaper ? 'yang lebih murah dari sebelumnya' : 'di bawah ' + rp(crit.budget));
  const paras: string[] = [];
  if (relaxed && cheaper) paras.push('Pilihan sebelumnya sudah yang termurah untuk kriteria ini. Ini daftar lengkapnya, diurutkan dari harga terendah:');
  else if (relaxed) paras.push('Belum ada ' + (desc.slice(0, 2).join(' ') || 'produk') + (other ? ' lain' : '') + ' di bawah ' + rp(crit.budget) + '. Ini yang paling mendekati, diurutkan dari yang termurah:');
  else paras.push('Aku menemukan ' + count + ' pilihan' + (desc.length ? ' ' + desc.join(', ') : '') + (other ? ' yang belum kutunjukkan' : '') + '.');
  if (crit.gift) paras.push('Untuk hadiah, aku memprioritaskan produk dengan cerita bahan yang jelas dan rating tinggi.');
  return paras;
}

/** Rakit balasan kartu produk + konteks lanjutan. `text` mengganti alasan/paragraf aturan (jalur LLM). */
export function productsReply(
  picks: Product[], crit: ShopCriteria, ctx: ShopContext, flags: ShopFlags, relaxed: boolean,
  text: { reasons?: Record<string, string[]>; paras?: string[] } = {},
): AssistantReply {
  const reasons = text.reasons || ruleReasons(picks, crit, relaxed, flags.cheaper);
  const paras = text.paras || ruleParas(picks.length, crit, relaxed, flags);
  return {
    msg: { role: 'ai', kind: 'products', ids: picks.map((p) => p.id), reasons, paras, chips: ['Yang lebih murah', 'Bandingkan produk ini', 'Ada pilihan lain?'] },
    ctx: { ...crit, budget: relaxed || flags.cheaper ? ctx.budget || crit.budget : crit.budget, lastIds: picks.map((p) => p.id), awaiting: null },
  };
}

/** Opsi pencarian dari konteks percakapan. */
export const searchOptions = (ctx: ShopContext, flags: ShopFlags, hidden: string[], uses?: string[]): SearchOptions => ({
  hidden, wantsBahan: flags.wantsBahan, exclude: flags.other && ctx.lastIds ? ctx.lastIds : [], uses,
});

export function shop(t: string, chat: EngineInput): AssistantReply {
  const ctx = chat.ctx || {};
  const flags = extractFlags(t);
  const raw = extractCriteria(t);
  const crit = mergeCriteria(raw, ctx, flags);
  const clarify = clarifyReply(crit, flags, raw.gift || ctx.awaiting === 'gift');
  if (clarify) return clarify;
  const { list, relaxed } = searchCatalog(crit, searchOptions(ctx, flags, chat.hidden || []));
  const picks = list.slice(0, MAX_PICKS);
  if (!picks.length) return noMatchReply(crit, flags);
  return productsReply(picks, crit, ctx, flags, relaxed);
}

/** Baris perbandingan untuk tampilan berkolom. */
export function compareRows(id: string) {
  const p = P(id);
  const s = SELLERS[p.seller];
  return {
    id: p.id,
    title: p.title,
    rows: [
      { k: 'Harga', v: rp(p.price) },
      { k: 'Material asal', v: p.originShort },
      { k: 'Kondisi', v: CONDITIONS[p.cond] },
      { k: 'Ukuran', v: p.dims },
      { k: 'Rating', v: r1(p.rating) + ' (' + p.nrev + ' ulasan)' },
      { k: 'Stok', v: p.stock > 0 ? p.stock + ' tersedia' : 'Habis' },
      { k: 'Penjual', v: s.name + ', ' + s.city },
      { k: 'Perawatan', v: p.care },
    ],
  };
}

export const SUGGESTIONS: Record<ChatMode, string[]> = {
  shop: ['Cari tas upcycle di bawah Rp150.000.', 'Aku butuh dekorasi kamar dari bahan daur ulang.', 'Ada produk berbahan denim bekas?', 'Rekomendasikan hadiah unik untuk teman.'],
  upcycle: ['Apa yang bisa dibuat dari celana jeans lama?', 'Bagaimana cara memanfaatkan botol plastik?', 'Material apa yang cocok untuk membuat tempat pensil?', 'Bagaimana menentukan harga produk upcycle?', 'Bagaimana membuat deskripsi produk yang menarik?'],
};
