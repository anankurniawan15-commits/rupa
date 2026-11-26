import type { PayMethod } from './order';

export type PaymentStatus = 'pending' | 'paid' | 'expired';
export type GuideKey = 'mbank' | 'atm' | 'ib';

export interface Payment {
  id: string;
  orderIds: string[];
  amount: number;
  method: Exclude<PayMethod, 'cod'>;
  bank: string;
  wallet: string;
  /** Nomor VA contoh (16 digit) — bukan nomor sungguhan. */
  va: string;
  createdAt: number;
  deadline: number;
  status: PaymentStatus;
}
