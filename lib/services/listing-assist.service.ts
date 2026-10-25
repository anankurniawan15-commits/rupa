'use client';
/**
 * ListingAssistService — asisten listing di halaman Jual Produk + penerbitan listing.
 * TODO(Groq): suggestTitles / generateDescription → POST /api/listing-assist (Groq chat).
 */
import { PROC_TIMES, SELL_CATEGORIES, SELL_CONDS, SELL_SHIPS, SELL_STEPS, CITIES } from '@/lib/data';
import { calcPrice, claimsFlags, generateDescription, generateKeywords, priceReference, stepErrors, suggestTitles, AI_TIPS } from '@/lib/ai/listing-assist';
import { useSell, sellInit } from '@/lib/store/sell';
import { num } from '@/lib/format';
import { delay } from './util';
import { productService } from './product.service';
import type { Listing, ListingDraft } from '@/types/product';

export { SELL_CATEGORIES, SELL_CONDS, SELL_SHIPS, SELL_STEPS, PROC_TIMES, CITIES, sellInit, calcPrice, stepErrors, AI_TIPS };

export const listingAssistService = {
  async suggestTitles(draft: string, matOrigin: string, tags: string[]) {
    await delay(1100);
    return suggestTitles(draft, matOrigin, tags);
  },
  async generateDescription(form: ListingDraft): Promise<string> {
    await delay(1200);
    return generateDescription(form);
  },
  checkClaims: (text: string) => claimsFlags(text),
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
      await productService.update(form.editId, base);
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
  takeSeed(): ListingDraft | null {
    const s = useSell.getState().seed;
    useSell.getState().setSeed(null);
    return s;
  },
};
