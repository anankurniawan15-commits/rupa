'use client';
/**
 * AuthService — MOCK. Akun demo dibaca dari accounts-demo.json.
 *
 * Kata sandi tidak pernah masuk store/localStorage. Kata sandi akun baru / yang direset
 * hanya disimpan di memori modul ini (hilang saat halaman dimuat ulang).
 *
 * Titik pengganti Supabase Auth:
 *  - register()       → supabase.auth.signUp({ email, password, options: { data: { name, phone } } })
 *  - verifySignupOtp()→ supabase.auth.verifyOtp({ email, token, type: 'signup' })
 *  - login()          → supabase.auth.signInWithPassword({ email, password })
 *  - requestReset()   → supabase.auth.resetPasswordForEmail(email)
 *  - verifyResetOtp() → supabase.auth.verifyOtp({ email, token, type: 'recovery' })
 *  - resetPassword()  → supabase.auth.updateUser({ password })
 *  - logout()         → supabase.auth.signOut()
 */
import { __DEMO_PASSWORDS, AUTH_NOTE, LOGIN_MAX_ATTEMPTS, OTP_DEMO } from '@/lib/data';
import { useDb, db, dbPatch } from '@/lib/store/db';
import { useSession } from '@/lib/store/session';
import { useSortir } from '@/lib/store/sortir';
import { maskEmail } from '@/lib/format';
import { delay } from './util';
import type { Account } from '@/types/user';

/** Kata sandi di memori saja (akun baru & hasil reset). */
const memPasswords = new Map<string, string>();
const passwordOf = (id: string) => memPasswords.get(id) ?? __DEMO_PASSWORDS[id];

const findByEmail = (email: string) => db().accounts.find((a) => a.email.toLowerCase() === email.trim().toLowerCase());

export const LOCKED_MSG = 'Terlalu banyak percobaan gagal. Coba lagi dalam 15 menit, atau atur ulang kata sandi.';
export const OTP_TOO_MANY = 'Terlalu banyak percobaan. Kirim ulang kode untuk mencoba lagi.';
export const MAX_ATTEMPTS = LOGIN_MAX_ATTEMPTS;
export { maskEmail };

export type LoginResult = { ok: true; account: Account } | { ok: false; error: string; attempts: number; locked?: boolean };

/** Sinkronkan profil pembeli dengan akun yang masuk. */
function syncProfile(acc: Account) {
  dbPatch((s) => ({ profile: { ...s.profile, name: acc.name, email: acc.email, phone: acc.phone || '' } }));
}

