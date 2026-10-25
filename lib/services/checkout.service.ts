'use client';
/**
 * CheckoutService — ongkir simulasi, validasi, dan pembuatan pesanan.
 * Ongkir: kota sama 9.000, sesama Jawa 15.000, lainnya 32.000; ekspres +12.000.
 * TODO(Supabase): placeOrder → route handler POST /api/orders (lockStock + insert orders) lalu PaymentService.createCharge.
 */
import { BANKS, JAWA, TODAY, WALLETS } from '@/lib/data';
import { dbPatch } from '@/lib/store/db';
import { addressSchema, fieldErrors } from '@/lib/validation';
import { delay } from './util';
import { cartService, type CartGroup } from './cart.service';
import { paymentService } from './payment.service';
import { orderTotal } from './order.service';
import type { CheckoutForm, Order, PayMethod, ShipOption } from '@/types/order';
import type { Payment } from '@/types/payment';

export { BANKS, WALLETS };

export function shipOptions(from: string, to: string): ShipOption[] {
  const same = from === to;
  const java = JAWA.indexOf(from) >= 0 && JAWA.indexOf(to) >= 0;
  const base = same ? 9000 : java ? 15000 : 32000;
  return [
    { id: 'reg', label: 'Reguler', cost: base, eta: same ? '1–2 hari' : java ? '2–4 hari' : '4–7 hari' },
    { id: 'exp', label: 'Ekspres', cost: base + 12000, eta: same ? 'besok' : java ? '1–2 hari' : '2–3 hari' },
  ];
}

export function shipFor(g: CartGroup, form: Pick<CheckoutForm, 'city' | 'ship'>): ShipOption {
  return shipOptions(g.seller.city, form.city).find((o) => o.id === (form.ship[g.sid] || 'reg'))!;
}

export const calcShipping = (groups: CartGroup[], form: Pick<CheckoutForm, 'city' | 'ship'>) => groups.reduce((a, g) => a + shipFor(g, form).cost, 0);

export const PAY_OPTIONS = (multiSeller: boolean): { id: PayMethod; label: string; desc: string; disabled: boolean }[] => [
  { id: 'va', label: 'Transfer virtual account', desc: 'BCA, BNI, BRI, Mandiri, atau Permata', disabled: false },
  { id: 'ewallet', label: 'E-wallet', desc: 'GoPay, OVO, DANA, atau ShopeePay', disabled: false },
  { id: 'qris', label: 'QRIS', desc: 'Pindai kode QR dari aplikasi bank atau e-wallet apa pun', disabled: false },
  { id: 'cod', label: 'Bayar di tempat (COD)', desc: multiSeller ? 'Tidak tersedia untuk pesanan dari lebih dari satu penjual' : 'Bayar tunai ke kurir saat paket tiba', disabled: multiSeller },
];

export const CHECKOUT_STEPS = ['Pengiriman', 'Pembayaran', 'Tinjau dan bayar'];

export function validateStep(step: number, c: CheckoutForm): Record<string, string> {
  if (step === 1) return fieldErrors(addressSchema.safeParse(c));
  const e: Record<string, string> = {};
  if (step === 2 && !c.pay) e.pay = 'Pilih metode pembayaran.';
  else if (step === 2 && c.pay === 'va' && !c.bank) e.pay = 'Pilih bank untuk virtual account.';
  else if (step === 2 && c.pay === 'ewallet' && !c.wallet) e.pay = 'Pilih e-wallet yang kamu pakai.';
  if (step === 3 && !c.agree) e.agree = 'Centang persetujuan terlebih dahulu.';
  return e;
}

export const checkoutInit = (name = 'Dinda Pratiwi', phone = '0812 3456 7890'): CheckoutForm => ({
  name, phone, addr: 'Jl. Cihampelas No. 21, RT 02/RW 05, Kel. Cipaganti, Kec. Coblong', city: 'Bandung', zip: '40131', ship: {}, pay: '', bank: '', wallet: '', agree: false,
});

export const checkoutService = {
  calcShipping,
  /**
   * Buat satu pesanan per penjual. Non-COD → satu tagihan untuk semua paket.
   * COD → pesanan langsung "Dikemas penjual".
   */
  async placeOrder(groups: CartGroup[], c: CheckoutForm, buyerId: string): Promise<{ orders: Order[]; payment: Payment | null }> {
    await delay(1300);
    const base = 'UPL-2610-0' + (500 + Math.floor(Math.random() * 400));
    const cod = c.pay === 'cod';
    const made: Order[] = groups.map((g, i) => ({
      id: base + '-' + String.fromCharCode(65 + i), date: TODAY, seller: g.sid, buyer: buyerId,
      items: g.items.map((it) => ({ id: it.p.id, qty: it.qty })), ship: shipFor(g, c).cost,
      status: cod ? 'dikemas' : 'menunggu', note: cod ? 'Bayar di tempat (COD): siapkan uang tunai saat kurir tiba.' : '',
    }));
    const ids = made.map((o) => o.id);
    dbPatch((s) => ({ orders: [...made, ...s.orders] }));
    await cartService.clear();
    if (cod) {
      dbPatch(() => ({ lastSuccess: { title: 'Pesanan dibuat', text: 'Bayar tunai ke kurir saat paket tiba. Penjual sudah diberi tahu dan mulai mengemas pesananmu.', orderIds: ids } }));
      return { orders: made, payment: null };
    }
    const payment = await paymentService.createCharge(ids, made.reduce((a, o) => a + orderTotal(o), 0), c.pay as Exclude<PayMethod, 'cod'>, c.bank, c.wallet);
    return { orders: made, payment };
  },
};
