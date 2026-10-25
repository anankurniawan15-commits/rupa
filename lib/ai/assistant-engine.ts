/**
 * Mesin AI Assistant berbasis aturan — port dari prototipe (respond → shop / consult / compareResp).
 * TODO(Groq): assistant.service.ts nanti mengganti fungsi ini dengan panggilan Groq chat
 * + pencarian katalog Supabase; bentuk keluaran (AssistantReply) dipertahankan.
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

export function respond(text: string, chat: EngineInput): AssistantReply {
  const t = text.toLowerCase();
  if (/bandingkan|perbandingan/.test(t)) return compareResp(chat);
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

export function shop(t: string, chat: EngineInput): AssistantReply {
  const ctx = chat.ctx || {};
  const budget = parseBudget(t);
  const mats: MaterialKey[] = [];
  MATRX.forEach(([re, k]) => { if (re.test(t)) mats.push(k); });
  let types: string[] = [];
  const words: string[] = [];
  TYPERX.forEach(([re, arr, w]) => { if (re.test(t)) { types = types.concat(arr); words.push(w); } });
  const gift = /hadiah|kado/.test(t) || ctx.awaiting === 'gift';
  const cheaper = /lebih murah|yang murah|termurah/.test(t);
  const other = /pilihan lain|yang lain|lainnya/.test(t);
  const wantsBahan = /\bbahan\b/.test(t);
  const refine = cheaper || other || /^(yang|kalau|terus|oke|ada yang)/.test(t);
  let crit = { budget, mats, types, words, gift };
  if (refine) {
    crit = {
      budget: budget || ctx.budget || 0,
      mats: mats.length ? mats : ctx.mats || [],
      types: types.length ? types : ctx.types || [],
      words: words.length ? words : ctx.words || [],
      gift: gift || !!ctx.gift,
    };
  }
  if (cheaper && ctx.lastIds && ctx.lastIds.length) crit.budget = Math.min(...ctx.lastIds.map((id) => P(id).price)) - 1;
  const nothing = !crit.budget && !crit.mats.length && !crit.types.length;
  if (nothing && gift) {
    return { msg: { role: 'ai', kind: 'clarify', paras: ['Bisa! Supaya pilihannya pas: kira-kira budget-nya berapa, dan temanmu lebih suka barang fashion atau barang untuk kamar dan meja?'], chips: ['Hadiah di bawah Rp100.000', 'Hadiah fashion di bawah Rp150.000', 'Hadiah untuk meja kerja'] }, ctx: { awaiting: 'gift', gift: true } };
  }
  if (nothing && !refine) {
    return { msg: { role: 'ai', kind: 'clarify', paras: ['Aku bisa mencarikan produk dari katalog Rupa. Sebutkan salah satu: budget, jenis barang, material, atau untuk apa barangnya.'], chips: ['Tas di bawah Rp150.000', 'Dekorasi kamar dari kayu', 'Produk berbahan denim bekas'] }, ctx: {} };
  }
  const hidden = chat.hidden || [];
  const base = PRODUCTS.filter((p) => p.stock > 0 && hidden.indexOf(p.id) < 0 && (wantsBahan || p.type !== 'bahan'));
  const match = (p: Product, withBudget: boolean) =>
    (!withBudget || !crit.budget || p.price <= crit.budget) &&
    (!crit.mats.length || p.mats.some((m) => crit.mats.indexOf(m) >= 0)) &&
    (!crit.types.length || crit.types.indexOf(p.type) >= 0);
  let list = base.filter((p) => match(p, true));
  if (other && ctx.lastIds) list = list.filter((p) => ctx.lastIds!.indexOf(p.id) < 0);
  const score = (p: Product) => p.rating * 10 + p.sold / 40 + (crit.gift && p.uses.indexOf('hadiah') >= 0 ? 6 : 0);
  list.sort((a, b) => score(b) - score(a));
  let relaxed = false;
  if (!list.length && crit.budget) {
    relaxed = true;
    list = base.filter((p) => match(p, false) && !(other && ctx.lastIds && ctx.lastIds.indexOf(p.id) >= 0)).sort((a, b) => a.price - b.price);
  }
  const picks = list.slice(0, 3);
  if (!picks.length) {
    return {
      msg: { role: 'ai', kind: 'clarify', paras: [other ? 'Itu semua pilihan yang cocok di katalog saat ini.' : 'Belum ada produk di katalog yang cocok dengan kriteria itu.', 'Coba longgarkan salah satu: material, jenis barang, atau budget.'], chips: ['Tampilkan produk di bawah Rp100.000', 'Ada produk berbahan kayu?'] },
      ctx: { ...crit, lastIds: [] },
    };
  }
  const reasons: Record<string, string[]> = {};
  picks.forEach((p) => {
    const r: string[] = [];
    if (crit.budget && !relaxed) r.push(rp(p.price) + ' — masih di bawah ' + rp(cheaper ? crit.budget + 1 : crit.budget));
    else r.push('Harga ' + rp(p.price));
    r.push((crit.mats.length ? 'Material: ' : 'Dibuat dari ') + p.matShort.toLowerCase() + ' (menurut penjual)');
    if (crit.gift) r.push(p.stock === 1 ? 'Satu-satunya — tidak ada yang sama persis' : 'Rating ' + r1(p.rating) + ' dari ' + p.nrev + ' ulasan');
    else r.push('Rating ' + r1(p.rating) + ' · ' + p.sold + ' terjual');
    reasons[p.id] = r;
  });
  const desc: string[] = [];
  if (crit.words.length) desc.push(crit.words[0]);
  if (crit.mats.length) desc.push('berbahan ' + crit.mats.map((m) => MATERIALS[m].toLowerCase()).join(' atau '));
  if (crit.budget && !relaxed) desc.push(cheaper ? 'yang lebih murah dari sebelumnya' : 'di bawah ' + rp(crit.budget));
  const paras: string[] = [];
  if (relaxed && cheaper) paras.push('Pilihan sebelumnya sudah yang termurah untuk kriteria ini. Ini daftar lengkapnya, diurutkan dari harga terendah:');
  else if (relaxed) paras.push('Belum ada ' + (desc.slice(0, 2).join(' ') || 'produk') + (other ? ' lain' : '') + ' di bawah ' + rp(crit.budget) + '. Ini yang paling mendekati, diurutkan dari yang termurah:');
  else paras.push('Aku menemukan ' + picks.length + ' pilihan' + (desc.length ? ' ' + desc.join(', ') : '') + (other ? ' yang belum kutunjukkan' : '') + '.');
  if (crit.gift) paras.push('Untuk hadiah, aku memprioritaskan produk dengan cerita bahan yang jelas dan rating tinggi.');
  return {
    msg: { role: 'ai', kind: 'products', ids: picks.map((p) => p.id), reasons, paras, chips: ['Yang lebih murah', 'Bandingkan produk ini', 'Ada pilihan lain?'] },
    ctx: { ...crit, budget: relaxed || cheaper ? ctx.budget || crit.budget : crit.budget, lastIds: picks.map((p) => p.id), awaiting: null },
  };
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
