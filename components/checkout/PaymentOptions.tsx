'use client';
import { Chip } from '@/components/ui/Chip';
import { ErrorText, RadioCard } from '@/components/ui/Field';
import { BANKS, PAY_OPTIONS, WALLETS } from '@/lib/services/checkout.service';
import type { CheckoutForm, PayMethod } from '@/types/order';

/** Langkah 2: metode pembayaran + pilihan bank VA / e-wallet. */
export function PaymentOptions({ form, multi, error, onChange }: { form: CheckoutForm; multi: boolean; error?: string; onChange: (patch: Partial<CheckoutForm>) => void }) {
  return (
    <section className="panel col gap-16" aria-labelledby="co-pay">
      <h2 id="co-pay" className="h3">Metode pembayaran</h2>
      <fieldset>
        <legend className="sr">Pilih metode pembayaran</legend>
        <div className="radio-cards">
          {PAY_OPTIONS(multi).map((o) => (
            <RadioCard
              key={o.id}
              name="co-pay"
              title={o.label}
              desc={o.desc}
              checked={form.pay === o.id && !o.disabled}
              disabled={o.disabled}
              onSelect={() => { if (!o.disabled) onChange({ pay: o.id as PayMethod }); }}
            />
          ))}
        </div>
      </fieldset>
      {form.pay === 'va' ? (
        <fieldset className="col gap-8">
          <legend className="lbl">Pilih bank virtual account</legend>
          <div className="chips">
            {BANKS.map((b) => <Chip key={b} on={form.bank === b} onClick={() => onChange({ bank: b })}>{b}</Chip>)}
          </div>
        </fieldset>
      ) : null}
      {form.pay === 'ewallet' ? (
        <fieldset className="col gap-8">
          <legend className="lbl">Pilih e-wallet</legend>
          <div className="chips">
            {WALLETS.map((w) => <Chip key={w} on={form.wallet === w} onClick={() => onChange({ wallet: w })}>{w}</Chip>)}
          </div>
        </fieldset>
      ) : null}
      <ErrorText>{error}</ErrorText>
      <p className="fine">Nomor virtual account, kode QR, atau tautan e-wallet muncul di halaman Pembayaran setelah pesanan dibuat. Batas waktu pembayaran 24 jam.</p>
    </section>
  );
}

/** Label metode untuk ringkasan langkah 3, mis. "Transfer virtual account · BCA". */
export function payChoiceLabel(form: CheckoutForm, multi: boolean) {
  const o = PAY_OPTIONS(multi).find((x) => x.id === form.pay);
  return (o ? o.label : '—') + (form.pay === 'va' && form.bank ? ' · ' + form.bank : form.pay === 'ewallet' && form.wallet ? ' · ' + form.wallet : '');
}
