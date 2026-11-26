/**
 * Asisten listing simulasi — port dari prototipe: saran judul/kategori/tag, draf deskripsi,
 * deteksi klaim berisiko, referensi harga, kalkulator harga, kata kunci.
 * TODO(Groq): listing-assist.service.ts nanti meminta saran ke Groq; claimsFlags tetap lokal.
 */
import { CLAIM_RULES, PRODUCTS, SELL_CONDS, SELL_TYPES } from '@/lib/data';
import { num, rp } from '@/lib/format';
import type { ClaimFlag, PriceReference, TitleSuggestion } from '@/types/ai';
import type { ListingDraft } from '@/types/product';

export function suggestTitles(draft: string, matOrigin: string, currentTags: string[]): TitleSuggestion {
  const t = (draft + ' ' + matOrigin).toLowerCase();
  const noun = /tote|\btas\b/.test(t) ? 'Tote Bag' : /dompet/.test(t) ? 'Dompet' : /pouch/.test(t) ? 'Pouch' : /celana|kulot/.test(t) ? 'Celana' : /jaket/.test(t) ? 'Jaket' : /lampu/.test(t) ? 'Lampu Meja' : /\bpot\b/.test(t) ? 'Pot Tanaman' : /bantal/.test(t) ? 'Sarung Bantal' : /apron|celemek/.test(t) ? 'Apron' : /tutup botol|botol/.test(t) ? 'Bahan Tutup Botol' : 'Produk Upcycle';
  const mat = /jeans|denim/.test(t) ? 'Denim Bekas' : /kayu|jati|palet|kursi/.test(t) ? 'Kayu Reklamasi' : /plastik|botol/.test(t) ? 'Plastik Cacah' : /perca|kain sisa/.test(t) ? 'Kain Perca' : /kaleng/.test(t) ? 'Kaleng Bekas' : /\bban\b/.test(t) ? 'Ban Dalam Bekas' : 'Bahan Bekas';
  const textile = /Denim|Perca/.test(mat);
  const recCat = /Bahan Tutup/.test(noun) || /sebagai bahan|bahan mentah|dijual bahan/.test(t) ? 'Bahan dan Material'
    : ['Tote Bag', 'Dompet', 'Pouch'].indexOf(noun) >= 0 ? 'Tas dan Dompet'
    : ['Celana', 'Jaket', 'Apron'].indexOf(noun) >= 0 ? 'Pakaian'
    : ['Lampu Meja', 'Pot Tanaman', 'Sarung Bantal'].indexOf(noun) >= 0 ? 'Dekorasi Rumah' : 'Aksesori';
  const tagMap: Record<string, string[]> = { 'Denim Bekas': ['denim bekas', 'katun', 'upcycle tekstil'], 'Kayu Reklamasi': ['kayu reklamasi', 'finishing minyak'], 'Plastik Cacah': ['plastik cacah', 'HDPE'], 'Kain Perca': ['kain perca', 'katun'], 'Kaleng Bekas': ['kaleng bekas', 'logam'], 'Ban Dalam Bekas': ['karet', 'ban dalam'], 'Bahan Bekas': ['upcycle'] };
  return {
    titles: [noun + ' ' + mat, noun + ' dari ' + mat + ' — Buatan Tangan', noun + ' ' + mat.split(' ')[0] + ' Upcycle, ' + (textile ? 'Jahit Ulang' : 'Finishing Manual')],
    recCat,
    tags: tagMap[mat].filter((x) => currentTags.indexOf(x) < 0),
  };
}

export function generateDescription(s: Pick<ListingDraft, 'title' | 'matOrigin' | 'process' | 'cond' | 'dims'>): string {
  const cond = (SELL_CONDS.find((c) => c[0] === s.cond) || ['', '[pilih kondisi]'])[1].toLowerCase();
  const parts: string[] = [];
  parts.push((s.title.trim() || 'Produk ini') + ' dibuat dari ' + (s.matOrigin.trim() || '[tulis material asal]') + '.');
  if (s.process.trim()) parts.push('Proses: ' + s.process.trim().replace(/\.$/, '') + '.');
  parts.push('Kondisi: ' + cond + '.');
  if (s.dims.trim()) parts.push('Ukuran: ' + s.dims.trim() + '.');
  parts.push('Setiap produk dibuat satu per satu, jadi warna dan detailnya bisa sedikit berbeda dari foto.');
  return parts.join(' ');
}

/** Klaim berisiko secara real-time. "ramah lingkungan" umum tidak diulang bila "100%..." sudah kena. */
export function claimsFlags(text: string): ClaimFlag[] {
  const out: ClaimFlag[] = [];
  let hit100 = false;
  CLAIM_RULES.forEach(({ re, phrase, why, generic }, i) => {
    if (!re.test(text)) return;
    if (i === 0) hit100 = true;
    if (generic && hit100) return;
    out.push({ phrase, why });
  });
  return out;
}