export const authService = {
  /** attempts = jumlah gagal sebelumnya di formulir ini. */
  async login(email: string, pass: string, attempts: number): Promise<LoginResult> {
    if (attempts >= MAX_ATTEMPTS) return { ok: false, error: LOCKED_MSG, attempts, locked: true };
    await delay(900);
    const acc = findByEmail(email);
    if (!acc || passwordOf(acc.id) !== pass) {
      const n = attempts + 1;
      return { ok: false, attempts: n, locked: n >= MAX_ATTEMPTS, error: n >= MAX_ATTEMPTS ? LOCKED_MSG : 'Email atau kata sandi salah. Sisa percobaan: ' + (MAX_ATTEMPTS - n) + '.' };
    }
    if (acc.status === 'diblokir') {
      return { ok: false, attempts, error: 'Akun ini dinonaktifkan karena melanggar aturan marketplace. Hubungi tim bantuan Rupa.' };
    }
    useSession.getState().setUser(acc.id, acc.role);
    syncProfile(acc);
    return { ok: true, account: acc };
  },

  logout() {
    useSession.getState().setUser(null);
  },

  isEmailTaken(email: string) {
    return !!findByEmail(email);
  },

  /** Kirim OTP pendaftaran (simulasi). Validasi formulir dilakukan dengan registerSchema. */
  async register(dto: { name: string; email: string; phone: string; pass: string }): Promise<{ ok: true } | { ok: false; field: 'email'; error: string }> {
    if (findByEmail(dto.email)) return { ok: false, field: 'email', error: 'Email ini sudah terdaftar. Masuk, atau atur ulang kata sandi jika lupa.' };
    await delay(900);
    return { ok: true };
  },

  /** Cek OTP. tries = jumlah salah sebelumnya. */
  checkOtp(code: string, tries: number, emailMustExist?: string): { ok: true } | { ok: false; error: string; tries: number } {
    const c = String(code).replace(/\D/g, '');
    if (tries >= 5) return { ok: false, error: OTP_TOO_MANY, tries };
    if (c.length !== 6) return { ok: false, error: 'Kode terdiri dari 6 angka.', tries };
    const exists = emailMustExist === undefined || !!findByEmail(emailMustExist);
    if (c !== OTP_DEMO || !exists) {
      const n = tries + 1;
      return { ok: false, tries: n, error: n >= 5 ? OTP_TOO_MANY : 'Kode salah atau sudah kedaluwarsa. Sisa percobaan: ' + (5 - n) + '.' };
    }
    return { ok: true };
  },

  /** Setelah OTP benar: buat akun dan langsung masuk. */
  async verifySignupOtp(dto: { name: string; email: string; phone: string; pass: string }): Promise<Account> {
    await delay(800);
    const acc: Account = { id: 'u' + Date.now(), name: dto.name.trim(), email: dto.email.trim().toLowerCase(), phone: dto.phone.trim(), role: 'user', status: 'aktif', joined: 'Oktober 2026', shop: null };
    memPasswords.set(acc.id, dto.pass);
    dbPatch((s) => ({ accounts: [...s.accounts, acc] }));
    useSession.getState().setUser(acc.id, acc.role);
    syncProfile(acc);
    return acc;
  },

  /** Selalu berhasil — pesan netral, tidak membocorkan apakah email terdaftar. */
  async requestReset(_email: string): Promise<void> {
    await delay(900);
  },

  isSamePassword(email: string, pass: string) {
    const acc = findByEmail(email);
    return !!acc && passwordOf(acc.id) === pass;
  },

  /** Simpan kata sandi baru; semua sesi akun itu dikeluarkan. */
  async resetPassword(email: string, pass: string): Promise<void> {
    await delay(900);
    const acc = findByEmail(email);
    if (acc) {
      memPasswords.set(acc.id, pass);
      if (useSession.getState().userId === acc.id) useSession.getState().setUser(null);
    }
  },

  /** Catatan alasan dialihkan ke halaman Masuk, berdasarkan rute tujuan. */
  loginNote(next: string | null): string {
    if (!next) return '';
    const map: [RegExp, string][] = [
      [/^\/checkout/, 'checkout'], [/^\/pesanan/, 'orders'], [/^\/profil/, 'profile'], [/^\/wishlist/, 'wishlist'],
      [/^\/jual/, 'sell'], [/^\/dashboard/, 'dash'], [/^\/buka-toko/, 'openShop'], [/^\/pembayaran/, 'payment'], [/^\/admin/, 'admin'],
    ];
    const hit = map.find(([re]) => re.test(next));
    return hit ? AUTH_NOTE[hit[1]] : 'Masuk dulu untuk melanjutkan.';
  },
};

/** Akun yang sedang masuk (reaktif), atau null untuk tamu. */
export function useCurrentUser(): Account | null {
  const uid = useSession((s) => s.userId);
  const accounts = useDb((s) => s.accounts);
  return uid ? accounts.find((a) => a.id === uid) || null : null;
}

export const currentUser = (): Account | null => {
  const uid = useSession.getState().userId;
  return uid ? db().accounts.find((a) => a.id === uid) || null : null;
};

/** Hapus jejak lokal lain saat keluar (tidak menghapus data contoh). */
export function clearLocalOnLogout() {
  useSortir.getState().resetFlow();
}
