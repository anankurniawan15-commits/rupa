'use client';
/**
 * ModerationService — panel admin: verifikasi toko, laporan listing, sengketa, status akun.
 * Laporan (dari detail produk) dan pengajuan bantuan (dari Pesanan Saya) langsung masuk ke sini.
 * TODO(Supabase): tabel reports, disputes; aksi lewat route handler /api/admin dengan cek role.
 */
import { DISPUTE_DECISIONS, DISPUTE_REASONS, REPORT_REASONS, SHOP_STATUS, TODAY } from '@/lib/data';
import { useDb, db, dbPatch } from '@/lib/store/db';
import type { Account, AccountStatus } from '@/types/user';

export { DISPUTE_DECISIONS, DISPUTE_REASONS, REPORT_REASONS, SHOP_STATUS };

const updAcct = (id: string, fn: (a: Account) => Partial<Account>) =>
  dbPatch((s) => ({ accounts: s.accounts.map((a) => (a.id === id ? { ...a, ...fn(a) } : a)) }));

export const REPORT_STATUS = { open: ['st st-baru', 'Perlu ditinjau'], down: ['st st-habis', 'Listing diturunkan'], dismissed: ['st st-dijeda', 'Diabaikan'] } as const;

export const moderationService = {
  async verifyShop(accountId: string, ok: boolean, reason = ''): Promise<void> {
    updAcct(accountId, (a) => ({ shop: a.shop ? { ...a.shop, status: ok ? 'verified' : 'rejected', note: ok ? '' : reason.trim() } : null }));
  },
  async takedown(reportId: string): Promise<void> {
    const r = db().reports.find((x) => x.id === reportId);
    if (!r) return;
    dbPatch((s) => ({ reports: s.reports.map((y) => (y.id === reportId ? { ...y, status: 'down' } : y)), hidden: s.hidden.indexOf(r.pid) >= 0 ? s.hidden : [...s.hidden, r.pid] }));
  },
  async dismiss(reportId: string): Promise<void> {
    dbPatch((s) => ({ reports: s.reports.map((y) => (y.id === reportId ? { ...y, status: 'dismissed' } : y)) }));
  },
  async reopen(reportId: string): Promise<void> {
    dbPatch((s) => ({ reports: s.reports.map((y) => (y.id === reportId ? { ...y, status: 'open' } : y)) }));
  },
  async resolveDispute(id: string, decision: string): Promise<void> {
    dbPatch((s) => ({ disputes: s.disputes.map((d) => (d.id === id ? { ...d, status: 'closed', decision } : d)) }));
  },
  async setAccountStatus(userId: string, status: AccountStatus): Promise<void> {
    updAcct(userId, () => ({ status }));
  },
  /** Dari halaman produk: "Laporkan listing". */
  async createReport(pid: string, reason: string, reporterName: string): Promise<void> {
    dbPatch((s) => ({ reports: [{ id: 'RPT-0' + (92 + s.reports.length), pid, reason, reporter: reporterName || 'Pengguna', date: TODAY, detail: 'Dilaporkan dari halaman produk.', status: 'open' }, ...s.reports] }));
  },
  /** Dari Pesanan Saya: "Ajukan bantuan". */
  async createDispute(orderId: string, sellerName: string, amount: number, reason: string, buyerName: string): Promise<void> {
    dbPatch((s) => ({ disputes: [{ id: 'DSP-00' + (15 + s.disputes.length), order: orderId, buyer: buyerName || 'Pembeli', seller: sellerName, date: TODAY, reason, detail: 'Diajukan pembeli dari halaman Pesanan Saya.', amount, status: 'open', decision: '' }, ...s.disputes] }));
  },
};

export function useAdminData() {
  const accounts = useDb((s) => s.accounts);
  const reports = useDb((s) => s.reports);
  const disputes = useDb((s) => s.disputes);
  return { accounts, reports, disputes };
}
