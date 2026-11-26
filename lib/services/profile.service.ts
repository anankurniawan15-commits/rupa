'use client';
/**
 * ProfileService — profil pembeli, alamat, notifikasi, privasi, serta chat penjual/pembeli.
 * TODO(Supabase): tabel profiles, addresses, messages (Realtime untuk chat).
 */
import { useDb, dbPatch } from '@/lib/store/db';
import { delay } from './util';
import type { BuyerProfile } from '@/types/user';
import type { ThreadMessage } from '@/types/social';

export const PROFILE_TABS: [string, string][] = [['profil', 'Profil'], ['alamat', 'Alamat'], ['notif', 'Notifikasi'], ['saved', 'Hasil AI Sortir'], ['privasi', 'Privasi dan data']];
export const NOTIF_OPTIONS: [keyof BuyerProfile['notif'], string, string][] = [
  ['order', 'Status pesanan', 'Pembayaran, pengiriman, dan konfirmasi.'],
  ['chat', 'Pesan dari penjual atau pembeli', 'Supaya tidak ada pertanyaan yang terlewat.'],
  ['sortir', 'Kreator yang mencari material', 'Saat ada kreator yang membutuhkan material yang pernah kamu analisis.'],
  ['promo', 'Info dan promo Rupa', 'Maksimal dua kali sebulan.'],
];
export const PRIVACY_OPTIONS: [keyof BuyerProfile['privacy'], string, string][] = [
  ['delPhoto', 'Hapus foto AI Sortir setelah analisis', 'Hasil tetap bisa disimpan, tanpa foto.'],
  ['personal', 'Rekomendasi berdasarkan minat', 'Memakai riwayat lihat dan wishlist untuk menyusun rekomendasi.'],
];

const patchProfile = (fn: (p: BuyerProfile) => Partial<BuyerProfile>) => dbPatch((s) => ({ profile: { ...s.profile, ...fn(s.profile) } }));

export const profileService = {
  async save(p: Pick<BuyerProfile, 'name' | 'email' | 'phone' | 'city' | 'bio'>): Promise<void> {
    patchProfile(() => p);
  },
  async addAddress(label: string, text: string): Promise<void> {
    patchProfile((p) => ({ addresses: [...p.addresses, { id: 'a' + Date.now(), label: label.trim(), text: text.trim(), main: false }] }));
  },
  async setMainAddress(id: string): Promise<void> {
    patchProfile((p) => ({ addresses: p.addresses.map((a) => ({ ...a, main: a.id === id })) }));
  },
  async removeAddress(id: string): Promise<void> {
    patchProfile((p) => ({ addresses: p.addresses.filter((a) => a.id !== id) }));
  },
  async setNotif(k: keyof BuyerProfile['notif'], v: boolean): Promise<void> {
    patchProfile((p) => ({ notif: { ...p.notif, [k]: v } }));
  },
  async setPrivacy(k: keyof BuyerProfile['privacy'], v: boolean): Promise<void> {
    patchProfile((p) => ({ privacy: { ...p.privacy, [k]: v } }));
  },
};

export function useProfile() {
  return useDb((s) => s.profile);
}

/* ---------- chat penjual / pembeli (prototipe: balasan otomatis) ---------- */
const DEFAULT_THREAD: ThreadMessage[] = [{ from: 'them', text: 'Halo, terima kasih sudah mampir. Silakan tanya soal ukuran, bahan, atau pengiriman.', time: 'Penjual biasanya membalas dalam beberapa jam' }];

export const messageService = {
  async send(key: string, text: string): Promise<void> {
    const t = text.trim();
    if (!t) return;
    dbPatch((s) => ({ threads: { ...s.threads, [key]: [...(s.threads[key] || []), { from: 'me', text: t, time: 'Baru saja' }] } }));
    await delay(1300);
    dbPatch((s) => ({ threads: { ...s.threads, [key]: [...(s.threads[key] || []), { from: 'them', text: 'Terima kasih, pesanmu sudah kami terima. Kami balas secepatnya ya. (balasan otomatis prototipe)', time: 'Baru saja' }] } }));
  },
};

export function useThread(key: string): ThreadMessage[] {
  const t = useDb((s) => s.threads[key]);
  return t || DEFAULT_THREAD;
}
