'use client';
/**
 * OrderService — pesanan pembeli & pesanan masuk penjual.
 * TODO(Supabase): tabel orders, order_items, seller_orders.
 */
import { useMemo } from 'react';
import { ORDER_STATUS_LABEL, SELLER_ORDER_STATUS_LABEL, TODAY } from '@/lib/data';
import { useDb, db, dbPatch } from '@/lib/store/db';
import { useSession } from '@/lib/store/session';
import { getProduct } from './product.service';
import type { Order, OrderStatus } from '@/types/order';

export const orderTotal = (o: Order) => o.items.reduce((a, it) => a + (getProduct(it.id)?.price || 0) * it.qty, 0) + o.ship;
export const orderSubtotal = (o: Order) => o.items.reduce((a, it) => a + (getProduct(it.id)?.price || 0) * it.qty, 0);

export const ORDER_TABS: ['all' | 'run' | 'done' | 'cancel', string][] = [['all', 'Semua'], ['run', 'Berjalan'], ['done', 'Selesai'], ['cancel', 'Dibatalkan']];
export const inOrderTab = (o: Order, tab: string) =>
  tab === 'all' || (tab === 'run' && ['menunggu', 'dikemas', 'dikirim'].indexOf(o.status) >= 0) || (tab === 'done' && o.status === 'selesai') || (tab === 'cancel' && o.status === 'dibatalkan');

/** Indeks linimasa 5 tahap (Dibuat, Dibayar, Dikemas, Dikirim, Diterima). */
export const TIMELINE = ['Dibuat', 'Dibayar', 'Dikemas', 'Dikirim', 'Diterima'];
export const timelineIndex = (s: OrderStatus): number | undefined => ({ menunggu: 0, dikemas: 2, dikirim: 3, selesai: 4 } as Record<string, number>)[s];

export const orderStatusLabel = (s: OrderStatus) => ORDER_STATUS_LABEL[s];
export const sellerOrderStatusLabel = (s: keyof typeof SELLER_ORDER_STATUS_LABEL) => SELLER_ORDER_STATUS_LABEL[s];

const setOrder = (id: string, patch: Partial<Order>) =>
  dbPatch((s) => ({ orders: s.orders.map((o) => (o.id === id ? { ...o, ...patch } : o)) }));

export const orderService = {
  async cancel(orderId: string): Promise<void> {
    setOrder(orderId, { status: 'dibatalkan', note: 'Dibatalkan olehmu sebelum paket dikirim. Dana dikembalikan (simulasi).' });
  },
  /** Pembeli mengonfirmasi pesanan diterima. */
  async confirm(orderId: string): Promise<void> {
    setOrder(orderId, { status: 'selesai' });
  },
  async review(orderId: string, _stars: number, _text: string): Promise<void> {
    setOrder(orderId, { reviewed: true });
  },
  /* ---- sisi penjual ---- */
  async pack(sellerOrderId: string): Promise<void> {
    dbPatch((s) => ({ sellerOrders: s.sellerOrders.map((o) => (o.id === sellerOrderId ? { ...o, status: 'dikemas' } : o)) }));
  },
  async ship(sellerOrderId: string, resi: string): Promise<void> {
    dbPatch((s) => ({ sellerOrders: s.sellerOrders.map((o) => (o.id === sellerOrderId ? { ...o, status: 'dikirim', resi: resi.trim().toUpperCase() } : o)) }));
  },
  async replyReview(index: number, reply: string): Promise<void> {
    dbPatch((s) => ({ sellerReviews: s.sellerReviews.map((r, i) => (i === index ? { ...r, reply: reply.trim() } : r)) }));
  },
  getOrder(id: string) {
    return db().orders.find((o) => o.id === id);
  },
  todayLabel: TODAY,
};

/** Pesanan milik pengguna yang masuk. */
export function useMyOrders(): Order[] {
  const uid = useSession((s) => s.userId);
  const orders = useDb((s) => s.orders);
  return useMemo(() => orders.filter((o) => (o.buyer || 'dinda') === uid), [orders, uid]);
}

export function useOrdersByIds(ids: string[]) {
  const orders = useDb((s) => s.orders);
  return useMemo(() => ids.map((id) => orders.find((o) => o.id === id)).filter(Boolean) as Order[], [orders, ids]);
}

export function useLastSuccess() {
  return useDb((s) => s.lastSuccess);
}
