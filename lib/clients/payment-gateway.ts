/**
 * STUB — belum dipakai. Penyedia pembayaran (mis. Midtrans/Xendit) dipanggil dari server.
 * Fase ini: semua pembayaran disimulasikan di lib/services/payment.service.ts.
 */
export interface VirtualAccount { bank: string; number: string; expiresAt: number }
export interface QrisCharge { qrString: string; expiresAt: number }
export interface EwalletCharge { app: string; deeplink: string; expiresAt: number }

const notReady = () => new Error('Payment gateway belum disambungkan. Isi PAYMENT_SERVER_KEY dan implementasikan di route handler.');

export const paymentGateway = {
  async createVA(_bank: string, _amount: number): Promise<VirtualAccount> { throw notReady(); },
  async createQris(_amount: number): Promise<QrisCharge> { throw notReady(); },
  async createEwallet(_app: string, _amount: number): Promise<EwalletCharge> { throw notReady(); },
  /** Verifikasi tanda tangan webhook (HMAC) sebelum mempercayai status "paid". */
  verifySignature(_body: string, _signature: string): boolean { throw notReady(); },
};
