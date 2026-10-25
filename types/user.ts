export type Role = 'user' | 'admin';
export type AccountStatus = 'aktif' | 'diblokir';
export type ShopStatus = 'pending' | 'verified' | 'rejected';

export interface SellerProfile {
  name: string;
  city: string;
  desc: string;
  bank: string;
  acct: string;
  holder: string;
  status: ShopStatus;
  note: string;
}

/**
 * Akun publik. Kata sandi TIDAK pernah ada di tipe ini, di store, atau di localStorage.
 * Kata sandi demo hanya dibaca oleh lib/services/auth.service.ts (mock).
 */
export interface Account {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  status: AccountStatus;
  joined: string;
  shop: SellerProfile | null;
}

export interface Session {
  userId: string;
}

export interface Address {
  id: string;
  label: string;
  text: string;
  main: boolean;
}

export interface SavedAnalysis {
  id: string;
  title: string;
  date: string;
  scen: string;
}

export interface BuyerProfile {
  name: string;
  email: string;
  phone: string;
  city: string;
  bio: string;
  notif: { order: boolean; chat: boolean; sortir: boolean; promo: boolean };
  privacy: { delPhoto: boolean; personal: boolean };
  addresses: Address[];
  saved: SavedAnalysis[];
}
