/**
 * Data contoh, diimpor dari rupa-ui-kit/design/data (disalin ke lib/data/*.json).
 * Hanya lapisan lib/services yang boleh mengimpor modul ini; komponen membaca lewat service/store.
 * Nanti diganti query Supabase — lihat README bagian "Titik sambung backend".
 */
import productsJson from './products.json';
import sellersJson from './sellers.json';
import reviewsJson from './reviews.json';
import taxonomyJson from './taxonomy.json';
import accountsJson from './accounts-demo.json';
import adminJson from './admin.json';
import buyerJson from './buyer.json';
import dashJson from './seller-dashboard.json';
import paymentsJson from './payments.json';
import gatingJson from './auth-gating.json';
import sortirJson from './ai-sortir.json';
import assistantJson from './ai-assistant.json';
import claimsJson from './listing-claims.json';

import type { CategoryKey, ConditionKey, Listing, MaterialKey, Product, Review, Seller } from '@/types/product';
import type { Account } from '@/types/user';
import type { Order, SellerOrder, SellerReview } from '@/types/order';
import type { Dispute, Report } from '@/types/social';
import type { ActionKey, AiMessage, Conversation, SampleKey, ScenarioKey, SortirSample, SortirScenario } from '@/types/ai';

export const PRODUCTS = productsJson as unknown as Product[];

export const SELLERS: Record<string, Seller> = Object.fromEntries(
  Object.entries(sellersJson).map(([id, s]) => [id, { id, ...s }]),
);

export const REVIEWS = reviewsJson as Record<string, Review[]>;

export const CATEGORIES = taxonomyJson.categories as Record<CategoryKey, string>;
export const MATERIALS = taxonomyJson.materials as Record<MaterialKey, string>;
export const CONDITIONS = taxonomyJson.conditions as Record<ConditionKey, string>;
export const SELL_TYPES = taxonomyJson.sellCategoryTypes as Record<string, string[]>;
export const SELL_CONDS = taxonomyJson.sellConditions as [string, string, string][];
export const SELL_SHIPS = taxonomyJson.shippingOptions as [string, string, string][];
export const SELL_STEPS = ['Foto produk', 'Judul dan kategori', 'Material dan detail', 'Harga dan stok', 'Pengiriman', 'Pratinjau dan terbit'];

export { PH_LABEL } from './placeholder';

/** Kota di Pulau Jawa untuk simulasi ongkir. */
export const JAWA = ['Bandung', 'Bekasi', 'Depok', 'Jakarta Selatan', 'Jepara', 'Malang', 'Semarang', 'Surabaya', 'Yogyakarta'];
/** Pilihan kota (checkout, buka toko, jual). */
export const CITIES = ['Bandung', 'Bekasi', 'Depok', 'Denpasar', 'Jakarta Selatan', 'Jepara', 'Makassar', 'Malang', 'Medan', 'Semarang', 'Surabaya', 'Yogyakarta'];

/** Tanggal "hari ini" pada data contoh. */
export const TODAY = '19 Okt 2026';

/* ---------- akun ---------- */
type RawAccount = Account & { pass: string };
const RAW_ACCOUNTS = accountsJson.accounts as RawAccount[];
/** Akun tanpa kata sandi — aman untuk store. */
export const SEED_ACCOUNTS: Account[] = RAW_ACCOUNTS.map(({ pass: _pass, ...a }) => a);
export const OTP_DEMO = accountsJson.otpDemoCode;
export const LOGIN_MAX_ATTEMPTS = accountsJson.loginLock.maxAttempts;
/** Hanya untuk auth.service (mock). Jangan diimpor di tempat lain. */
export const __DEMO_PASSWORDS: Record<string, string> = Object.fromEntries(RAW_ACCOUNTS.map((a) => [a.id, a.pass]));

export const AUTH_NOTE = gatingJson as Record<string, string>;

/* ---------- pembeli ---------- */
export const SEED_PROFILE = {
  ...buyerJson.profile,
  notif: { order: true, chat: true, sortir: true, promo: false },
  privacy: { delPhoto: true, personal: true },
  saved: buyerJson.profile.savedAnalyses,
};
export const SEED_ORDERS = buyerJson.orders as Order[];
export const SEED_CART = buyerJson.cart;
export const SEED_WISH = buyerJson.wishlist as string[];

/* ---------- penjual ---------- */
export const WEEKS = dashJson.weeklyRevenue as [string, number][];
export const SEED_LISTINGS = dashJson.listings as Listing[];
export const SEED_SELLER_ORDERS = dashJson.sellerOrders as SellerOrder[];
export const SEED_SELLER_REVIEWS = dashJson.reviews as SellerReview[];

