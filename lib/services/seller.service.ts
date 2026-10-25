'use client';
/**
 * Data Dashboard Penjual per pemilik toko (listing, pesanan masuk, ulasan, pendapatan).
 * Data contoh tanpa `owner` milik akun "dinda"; toko baru mulai kosong.
 * TODO(Supabase): view seller_dashboard per seller_id.
 */
import { useMemo } from 'react';
import { LISTING_STATUS_LABEL, SHOP_STATUS, WEEKS } from '@/lib/data';
import { useDb } from '@/lib/store/db';
import { rp } from '@/lib/format';
import type { Listing } from '@/types/product';
import type { SellerOrder } from '@/types/order';
import type { SellerProfile } from '@/types/user';

export { LISTING_STATUS_LABEL, SHOP_STATUS };

export function useSellerData(uid: string | null) {
  const listings = useDb((s) => s.listings);
  const sellerOrders = useDb((s) => s.sellerOrders);
  const sellerReviews = useDb((s) => s.sellerReviews);
  return useMemo(() => {
    const isDemo = uid === 'dinda';
    return {
      isDemo,
      listings: listings.filter((l) => (l.owner || 'dinda') === uid),
      orders: sellerOrders.filter((o) => (o.owner || 'dinda') === uid),
      /** Ulasan beserta indeks aslinya (untuk orderService.replyReview). */
      reviews: sellerReviews.map((r, index) => ({ ...r, index })).filter((r) => (r.owner || 'dinda') === uid),
      weeks: (isDemo ? WEEKS : WEEKS.map(([w]) => [w, 0])) as [string, number][],
      rating: isDemo ? { value: '4,8', count: 61 } : null,
    };
  }, [uid, listings, sellerOrders, sellerReviews]);
}

/* ---------- ringkasan dashboard (KPI, grafik, perlu perhatian) ---------- */

type SellerData = ReturnType<typeof useSellerData>;

export function sellerKpis(d: SellerData) {
  const last4 = d.weeks.slice(4).reduce((a, w) => a + w[1], 0);
  const prev4 = d.weeks.slice(0, 4).reduce((a, w) => a + w[1], 0);
  const pending = d.orders.filter((o) => o.status === 'baru' || o.status === 'dikemas').length;
  return [
    { l: 'Pendapatan 4 minggu', v: rp(last4), d: prev4 ? (last4 >= prev4 ? 'Naik ' : 'Turun ') + Math.abs(Math.round(((last4 - prev4) / prev4) * 100)) + '% dari 4 minggu sebelumnya' : 'Belum ada penjualan' },
    { l: 'Pesanan perlu diproses', v: String(pending), d: pending ? 'Kemas dalam 2 hari kerja' : 'Tidak ada antrean' },
    { l: 'Listing aktif', v: String(d.listings.filter((l) => l.status === 'aktif').length), d: d.listings.length + ' listing total' },
    { l: 'Rating toko', v: d.rating ? d.rating.value : '—', d: d.rating ? 'dari ' + d.rating.count + ' ulasan' : 'Belum ada ulasan' },
  ];
}

/** Jumlah pesanan yang masih perlu diproses (badge tab Pesanan). */
export const pendingOrderCount = (orders: SellerOrder[]) => orders.filter((o) => o.status === 'baru' || o.status === 'dikemas').length;

export type SellerAlert =
  | { kind: 'pending' | 'rejected'; text: string; cta: string }
  | { kind: 'order'; text: string; cta: string }
  | { kind: 'stock'; text: string; cta: string; listing: Listing }
  | { kind: 'drafts'; text: string; cta: string };

/** Daftar "Perlu perhatian" persis seperti prototipe. */
export function sellerAlerts(shop: SellerProfile | null, d: SellerData): SellerAlert[] {
  const out: SellerAlert[] = [];
  if (shop?.status === 'pending') out.push({ kind: 'pending', text: 'Data toko dan rekening sedang diverifikasi admin (biasanya 1×24 jam). Listing tetap bisa kamu buat.', cta: 'Buat listing' });
  if (shop?.status === 'rejected') out.push({ kind: 'rejected', text: 'Verifikasi toko ditolak: ' + shop.note, cta: 'Hubungi bantuan' });
  d.orders.filter((o) => o.status === 'baru').forEach((o) => out.push({ kind: 'order', text: 'Pesanan baru ' + o.id + ' (' + o.items + ') menunggu dikemas.', cta: 'Proses pesanan' }));
  d.listings.filter((l) => l.status !== 'draf' && l.stock === 0).forEach((l) => out.push({ kind: 'stock', text: l.title + ' stoknya habis.', cta: 'Tambah stok', listing: l }));
  d.listings.filter((l) => l.status === 'aktif' && l.stock === 1).forEach((l) => out.push({ kind: 'stock', text: l.title + ' tinggal 1.', cta: 'Perbarui stok', listing: l }));
  const drafts = d.listings.filter((l) => l.status === 'draf').length;
  if (drafts) out.push({ kind: 'drafts', text: drafts + ' draf belum diterbitkan.', cta: 'Lihat draf' });
  return out;
}

export const LISTING_FILTERS: [string, string][] = [['all', 'Semua'], ['aktif', 'Aktif'], ['dijeda', 'Dijeda'], ['habis', 'Stok habis'], ['draf', 'Draf']];
export const ORDER_FILTERS: [string, string][] = [['all', 'Semua'], ['baru', 'Baru'], ['dikemas', 'Dikemas'], ['dikirim', 'Dikirim'], ['selesai', 'Selesai']];
export const COURIERS: [string, string][] = [['Reguler', 'Kurir reguler'], ['Ekspres', 'Kurir ekspres'], ['Kargo', 'Kargo']];
