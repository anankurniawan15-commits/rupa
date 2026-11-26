'use client';
/**
 * ListingAssistService — asisten listing di halaman Jual Produk + penerbitan listing.
 * Memanggil POST /api/listing-assist (Groq chat) dengan fallback ke aturan lokal.
 */
import { PROC_TIMES, SELL_CATEGORIES, SELL_CONDS, SELL_SHIPS, SELL_STEPS, CITIES } from '@/lib/data';
import { calcPrice, claimsFlags, generateDescription, generateKeywords, priceReference, stepErrors, suggestTitles, AI_TIPS } from '@/lib/ai/listing-assist';
import { safetyWarnings } from '@/lib/ai/safety';
import { useSell, sellInit } from '@/lib/store/sell';
import { num } from '@/lib/format';
import { productService } from './product.service';
import type { ListingAiMeta, TitleSuggestion } from '@/types/ai';
import type { Listing, ListingDraft } from '@/types/product';

export { SELL_CATEGORIES, SELL_CONDS, SELL_SHIPS, SELL_STEPS, PROC_TIMES, CITIES, sellInit, calcPrice, stepErrors, AI_TIPS };

/** Foto contoh tombol "Gunakan foto contoh (prototipe)". */
export const SAMPLE_PHOTOS: { url: string }[] = [{ url: '/products/tote-saku-denim.jpg' }, { url: '/products/tote-saku-denim-detail.jpg' }];
/** Tarif per jam bawaan kalkulator harga (prototipe). */
export const CALC_RATE_DEFAULT = '20000';
export const MAX_PHOTOS = 5;
export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function buildLocalMeta(text: string): ListingAiMeta {
  const sw = safetyWarnings(text);
  const cw = claimsFlags(text);
  return {
    safety_warnings: sw,
    claim_warnings: cw,
    needs_claim_review: Boolean(sw.length || cw.length),
    price_comparisons: [],
    price_reference_status: 'Membutuhkan minimal 3 listing pembanding valid.',
    text_provider: 'Lokal (Fallback)',
    text_model: 'rule-based-v1',
    crisp_dm_version: '1.0-crispdm',
  };
}

async function callListingApi<T>(payload: unknown): Promise<T | null> {
  try {
    const res = await fetch('/api/listing-assist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const listingAssistService = {
  async suggestTitles(draft: string, matOrigin: string, tags: string[], price?: string): Promise<TitleSuggestion> {
    const res = await callListingApi<{ task: 'titles'; data: TitleSuggestion }>({
      task: 'titles',
      draft,
      matOrigin,
      tags,
      ...(price ? { price } : {}),
    });
    if (res?.data) return res.data;
    const fb = suggestTitles(draft, matOrigin, tags);
    const combined = [fb.titles[0] || '', draft, matOrigin, ...fb.tags].join(' ');
    return {
      title: fb.titles[0] || '',
      ...fb,
      ...buildLocalMeta(combined),
    };
  },

  async generateDescriptionWithMeta(form: ListingDraft): Promise<{ description: string; meta: ListingAiMeta }> {
    const res = await callListingApi<{ task: 'description'; description: string; meta?: ListingAiMeta }>({
      task: 'description',
      title: form.title,
      draft: form.draft,
      matOrigin: form.matOrigin,
      process: form.process,
      cond: form.cond,
      dims: form.dims,
    });
    if (res?.description) {
      return {
        description: res.description,
        meta: res.meta || buildLocalMeta([form.title, res.description, form.matOrigin].join(' ')),
      };
    }
    const fb = generateDescription(form);
    return { description: fb, meta: buildLocalMeta([form.title, fb, form.matOrigin].join(' ')) };
  },

  async generateDescription(form: ListingDraft): Promise<string> {
    const out = await listingAssistService.generateDescriptionWithMeta(form);
    return out.description;
  },

  async suggestKeywordsWithMeta(form: ListingDraft): Promise<{ keywords: string[]; meta: ListingAiMeta }> {
    const res = await callListingApi<{ task: 'keywords'; keywords: string[]; meta?: ListingAiMeta }>({
      task: 'keywords',
      title: form.title,
      draft: form.draft,
      matOrigin: form.matOrigin,
    });
    if (res?.keywords) {
      return {
        keywords: res.keywords,
        meta: res.meta || buildLocalMeta([form.title, form.matOrigin, ...res.keywords].join(' ')),
      };
    }
    const fb = generateKeywords(form);
    return { keywords: fb, meta: buildLocalMeta([form.title, form.matOrigin, ...fb].join(' ')) };
  },

  async suggestKeywords(form: ListingDraft): Promise<string[]> {
    const out = await listingAssistService.suggestKeywordsWithMeta(form);
    return out.keywords;
  },

  checkClaims: (text: string) => claimsFlags(text),
  checkSafety: (text: string) => safetyWarnings(text),
  priceReference: (category: string) => priceReference(category),
  keywords: (form: ListingDraft) => generateKeywords(form),

  /** Langkah yang belum lengkap (1–5). */
  missingSteps(form: ListingDraft) {
    return [1, 2, 3, 4, 5].filter((n) => Object.keys(stepErrors(n, form)).length);
  },

  /** Terbitkan / simpan perubahan. Prototipe: listing masuk dashboard, belum katalog publik. */
  async publish(form: ListingDraft, ownerId: string): Promise<Listing> {
    const base = { title: form.title.trim(), price: num(form.price), stock: num(form.stock), owner: ownerId, img: form.photos[0]?.url || null, ph: form.photos[0] ? null : ('textile' as const) };
    if (form.editId) {
      await productService.update(form.editId, { ...base, status: 'aktif' });
      return { ...base, id: form.editId, status: 'aktif', views: 0 };
    }
    return productService.create(base);
  },

  /** Isi draf dari hasil AI Sortir atau dari listing yang diedit, lalu buka /jual. */
  seedDraft(patch: Partial<ListingDraft>) {
    useSell.getState().setSeed({ ...sellInit(), ...patch });
  },
  seedFromListing(l: Listing) {
    listingAssistService.seedDraft({ editId: l.id, title: l.title, draft: l.title, price: String(l.price), stock: String(Math.max(1, l.stock)), cat: 'Tas dan Dompet', matOrigin: 'Jeans bekas dan kanvas sisa', cond: 'baru', photos: l.img ? [{ url: l.img }] : [] });
  },
  /** Lihat draf titipan tanpa menghapusnya (aman untuk initializer useState di StrictMode). */
  peekSeed(): ListingDraft | null {
    return useSell.getState().seed;
  },
  takeSeed(): ListingDraft | null {
    const s = useSell.getState().seed;
    useSell.getState().setSeed(null);
    return s;
  },
};
