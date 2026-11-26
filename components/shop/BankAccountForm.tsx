'use client';
import { holderMismatch, SHOP_BANKS, type ShopForm } from '@/lib/services/shop.service';
import { ErrorText, Input, Select } from '@/components/ui/Field';
import { Notice } from '@/components/ui/Boxes';

type BankField = 'bank' | 'acct' | 'holder';

/** Langkah 2 Buka Toko: rekening pencairan dana. */
export function BankAccountForm({ form, errors, onField, accountName }: { form: ShopForm; errors: Record<string, string>; onField: (f: BankField, v: string) => void; accountName: string }) {
  const warn = holderMismatch(form.holder, accountName);
  return (
    <div className="col gap-16">
      <h2 className="h2">Rekening pencairan dana</h2>
      <p className="muted">Hasil penjualan diteruskan ke rekening ini setelah pembeli mengonfirmasi pesanan diterima.</p>
      <div className="form-grid">
        <div className="field">
          <label className="lbl" htmlFor="sh-bank">Bank</label>
          <Select id="sh-bank" invalid={!!errors.bank} value={form.bank} onChange={(e) => onField('bank', e.target.value)} options={SHOP_BANKS} placeholder="Pilih bank" />
          <ErrorText id="sh-bank-err">{errors.bank}</ErrorText>
        </div>
        <div className="field">
          <label className="lbl" htmlFor="sh-acct">Nomor rekening</label>
          <Input id="sh-acct" inputMode="numeric" invalid={!!errors.acct} value={form.acct} onChange={(e) => onField('acct', e.target.value)} placeholder="8–16 angka" autoComplete="off" />
          <ErrorText id="sh-acct-err">{errors.acct}</ErrorText>
        </div>
        <div className="field span2">
          <label className="lbl" htmlFor="sh-holder">Nama pemilik rekening</label>
          <Input id="sh-holder" invalid={!!errors.holder} value={form.holder} onChange={(e) => onField('holder', e.target.value)} autoComplete="off" />
          <ErrorText id="sh-holder-err">{errors.holder}</ErrorText>
          {warn ? (
            <p className="help" style={{ color: '#6B4600' }}>
              Nama berbeda dengan nama akun. Admin mungkin meminta dokumen pendukung saat verifikasi.
            </p>
          ) : null}
        </div>
      </div>
      <Notice icon="shield">
        <span>Data rekening disimpan terenkripsi dan hanya dipakai untuk pencairan dana. Di prototipe ini data tidak dikirim ke server mana pun.</span>
      </Notice>
    </div>
  );
}
