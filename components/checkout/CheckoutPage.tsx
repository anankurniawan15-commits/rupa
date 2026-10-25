'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Guard } from '@/components/auth/Guard';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Boxes';
import { ErrorText, Field, Input, Select, Textarea } from '@/components/ui/Field';
import { Stepper } from '@/components/ui/Stepper';
import { useCartCount, useCartGroups, type CartGroup } from '@/lib/services/cart.service';
import { CHECKOUT_CITIES, CHECKOUT_STEPS, calcShipping, checkoutInit, checkoutService, shipFor, validateStep } from '@/lib/services/checkout.service';
import { rp } from '@/lib/format';
import type { Account } from '@/types/user';
import type { CheckoutForm } from '@/types/order';
import { OrderSummary } from './OrderSummary';
import { ShippingOptions, itemsText } from './ShippingOptions';
import { PaymentOptions, payChoiceLabel } from './PaymentOptions';
import { MobilePayBar } from './MobilePayBar';

export function CheckoutPage() {
  return <Guard need="user">{(me) => <CheckoutFlow me={me} />}</Guard>;
}

type TextKey = 'name' | 'phone' | 'addr' | 'city' | 'zip';

function CheckoutFlow({ me }: { me: Account }) {
  const router = useRouter();
  const liveGroups = useCartGroups();
  const liveCount = useCartCount();
  // Saat pesanan dibuat keranjang dikosongkan; bekukan isinya agar ringkasan tidak berkedip sebelum pindah halaman.
  const [frozen, setFrozen] = useState<{ groups: CartGroup[]; count: number } | null>(null);
  const groups = frozen ? frozen.groups : liveGroups;
  const count = frozen ? frozen.count : liveCount;
  const [form, setForm] = useState<CheckoutForm>(() => checkoutInit(me.name, me.phone || checkoutInit().phone));
  const [step, setStep] = useState(1);
  const [maxStep, setMaxStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [placing, setPlacing] = useState(false);
  const placed = useRef(false);

  // Keranjang kosong → kembali ke keranjang (kecuali saat pesanan baru saja dibuat).
  useEffect(() => {
    if (liveGroups.length === 0 && !placed.current) router.replace('/keranjang');
  }, [liveGroups.length, router]);

  const multi = groups.length > 1;
  const subtotal = groups.reduce((a, g) => a + g.subtotal, 0);
  const shipping = calcShipping(groups, form);
  const total = subtotal + shipping;

  const setField = (f: TextKey, v: string) => {
    setForm((c) => ({ ...c, [f]: v }));
    setErrors((e) => ({ ...e, [f]: '' }));
  };
  const patchPay = (patch: Partial<CheckoutForm>) => {
    setForm((c) => ({ ...c, ...patch }));
    setErrors({});
  };

  const place = async () => {
    placed.current = true;
    setFrozen({ groups, count });
    setPlacing(true);
    setErrors({});
    try {
      const { payment } = await checkoutService.placeOrder(groups, form, me.id);
      router.push(payment ? '/pembayaran/' + payment.id : '/checkout/berhasil');
    } catch {
      placed.current = false;
      setFrozen(null);
      setPlacing(false);
    }
  };

  const next = () => {
    if (placing) return;
    const e = validateStep(step, form);
    if (Object.keys(e).length) { setErrors(e); return; }
    if (step < 3) {
      const n = step + 1;
      setStep(n);
      setMaxStep((m) => Math.max(m, n));
      setErrors({});
      window.scrollTo({ top: 0 });
      return;
    }
    void place();
  };
  const back = () => {
    if (step === 1) router.push('/keranjang');
    else { setStep(step - 1); setErrors({}); }
  };

  const primaryLabel = placing ? 'Memproses…' : step === 1 ? 'Lanjut ke pembayaran' : step === 2 ? 'Tinjau pesanan' : form.pay === 'cod' ? 'Buat pesanan' : 'Buat pesanan dan bayar';

  if (groups.length === 0) return null;

  return (
    <div className="page wrap co-pad">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/keranjang">Keranjang</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Checkout</span>
      </nav>
      <h1 className="h1" style={{ marginBottom: 24 }}>Checkout</h1>
      <Stepper steps={CHECKOUT_STEPS} step={step} maxStep={maxStep} onGo={setStep} label="Langkah checkout" />
      <div className="cart">
        <div className="col gap-24">
          <Notice icon="info">Prototipe: tidak ada pembayaran, penahanan dana, atau pengiriman sungguhan yang diproses. Ongkir adalah simulasi.</Notice>

          {step === 1 ? (
            <div className="col gap-24">
              <section className="panel col gap-16" aria-labelledby="co-addr">
                <h2 id="co-addr" className="h3">Alamat pengiriman</h2>
                <div className="form-grid">
                  <Field id="co-name" label="Nama penerima" error={errors.name}>
                    <Input id="co-name" value={form.name} onChange={(e) => setField('name', e.target.value)} autoComplete="name" invalid={!!errors.name} />
                  </Field>
                  <Field id="co-phone" label="Nomor HP" help="Untuk dihubungi kurir." error={errors.phone}>
                    <Input id="co-phone" type="tel" inputMode="tel" value={form.phone} onChange={(e) => setField('phone', e.target.value)} autoComplete="tel" invalid={!!errors.phone} hasHelp />
                  </Field>
                  <Field id="co-addr-t" label="Alamat lengkap" error={errors.addr} className="span2">
                    <Textarea id="co-addr-t" style={{ minHeight: 80 }} value={form.addr} onChange={(e) => setField('addr', e.target.value)} autoComplete="street-address" invalid={!!errors.addr} />
                  </Field>
                  <Field id="co-city" label="Kota/kabupaten">
                    <Select id="co-city" value={form.city} onChange={(e) => setField('city', e.target.value)} options={CHECKOUT_CITIES} />
                  </Field>
                  <Field id="co-zip" label="Kode pos" error={errors.zip}>
                    <Input id="co-zip" inputMode="numeric" value={form.zip} onChange={(e) => setField('zip', e.target.value)} autoComplete="postal-code" invalid={!!errors.zip} />
                  </Field>
                </div>
              </section>
              {groups.map((g, i) => (
                <ShippingOptions
                  key={g.sid}
                  g={g}
                  n={i + 1}
                  city={form.city}
                  value={form.ship[g.sid] || 'reg'}
                  onPick={(v) => setForm((c) => ({ ...c, ship: { ...c.ship, [g.sid]: v } }))}
                />
              ))}
            </div>
          ) : null}

          {step === 2 ? <PaymentOptions form={form} multi={multi} error={errors.pay} onChange={patchPay} /> : null}

          {step === 3 ? (
            <div className="col gap-16">
              <section className="panel col gap-8">
                <div className="row between center"><h2 className="h3">Dikirim ke</h2><Button variant="ghost" size="sm" onClick={() => setStep(1)}>Ubah</Button></div>
                <p><b>{form.name}</b> · {form.phone}</p>
                <p className="muted">{form.addr + ', ' + form.city + ' ' + form.zip}</p>
              </section>
              {groups.map((g, i) => {
                const so = shipFor(g, form);
                return (
                  <section className="panel col gap-8" key={g.sid}>
                    <div className="row between center wrapf gap-8"><h2 className="h3">Paket {i + 1} · {g.seller.name}</h2><span className="fine">{so.label + ' · ' + rp(so.cost) + ' · ' + so.eta}</span></div>
                    <p className="muted">{itemsText(g)}</p>
                    <div className="sum-row"><span>Subtotal + ongkir</span><b>{rp(g.subtotal + so.cost)}</b></div>
                  </section>
                );
              })}
              <section className="panel col gap-8">
                <div className="row between center"><h2 className="h3">Pembayaran</h2><Button variant="ghost" size="sm" onClick={() => setStep(2)}>Ubah</Button></div>
                <p>{payChoiceLabel(form, multi)}</p>
              </section>
              <Notice icon="undo">
                <b>Aturan pembatalan:</b> kamu bisa membatalkan per paket sebelum penjual mengirimnya. Setelah dikirim, gunakan “Ajukan bantuan” di Pesanan Saya bila barang tidak sesuai deskripsi.
              </Notice>
              <label className="check" style={{ alignItems: 'flex-start' }}>
                <input type="checkbox" checked={form.agree} onChange={() => { setForm((c) => ({ ...c, agree: !c.agree })); setErrors({}); }} style={{ marginTop: 3 }} />
                <span>Saya sudah memeriksa pesanan dan menyetujui aturan pembatalan serta kebijakan marketplace.</span>
              </label>
              <ErrorText>{errors.agree}</ErrorText>
            </div>
          ) : null}

          <div className="so-nav hide-m" style={{ marginTop: 0 }}>
            <Button variant="secondary" onClick={back}>{step === 1 ? 'Kembali ke keranjang' : 'Kembali'}</Button>
            <Button size="lg" onClick={next} disabled={placing}>{primaryLabel}</Button>
          </div>
        </div>
        <OrderSummary count={count} pkgs={groups.length} subtotal={subtotal} shipping={shipping} />
      </div>
      <MobilePayBar label="Total" value={rp(total)} actionLabel={primaryLabel} onAction={next} disabled={placing} />
    </div>
  );
}