/* ---------- admin ---------- */
export const SEED_REPORTS = adminJson.reports as Report[];
export const SEED_DISPUTES = adminJson.disputes as Dispute[];
export const DISPUTE_DECISIONS = adminJson.disputeDecisions as string[];

/* ---------- pembayaran ---------- */
export const BANKS = paymentsJson.banks;
export const WALLETS = paymentsJson.wallets;
export const VA_PREFIX = paymentsJson.vaPrefix as Record<string, string>;
export const PAY_GUIDES = (bank: string) => ({
  mbank: paymentsJson.guides.mbank.map((s) => s.replace('{bank}', bank)),
  atm: paymentsJson.guides.atm.map((s) => s.replace('{bank}', bank)),
  ib: paymentsJson.guides.ib.map((s) => s.replace('{bank}', bank)),
});

/* ---------- AI Sortir ---------- */
export const SORTIR_SAMPLES = sortirJson.samples as Record<SampleKey, SortirSample>;
export const SORTIR_SCENARIOS = sortirJson.scenarios as unknown as Record<ScenarioKey, SortirScenario>;
export const SORTIR_ACTIONS = sortirJson.actions as [ActionKey, string][];
export const SORTIR_LOW_CONFIDENCE = sortirJson.lowConfidenceThreshold;

/* ---------- AI Assistant ---------- */
export const ASSISTANT_KB = assistantJson.knowledgeBase as unknown as Record<string, AiMessage>;
export const MATERIAL_PATTERNS = assistantJson.materialPatterns.map((x) => [new RegExp(x.pattern), x.material as MaterialKey] as const);
export const TYPE_PATTERNS = assistantJson.typePatterns.map((x) => [new RegExp(x.pattern), x.types, x.word] as const);
export const SEED_CONVERSATIONS = assistantJson.seedConversations as unknown as Record<string, Conversation>;

/* ---------- asisten listing ---------- */
export const CLAIM_RULES = claimsJson.map((c) => ({ re: new RegExp(c.pattern, c.flags), phrase: c.phrase, why: c.why, generic: c.generic }));

/* ---------- label status ---------- */
export const ORDER_STATUS_LABEL = { menunggu: 'Menunggu pembayaran', dikemas: 'Dikemas penjual', dikirim: 'Dalam pengiriman', selesai: 'Selesai', dibatalkan: 'Dibatalkan' } as const;
export const SELLER_ORDER_STATUS_LABEL = { baru: 'Pesanan baru', dikemas: 'Dikemas', dikirim: 'Dikirim', selesai: 'Selesai' } as const;
export const LISTING_STATUS_LABEL = { aktif: 'Aktif', dijeda: 'Dijeda', habis: 'Stok habis', draf: 'Draf' } as const;
export const SHOP_STATUS = {
  pending: ['st st-draf', 'Menunggu verifikasi'],
  verified: ['st st-aktif', 'Terverifikasi'],
  rejected: ['st st-habis', 'Ditolak'],
} as const;

export { HOME } from './home';

/** Lokasi di filter Jelajahi (kota penjual). */
export const FILTER_CITIES = ['Bandung', 'Bekasi', 'Depok', 'Jakarta Selatan', 'Jepara', 'Malang', 'Surabaya', 'Yogyakarta'];
/** Bank untuk rekening penjual (Buka Toko). */
export const SHOP_BANKS = ['BCA', 'BNI', 'BRI', 'Mandiri', 'BSI', 'Bank lain'];
export const PROC_TIMES: [string, string][] = [['1–2 hari kerja', '1–2 hari kerja'], ['3–5 hari kerja', '3–5 hari kerja (dibuat setelah dipesan)'], ['1–2 minggu', '1–2 minggu (pesanan khusus)']];
export const SELL_CATEGORIES = ['Tas dan Dompet', 'Pakaian', 'Aksesori', 'Dekorasi Rumah', 'Furnitur', 'Organizer dan Alat Tulis', 'Bahan dan Material'];
export const REPORT_REASONS = ['Informasi material tidak sesuai', 'Klaim lingkungan yang menyesatkan', 'Barang terlarang atau berbahaya', 'Ajakan bertransaksi di luar Rupa', 'Lainnya'];
export const DISPUTE_REASONS = ['Barang tidak sesuai deskripsi material', 'Barang rusak saat diterima', 'Paket belum sampai melewati estimasi', 'Lainnya'];
