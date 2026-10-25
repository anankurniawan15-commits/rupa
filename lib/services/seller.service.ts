'use client';
/**
 * Data Dashboard Penjual per pemilik toko (listing, pesanan masuk, ulasan, pendapatan).
 * Data contoh tanpa `owner` milik akun "dinda"; toko baru mulai kosong.
 * TODO(Supabase): view seller_dashboard per seller_id.
 */
import { useMemo } from 'react';
import { LISTING_STATUS_LABEL, SHOP_STATUS, WEEKS } from '@/lib/data';
import { useDb } from '@/lib/store/db';

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
