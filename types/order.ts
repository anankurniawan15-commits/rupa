export interface CartItem {
  id: string;
  qty: number;
}

export type OrderStatus = 'menunggu' | 'dikemas' | 'dikirim' | 'selesai' | 'dibatalkan';

export interface Order {
  id: string;
  date: string;
  seller: string;
  /** id akun pembeli; data contoh tanpa buyer milik akun "dinda". */
  buyer?: string;
  items: CartItem[];
  ship: number;
  status: OrderStatus;
  note?: string;
  resi?: string;
  reviewed?: boolean;
}

export type SellerOrderStatus = 'baru' | 'dikemas' | 'dikirim' | 'selesai';

export interface SellerOrder {
  id: string;
  buyer: string;
  items: string;
  total: number;
  status: SellerOrderStatus;
  date: string;
  resi?: string;
  owner?: string;
}

export interface SellerReview {
  n: string;
  s: number;
  t: string;
  p: string;
  reply: string;
  owner?: string;
}

export interface ShipOption {
  id: 'reg' | 'exp';
  label: string;
  cost: number;
  eta: string;
}

export type PayMethod = 'va' | 'ewallet' | 'qris' | 'cod';

export interface CheckoutForm {
  name: string;
  phone: string;
  addr: string;
  city: string;
  zip: string;
  ship: Record<string, 'reg' | 'exp'>;
  pay: PayMethod | '';
  bank: string;
  wallet: string;
  agree: boolean;
}
