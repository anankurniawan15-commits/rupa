'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { safeStorage } from './storage';
import {
  SEED_ACCOUNTS, SEED_DISPUTES, SEED_LISTINGS, SEED_ORDERS, SEED_PROFILE, SEED_REPORTS,
  SEED_SELLER_ORDERS, SEED_SELLER_REVIEWS,
} from '@/lib/data';
import type { Account, BuyerProfile } from '@/types/user';
import type { Order, SellerOrder, SellerReview } from '@/types/order';
import type { Payment } from '@/types/payment';
import type { Listing } from '@/types/product';
import type { Dispute, Report, ThreadMessage } from '@/types/social';

/**
 * "Database" mock di browser. Ini satu-satunya tempat data yang berubah disimpan
 * selama fase frontend. Hanya lib/services yang menulis ke sini; komponen membaca
 * lewat hook selector (useDb(s => s.orders)) dan menulis lewat service.
 *
 * TODO(Supabase): setiap koleksi di bawah = satu tabel (lihat design/diagrams/erd.png).
 */
export interface DbState {
  accounts: Account[];
  orders: Order[];
  payments: Payment[];
  listings: Listing[];
  sellerOrders: SellerOrder[];
  sellerReviews: SellerReview[];
  reports: Report[];
  disputes: Dispute[];
  /** id produk yang diturunkan admin dari katalog. */
  hidden: string[];
  threads: Record<string, ThreadMessage[]>;
  profile: BuyerProfile;
  /** Hasil halaman "berhasil" terakhir (checkout COD / pembayaran berhasil). */
  lastSuccess: { title: string; text: string; orderIds: string[] };
  /** Patch generik — dipakai service. */
  patch: (fn: (s: DbState) => Partial<DbState>) => void;
  reset: () => void;
}

const seed = () => ({
  accounts: SEED_ACCOUNTS,
  orders: SEED_ORDERS,
  payments: [] as Payment[],
  listings: SEED_LISTINGS,
  sellerOrders: SEED_SELLER_ORDERS,
  sellerReviews: SEED_SELLER_REVIEWS,
  reports: SEED_REPORTS,
  disputes: SEED_DISPUTES,
  hidden: [] as string[],
  threads: { laras: [{ from: 'them', text: 'Halo! Ada yang bisa dibantu soal produknya?', time: 'Kemarin' }] } as Record<string, ThreadMessage[]>,
  profile: SEED_PROFILE as BuyerProfile,
  lastSuccess: { title: 'Pesanan dibuat', text: '', orderIds: [] as string[] },
});

export const useDb = create<DbState>()(
  persist(
    (set) => ({
      ...seed(),
      patch: (fn) => set((s) => fn(s)),
      reset: () => set(seed()),
    }),
    { name: 'rupa-db', storage: safeStorage, skipHydration: true, version: 1 },
  ),
);

export const db = () => useDb.getState();
export const dbPatch = (fn: (s: DbState) => Partial<DbState>) => useDb.getState().patch(fn);
