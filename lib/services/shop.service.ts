'use client';
/**
 * ShopService — buka toko (3 langkah). Toko baru berstatus "pending" sampai admin memverifikasi.
 * TODO(Supabase): tabel seller_profiles; nomor rekening dienkripsi di server.
 */
import { CITIES, SELLERS, SHOP_BANKS } from '@/lib/data';
import { db, dbPatch } from '@/lib/store/db';
import { bankSchema, fieldErrors, shopInfoSchema } from '@/lib/validation';
import { delay } from './util';
import type { Account, SellerProfile } from '@/types/user';

export { SHOP_BANKS };
export const SHOP_STEPS = ['Info toko', 'Rekening', 'Persetujuan'];
/** Kota asal pengiriman, urut abjad seperti prototipe. */
export const SHOP_CITIES = [...CITIES].sort((a, b) => a.localeCompare(b, 'id'));

export interface ShopForm { name: string; city: string; desc: string; bank: string; acct: string; holder: string; agree: boolean }
export const shopInit = (): ShopForm => ({ name: '', city: '', desc: '', bank: '', acct: '', holder: '', agree: false });

export function isShopNameTaken(name: string) {
  const n = name.trim().toLowerCase();
  return db().accounts.some((a) => a.shop && a.shop.name.toLowerCase() === n) || Object.values(SELLERS).some((s) => s.name.toLowerCase() === n);
}

export function validateShopStep(step: number, f: ShopForm): Record<string, string> {
  if (step === 1) {
    const e = fieldErrors(shopInfoSchema.safeParse(f));
    if (!e.name && isShopNameTaken(f.name)) e.name = 'Nama toko ini sudah dipakai. Coba variasi lain.';
    return e;
  }
  if (step === 2) return fieldErrors(bankSchema.safeParse(f));
  if (step === 3 && !f.agree) return { agree: 'Setujui aturan penjual untuk membuka toko.' };
  return {};
}

/** "BNI •••• 6789" */
export const maskAccount = (bank: string, acct: string) => (bank ? bank + ' •••• ' + acct.replace(/\D/g, '').slice(-4) : '—');

/** Peringatan bila nama pemilik rekening berbeda dari nama akun. */
export const holderMismatch = (holder: string, accountName: string) => holder.trim().length >= 3 && holder.trim().toLowerCase() !== accountName.toLowerCase();

export const shopService = {
  validateBank: (f: Pick<ShopForm, 'bank' | 'acct' | 'holder'>) => bankSchema.safeParse(f).success,
  async openShop(userId: string, f: ShopForm): Promise<SellerProfile> {
    await delay(1100);
    const shop: SellerProfile = { name: f.name.trim(), city: f.city, desc: f.desc.trim(), bank: f.bank, acct: f.acct.replace(/[\s-]/g, ''), holder: f.holder.trim(), status: 'pending', note: '' };
    dbPatch((s) => ({ accounts: s.accounts.map((a: Account) => (a.id === userId ? { ...a, shop, joined: a.joined || 'Oktober 2026' } : a)) }));
    return shop;
  },
};
