export type CategoryKey = 'tekstil' | 'kayu' | 'plastik' | 'aksesori' | 'lainnya';
export type MaterialKey = 'denim' | 'kain' | 'kayu' | 'plastik' | 'logam' | 'karet';
export type ConditionKey = 'baru' | 'rekon' | 'bahan';
/** Pola placeholder CSS per material (`.ph-wood`, dst.). */
export type PlaceholderKind = 'wood' | 'plastic' | 'textile' | 'rubber' | 'metal' | 'screen';

export interface Seller {
  id: string;
  name: string;
  city: string;
  rating: number;
  nrev: number;
  initials: string;
  /** Perkiraan waktu membalas, mis. "± 1 jam". */
  resp: string;
  /** Material yang diterima kreator ini (untuk AI Sortir). */
  accepts: string;
}

export interface Product {
  id: string;
  title: string;
  price: number;
  seller: string;
  cat: CategoryKey;
  type: string;
  mats: MaterialKey[];
  matShort: string;
  cond: ConditionKey;
  origin: string;
  originShort: string;
  made: string;
  finished: string;
  comp: string;
  dims: string;
  care: string;
  note: string;
  stock: number;
  sold: number;
  rating: number;
  nrev: number;
  /** Urutan "terbaru" (semakin besar semakin baru). */
  date: number;
  img: string | null;
  gallery: string[];
  ph?: PlaceholderKind;
  uses: string[];
  kw: string;
  category?: string;
  conditionLabel?: string;
}

export type PriceFilter = '' | 'lt100' | '100-200' | 'gt200';
export type SortKey = 'rel' | 'new' | 'asc' | 'desc' | 'pop';

export interface ProductFilter {
  q: string;
  cat: CategoryKey | '';
  mats: MaterialKey[];
  price: PriceFilter;
  conds: ConditionKey[];
  city: string;
  r47: boolean;
  avail: boolean;
  sort: SortKey;
  seller: string;
}

export interface Review {
  n: string;
  d: string;
  s: number;
  t: string;
}

/** Listing milik penjual (dashboard). */
export type ListingStatus = 'aktif' | 'dijeda' | 'habis' | 'draf';
export interface Listing {
  id: string;
  title: string;
  price: number;
  stock: number;
  status: ListingStatus;
  views: number;
  img?: string | null;
  ph?: PlaceholderKind | null;
  /** id akun pemilik toko; data contoh tanpa owner milik akun "dinda". */
  owner?: string;
}

/** Draf formulir Jual Produk. */
export interface ListingDraft {
  photos: { url: string }[];
  draft: string;
  title: string;
  cat: string;
  matOrigin: string;
  tags: string[];
  cond: string;
  dims: string;
  weight: string;
  process: string;
  desc: string;
  keywords: string[];
  price: string;
  stock: string;
  city: string;
  procTime: string;
  ships: Record<'reg' | 'exp' | 'cargo' | 'pickup', boolean>;
  editId: string | null;
}