/** Referensi harga hanya bila ada ≥3 listing pembanding. */
export function priceReference(category: string): PriceReference {
  const types = SELL_TYPES[category] || [];
  const comps = PRODUCTS.filter((x) => types.indexOf(x.type) >= 0).map((x) => x.price).sort((a, b) => a - b);
  const has = comps.length >= 3;
  return { has, n: comps.length, range: has ? rp(comps[0]) + '–' + rp(comps[comps.length - 1]) : '', median: has ? rp(comps[Math.floor(comps.length / 2)]) : '' };
}

/** (bahan + jam × tarif) × 1,3, dibulatkan ke Rp5.000 terdekat. */
export function calcPrice(mat: string, hours: string, rate: string) {
  const cm = num(mat);
  const ch = parseFloat(String(hours).replace(',', '.')) || 0;
  const cr = num(rate);
  const has = cm > 0 && ch > 0 && cr > 0;
  const cost = cm + ch * cr;
  const price = Math.round((cost * 1.3) / 5000) * 5000;
  return { has, cost, price };
}

export function generateKeywords(s: Pick<ListingDraft, 'title' | 'matOrigin' | 'draft'>): string[] {
  const base = [s.title, s.matOrigin, s.draft].join(' ').toLowerCase();
  const kw: string[] = [];
  ([['tote', 'tote bag'], ['tas', 'tas upcycle'], ['jeans', 'jeans bekas'], ['denim', 'denim'], ['kanvas', 'kanvas'], ['perca', 'kain perca'], ['kayu', 'kayu bekas'], ['plastik', 'plastik daur ulang'], ['laptop', 'tas laptop'], ['hadiah', 'kado unik']] as const)
    .forEach(([k, w]) => { if (base.indexOf(k) >= 0) kw.push(w); });
  kw.push('handmade', 'upcycle');
  return kw.filter((x, i) => kw.indexOf(x) === i).slice(0, 8);
}

/** Validasi per langkah (1–5). Pesan galat persis seperti prototipe. */
export function stepErrors(n: number, s: ListingDraft): Record<string, string> {
  const e: Record<string, string> = {};
  if (n === 1 && !s.photos.length) e.photos = 'Tambahkan minimal satu foto produk.';
  if (n === 2) {
    if (s.title.trim().length < 10) e.title = 'Judul wajib diisi, minimal 10 karakter.';
    if (!s.cat) e.cat = 'Pilih kategori.';
  }
  if (n === 3) {
    if (!s.matOrigin.trim()) e.matOrigin = 'Tulis material asal — ini informasi utama bagi pembeli.';
    if (!s.cond) e.cond = 'Pilih kondisi produk.';
  }
  if (n === 4) {
    if (num(s.price) < 1000) e.price = 'Isi harga dalam angka, minimal Rp1.000.';
    if (num(s.stock) < 1) e.stock = 'Stok minimal 1.';
  }
  if (n === 5) {
    if (!s.city) e.city = 'Pilih kota pengiriman.';
    if (!Object.values(s.ships).some(Boolean)) e.ships = 'Pilih minimal satu opsi pengiriman.';
  }
  return e;
}

export const AI_TIPS = (step: number, ctx: { recCat: string; flags: number; refHas: boolean; refN: number; missing: number }): string[] => ({
  1: ['Foto sampul dengan latar polos lebih mudah dikenali.', 'Tambahkan foto material asal atau proses pembuatan.', 'Tunjukkan cacat kecil dengan jujur — ini mengurangi komplain.'],
  2: ['Tulis cerita dulu, lalu minta saran judul.', 'Judul yang baik: jenis produk + material asal.', ctx.recCat ? 'Saran kategori: ' + ctx.recCat + '.' : 'AI akan menyarankan kategori dari ceritamu.'],
  3: [ctx.flags ? ctx.flags + ' klaim perlu dicek ulang.' : 'Belum ada klaim berisiko yang terdeteksi.', 'Pisahkan material asal dari produk jadi.', 'Ukuran dan cara perawatan mengurangi pertanyaan pembeli.'],
  4: [ctx.refHas ? 'Referensi harga tersedia dari ' + ctx.refN + ' listing serupa.' : 'Referensi harga belum tersedia untuk kategori ini.', 'Pakai kalkulator untuk memastikan waktu kerjamu terbayar.'],
  5: ['Pilih Kargo untuk barang besar seperti furnitur.', 'Waktu pengemasan yang realistis menghindari pembatalan.'],
  6: [ctx.missing ? ctx.missing + ' langkah masih kurang lengkap.' : 'Semua info wajib lengkap.', ctx.flags + ' klaim perlu dicek.', 'Setelah terbit, listing bisa diedit atau dijeda dari dashboard.'],
}[step] || []);
