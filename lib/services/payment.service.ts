'use client';
/**
 * PaymentService — SIMULASI. Nomor VA dan QR adalah contoh, tidak bisa dibayar.
 * TODO(payment gateway): createCharge → lib/clients/payment-gateway.ts (createVA/createQris/createEwallet);
 * status "paid" datang dari webhook (handleWebhook + verifySignature) di app/api/payments.
 */
import { PAY_GUIDES, VA_PREFIX } from '@/lib/data';
import { useDb, db, dbPatch } from '@/lib/store/db';
import { rp } from '@/lib/format';
import { delay } from './util';
import { orderTotal } from './order.service';
import type { Payment } from '@/types/payment';
import type { PayMethod } from '@/types/order';

export const payLabelOf = (p: Pick<Payment, 'method' | 'bank' | 'wallet'>) =>
  p.method === 'va' ? 'Virtual account ' + p.bank : p.method === 'qris' ? 'QRIS' : 'E-wallet ' + p.wallet;

export const paymentGuides = PAY_GUIDES;
export const GUIDE_TABS: ['mbank' | 'atm' | 'ib', string][] = [['mbank', 'M-banking'], ['atm', 'ATM'], ['ib', 'Internet banking']];

/** Pola QR contoh 25×25 (tidak dapat dipindai). */
export const QR_CELLS: boolean[] = (() => {
  const N = 25;
  const out: boolean[] = [];
  let seed = 7;
  const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  const fixed = (x: number, y: number) => {
    const fs = [[0, 0], [18, 0], [0, 18]];
    for (let i = 0; i < 3; i++) {
      const [cx, cy] = fs[i];
      if (x >= cx && x < cx + 7 && y >= cy && y < cy + 7) return x === cx || x === cx + 6 || y === cy || y === cy + 6 || (x >= cx + 2 && x <= cx + 4 && y >= cy + 2 && y <= cy + 4) ? 1 : 0;
      if (x >= cx - 1 && x <= cx + 7 && y >= cy - 1 && y <= cy + 7) return 0;
    }
    if (y === 6 && x > 7 && x < 17) return x % 2 === 0 ? 1 : 0;
    if (x === 6 && y > 7 && y < 17) return y % 2 === 0 ? 1 : 0;
    return -1;
  };
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const f = fixed(x, y); out.push(f >= 0 ? f === 1 : rnd() > 0.5); }
  return out;
})();

function makePayment(orderIds: string[], amount: number, method: Exclude<PayMethod, 'cod'>, bank?: string, wallet?: string): Payment {
  const now = Date.now();
  const b = bank || 'BCA';
  let va = VA_PREFIX[b] || '8800';
  while (va.length < 16) va += String(Math.floor(Math.random() * 10));
  return { id: 'PAY-' + String(now).slice(-6), orderIds, amount, method, bank: b, wallet: wallet || 'GoPay', va, createdAt: now, deadline: now + (method === 'va' ? 24 * 3600 * 1000 : 30 * 60 * 1000), status: 'pending' };
}

export const paymentService = {
  /** Satu tagihan untuk semua paket. */
  async createCharge(orderIds: string[], amount: number, method: Exclude<PayMethod, 'cod'>, bank?: string, wallet?: string): Promise<Payment> {
    const p = makePayment(orderIds, amount, method, bank, wallet);
    dbPatch((s) => ({ payments: [p, ...s.payments] }));
    return p;
  },

  /** Tagihan aktif untuk pesanan "menunggu"; dibuat (VA BCA) bila belum ada. */
  async openFor(orderId: string): Promise<string | null> {
    const existing = db().payments.find((x) => x.status === 'pending' && x.deadline > Date.now() && x.orderIds.indexOf(orderId) >= 0);
    if (existing) return existing.id;
    const o = db().orders.find((x) => x.id === orderId);
    if (!o || o.status !== 'menunggu') return null;
    const p = await paymentService.createCharge([orderId], orderTotal(o), 'va', 'BCA');
    return p.id;
  },

  /** Kontrol simulasi: pembayaran berhasil → pesanan "Dikemas penjual". */
  async simulatePaid(id: string): Promise<void> {
    const p = db().payments.find((x) => x.id === id);
    if (!p) return;
    dbPatch((s) => ({
      payments: s.payments.map((x) => (x.id === id ? { ...x, status: 'paid' } : x)),
      orders: s.orders.map((o) => (p.orderIds.indexOf(o.id) >= 0 && o.status === 'menunggu' ? { ...o, status: 'dikemas', note: 'Dibayar lewat ' + payLabelOf(p) + '.' } : o)),
      lastSuccess: {
        title: 'Pembayaran berhasil',
        text: 'Kami sudah menerima ' + rp(p.amount) + ' lewat ' + payLabelOf(p) + '. Penjual mulai mengemas pesananmu dan kamu akan mendapat notifikasi saat paket dikirim.',
        orderIds: p.orderIds,
      },
    }));
  },

  /** Kedaluwarsa → pesanan dibatalkan otomatis. */
  async expire(id: string): Promise<void> {
    const p = db().payments.find((x) => x.id === id);
    if (!p || p.status !== 'pending') return;
    dbPatch((s) => ({
      payments: s.payments.map((x) => (x.id === id ? { ...x, status: 'expired' } : x)),
      orders: s.orders.map((o) => (p.orderIds.indexOf(o.id) >= 0 && o.status === 'menunggu' ? { ...o, status: 'dibatalkan', note: 'Dibatalkan otomatis karena batas waktu pembayaran habis. Stok dikembalikan ke penjual.' } : o)),
    }));
  },

  /** "Saya sudah bayar, cek status". */
  async check(id: string): Promise<{ paid: boolean; msg: string }> {
    await delay(1200);
    const p = db().payments.find((x) => x.id === id);
    if (p?.status === 'paid') return { paid: true, msg: '' };
    return { paid: false, msg: 'Pembayaran belum kami terima. Kalau sudah membayar, tunggu 1–2 menit lalu cek lagi.' };
  },

  /** Kedaluwarsakan semua tagihan yang lewat batas waktu. */
  async expireOverdue(): Promise<void> {
    const now = Date.now();
    for (const p of db().payments) if (p.status === 'pending' && now >= p.deadline) await paymentService.expire(p.id);
  },
};

export function usePayment(id: string | null | undefined) {
  return useDb((s) => (id ? s.payments.find((p) => p.id === id) : undefined));
}
