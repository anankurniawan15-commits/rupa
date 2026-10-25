'use client';
/**
 * ProductService — katalog, detail, ulasan, dan listing penjual.
 * Sekarang membaca lib/data + store mock. TODO(Supabase): ganti isi fungsi dengan
 * supabase.from('products')... tanpa mengubah tanda tangan fungsi.
 */
import { useMemo } from 'react';
import { CATEGORIES, CONDITIONS, MATERIALS, PRODUCTS, REVIEWS, SELLERS } from '@/lib/data';
import { HOME } from '@/lib/data/home';
import { useDb, dbPatch, db } from '@/lib/store/db';
import type { CategoryKey, ConditionKey, Listing, ListingStatus, MaterialKey, PriceFilter, Product, ProductFilter, SortKey } from '@/types/product';

export const emptyFilter = (): ProductFilter => ({ q: '', cat: '', mats: [], price: '', conds: [], city: '', r47: false, avail: false, sort: 'rel', seller: '' });

export const PRICE_LABEL: Record<Exclude<PriceFilter, ''>, string> = { lt100: 'Di bawah Rp100.000', '100-200': 'Rp100.000–Rp200.000', gt200: 'Di atas Rp200.000' };
export const SORT_OPTIONS: [SortKey, string][] = [['rel', 'Urutkan: Paling relevan'], ['new', 'Urutkan: Terbaru'], ['asc', 'Urutkan: Harga terendah'], ['desc', 'Urutkan: Harga tertinggi'], ['pop', 'Urutkan: Terpopuler']];

/** Filter murni (port dari prototipe filterProducts). */
export function filterProducts(all: Product[], ex: ProductFilter): Product[] {
  let list = all;
  const q = (ex.q || '').trim().toLowerCase();
  if (q) {
    const toks = q.split(/\s+/).filter(Boolean);
    list = list
      .map((p) => {
        const hay = (p.title + ' ' + p.kw + ' ' + p.matShort + ' ' + CATEGORIES[p.cat] + ' ' + SELLERS[p.seller].name + ' ' + p.uses.join(' ')).toLowerCase();
        return { p, sc: toks.filter((t) => hay.indexOf(t) >= 0).length };
      })
      .filter((x) => x.sc > 0)
      .sort((a, b) => b.sc - a.sc)
      .map((x) => x.p);
  }
  if (ex.cat) list = list.filter((p) => p.cat === ex.cat);
  if (ex.mats.length) list = list.filter((p) => p.mats.some((m) => ex.mats.indexOf(m) >= 0));
  if (ex.price === 'lt100') list = list.filter((p) => p.price < 100000);
  if (ex.price === '100-200') list = list.filter((p) => p.price >= 100000 && p.price <= 200000);
  if (ex.price === 'gt200') list = list.filter((p) => p.price > 200000);
  if (ex.conds.length) list = list.filter((p) => ex.conds.indexOf(p.cond) >= 0);
  if (ex.city) list = list.filter((p) => SELLERS[p.seller].city === ex.city);
  if (ex.r47) list = list.filter((p) => SELLERS[p.seller].rating >= 4.7);
  if (ex.avail) list = list.filter((p) => p.stock > 0);
  if (ex.seller) list = list.filter((p) => p.seller === ex.seller);
  const sorters: Partial<Record<SortKey, (a: Product, b: Product) => number>> = {
    new: (a, b) => b.date - a.date, asc: (a, b) => a.price - b.price, desc: (a, b) => b.price - a.price, pop: (a, b) => b.sold - a.sold,
  };
  const sorter = sorters[ex.sort];
  if (sorter) list = list.slice().sort(sorter);
  return list;
}

/** Filter ⇄ query string URL (Jelajahi menyimpan filter di URL). */
export function filterFromParams(sp: URLSearchParams): ProductFilter {
  const f = emptyFilter();
  f.q = sp.get('q') || '';
  const cat = sp.get('kategori') || '';
  f.cat = (cat in CATEGORIES ? cat : '') as CategoryKey | '';
  f.mats = (sp.get('material') || '').split(',').filter((m) => m in MATERIALS) as MaterialKey[];
  const price = sp.get('harga') || '';
  f.price = (['lt100', '100-200', 'gt200'].indexOf(price) >= 0 ? price : '') as PriceFilter;
  f.conds = (sp.get('kondisi') || '').split(',').filter((c) => c in CONDITIONS) as ConditionKey[];
  f.city = sp.get('lokasi') || '';
  f.r47 = sp.get('rating') === '4.7';
  f.avail = sp.get('tersedia') === '1';
  const sort = sp.get('urut') || 'rel';
  f.sort = (SORT_OPTIONS.some(([k]) => k === sort) ? sort : 'rel') as SortKey;
  f.seller = sp.get('penjual') && SELLERS[sp.get('penjual')!] ? sp.get('penjual')! : '';
  return f;
}

export function filterToParams(f: Partial<ProductFilter>): string {
  const sp = new URLSearchParams();
  if (f.q?.trim()) sp.set('q', f.q.trim());
  if (f.cat) sp.set('kategori', f.cat);
  if (f.mats?.length) sp.set('material', f.mats.join(','));
  if (f.price) sp.set('harga', f.price);
  if (f.conds?.length) sp.set('kondisi', f.conds.join(','));
  if (f.city) sp.set('lokasi', f.city);
  if (f.r47) sp.set('rating', '4.7');
  if (f.avail) sp.set('tersedia', '1');
  if (f.sort && f.sort !== 'rel') sp.set('urut', f.sort);
  if (f.seller) sp.set('penjual', f.seller);
  const s = sp.toString();
  return s ? '?' + s : '';
}

/** URL halaman Jelajahi dengan filter. */
export const exploreHref = (f: Partial<ProductFilter> = {}) => '/jelajahi' + filterToParams(f);

const visible = (hidden: string[]) => PRODUCTS.filter((p) => hidden.indexOf(p.id) < 0);

export const productService = {
  async search(filter: ProductFilter): Promise<Product[]> {
    return filterProducts(visible(db().hidden), filter);
  },
  async getDetail(id: string): Promise<Product | null> {
    return PRODUCTS.find((p) => p.id === id) || null;
  },
  /* ---- listing penjual (dashboard) ---- */
  async create(dto: Omit<Listing, 'id' | 'views' | 'status'>): Promise<Listing> {
    const item: Listing = { ...dto, id: 'L' + Date.now(), status: 'aktif', views: 0 };
    dbPatch((s) => ({ listings: [item, ...s.listings] }));
    return item;
  },
  async update(id: string, dto: Partial<Listing>): Promise<void> {
    dbPatch((s) => ({ listings: s.listings.map((l) => (l.id === id ? { ...l, ...dto, views: l.views } : l)) }));
  },
  async setStatus(id: string, status: ListingStatus): Promise<void> {
    dbPatch((s) => ({ listings: s.listings.map((l) => (l.id === id ? { ...l, status } : l)) }));
  },
};

/* ---------- selector sinkron untuk render (katalog lokal) ---------- */
export const getProduct = (id: string) => PRODUCTS.find((p) => p.id === id);
export const getSeller = (id: string) => SELLERS[id];
export const allSellers = () => SELLERS;
export const reviewsFor = (id: string) => REVIEWS[id] || REVIEWS.def;
/** Distribusi bintang contoh [5,4,3,2,1] dalam persen. */
export const ratingDistribution = (rating: number) => (rating >= 4.8 ? [84, 11, 3, 1, 1] : rating >= 4.6 ? [70, 20, 6, 2, 2] : [58, 26, 10, 4, 2]);
export const categoryLabel = (k: CategoryKey) => CATEGORIES[k];
export const conditionLabel = (k: ConditionKey) => CONDITIONS[k];
export const materialLabel = (k: MaterialKey) => MATERIALS[k];
export const CATEGORY_ENTRIES = Object.entries(CATEGORIES) as [CategoryKey, string][];
export const MATERIAL_ENTRIES = Object.entries(MATERIALS) as [MaterialKey, string][];
export const CONDITION_ENTRIES = Object.entries(CONDITIONS) as [ConditionKey, string][];
/** Jumlah produk per material (semua katalog, seperti prototipe). */
export const materialCount = (m: MaterialKey) => PRODUCTS.filter((p) => p.mats.indexOf(m) >= 0).length;

/** Katalog yang terlihat (tanpa listing yang diturunkan admin). Reaktif. */
export function useCatalog(): Product[] {
  const hidden = useDb((s) => s.hidden);
  return useMemo(() => visible(hidden), [hidden]);
}

export function useIsHidden(id: string) {
  return useDb((s) => s.hidden.indexOf(id) >= 0);
}

/** Produk terkait: kategori/material sama, lalu sisanya, maks 4. */
export function relatedProducts(p: Product, catalog: Product[]) {
  return catalog
    .filter((x) => x.id !== p.id && (x.cat === p.cat || x.mats.some((m) => p.mats.indexOf(m) >= 0)))
    .concat(catalog.filter((x) => x.id !== p.id))
    .filter((x, i, a) => a.indexOf(x) === i)
    .slice(0, 4);
}

/* ---------- tambahan untuk Beranda & Jelajahi ---------- */

/** Konten editorial Beranda (hero, cerita utama, minat, tile material, cerita transformasi). */
export const homeContent = () => HOME;

/** Daftar kota penjual (urut abjad) untuk filter "Lokasi penjual". */
export const SELLER_CITIES: string[] = Object.values(SELLERS)
  .map((s) => s.city)
  .filter((c, i, a) => a.indexOf(c) === i)
  .sort((a, b) => a.localeCompare(b, 'id'));

/** Opsi radio harga di panel filter (termasuk "Semua harga"). */
export const PRICE_OPTIONS: [PriceFilter, string][] = [['', 'Semua harga'], ['lt100', PRICE_LABEL.lt100], ['100-200', PRICE_LABEL['100-200']], ['gt200', PRICE_LABEL.gt200]];
