'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { maskAccount, shopInit, shopService, SHOP_CITIES, SHOP_STEPS, validateShopStep, type ShopForm } from '@/lib/services/shop.service';
import { toast } from '@/lib/store/toast';
import { ErrorText, Input, Select, Textarea } from '@/components/ui/Field';
import { ButtonLink } from '@/components/ui/Button';
import { Stepper } from '@/components/ui/Stepper';
import { Icon } from '@/components/ui/Icon';
import { focusFirst, toTop } from '@/components/auth/helpers';
import { BankAccountForm } from './BankAccountForm';
import type { Account } from '@/types/user';

/** Alur Buka Toko 3 langkah (Info toko → Rekening → Persetujuan) + layar selesai. */
export function OpenShopStepper({ me }: { me: Account }) {
  const router = useRouter();
  const [form, setForm] = useState<ShopForm>(shopInit);
  const [step, setStep] = useState(1);
  const [maxStep, setMaxStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [doneName, setDoneName] = useState('');

  // Aturan prototipe: yang sudah punya toko → dashboard, kecuali baru saja menyelesaikan alur ini.
  const hasShop = !!me.shop;
  useEffect(() => {
    if (hasShop && !doneName && !loading) router.replace('/dashboard');
  }, [hasShop, doneName, loading, router]);

  const set = <K extends keyof ShopForm>(f: K, v: ShopForm[K]) => {
    setForm((x) => ({ ...x, [f]: v }));
    setErrors((x) => ({ ...x, [f]: '' }));
  };

  const go = (n: number) => { setStep(n); setErrors({}); };

  async function next() {
    const e = validateShopStep(step, form);
    if (Object.keys(e).length) {
      setErrors(e);
      focusFirst('sh', e, ['name', 'city', 'bank', 'acct', 'holder']);
      return;
    }
    if (step < 3) {
      const n = step + 1;
      setStep(n);
      setMaxStep((m) => Math.max(m, n));
      setErrors({});
      toTop();
      return;
    }
    setErrors({});
    setLoading(true);
    const shop = await shopService.openShop(me.id, form);
    setLoading(false);
    setDoneName(shop.name);
    toTop();
    toast('Toko dibuka. Pengajuan verifikasi dikirim ke admin (simulasi)');
  }

  if (hasShop && !doneName && !loading) return null;

  return (
    <div className="page wrap" style={{ maxWidth: 860 }}>
      <p className="eyebrow">Buka Toko</p>
      <h1 className="h1" style={{ margin: '8px 0 24px' }}>Mulai berjualan di Rupa</h1>

      {!doneName ? (
        <div>
          <Stepper steps={SHOP_STEPS} step={step} maxStep={maxStep} onGo={go} label="Langkah buka toko" />
          <div className="panel col gap-24" style={{ padding: 32 }}>
            {step === 1 ? (
              <div className="col gap-16">
                <h2 className="h2">Informasi toko</h2>
                <div className="field">
                  <label className="lbl" htmlFor="sh-name">Nama toko</label>
                  <Input
                    id="sh-name"
                    maxLength={40}
                    invalid={!!errors.name}
                    hasHelp
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                    placeholder="Contoh: Jahit Ulang Nusantara"
                  />
                  <span className="help" id="sh-name-help">3–40 karakter. Nama ini tampil di setiap listing.</span>
                  <ErrorText id="sh-name-err">{errors.name}</ErrorText>
                </div>
                <div className="field">
                  <label className="lbl" htmlFor="sh-city">Kota asal pengiriman</label>
                  <Select id="sh-city" invalid={!!errors.city} value={form.city} onChange={(e) => set('city', e.target.value)} options={SHOP_CITIES} placeholder="Pilih kota" />
                  <ErrorText id="sh-city-err">{errors.city}</ErrorText>
                </div>
                <div className="field">
                  <div className="row between">
                    <label className="lbl" htmlFor="sh-desc">
                      Deskripsi singkat <span className="opt">(opsional)</span>
                    </label>
                    <span className="fine" aria-live="polite">{form.desc.length}/160</span>
                  </div>
                  <Textarea id="sh-desc" maxLength={160} value={form.desc} onChange={(e) => set('desc', e.target.value)} placeholder="Apa yang kamu buat, dan dari bahan apa?" />
                </div>
              </div>
            ) : null}

            {step === 2 ? <BankAccountForm form={form} errors={errors} onField={(f, v) => set(f, v)} accountName={me.name} /> : null}

            {step === 3 ? (
              <div className="col gap-16">
                <h2 className="h2">Aturan penjual</h2>
                <ol className="steps" style={{ fontSize: 15 }}>
                  <li>Tulis material asal, proses, dan kondisi barang dengan jujur, termasuk cacat kecil.</li>
                  <li>Hindari klaim yang tidak bisa dibuktikan, seperti &quot;100% ramah lingkungan&quot;.</li>
                  <li>Semua transaksi dan komunikasi dilakukan di dalam Rupa.</li>
                  <li>Kemas dan kirim pesanan sesuai waktu pengemasan yang kamu tentukan.</li>
                </ol>
                <label className="check" style={{ alignItems: 'flex-start' }}>
                  <input id="sh-agree" type="checkbox" checked={form.agree} onChange={() => set('agree', !form.agree)} style={{ marginTop: 3 }} />
                  <span>Saya memahami dan menyetujui aturan penjual Rupa.</span>
                </label>
                <ErrorText id="sh-agree-err">{errors.agree}</ErrorText>
                <dl className="sum-dl">
                  <div><dt>Nama toko</dt><dd>{form.name}</dd></div>
                  <div><dt>Kota</dt><dd>{form.city}</dd></div>
                  <div><dt>Rekening</dt><dd>{maskAccount(form.bank, form.acct)}</dd></div>
                </dl>
              </div>
            ) : null}

            <div className="so-nav" style={{ marginTop: 0 }}>
              <button type="button" className="btn btn-secondary" onClick={() => { go(Math.max(1, step - 1)); toTop(); }} disabled={step === 1}>
                Kembali
              </button>
              <button type="button" className="btn btn-primary" onClick={next} disabled={loading}>
                {loading ? 'Membuka toko…' : step === 3 ? 'Buka toko' : 'Lanjut'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="panel col gap-16" style={{ padding: 40, alignItems: 'flex-start' }}>
          <span className="succ-ic" style={{ width: 64, height: 64 }}>
            <Icon name="check" size="l" />
          </span>
          <h2 className="h1">{doneName} sudah aktif</h2>
          <span className="st st-draf">Menunggu verifikasi admin</span>
          <p className="muted">Kamu sudah bisa membuat listing. Setelah admin memverifikasi data toko dan rekening, tokomu mendapat penanda terverifikasi.</p>
          <div className="row gap-8 wrapf">
            <ButtonLink href="/jual" size="lg">Buat listing pertama</ButtonLink>
            <ButtonLink href="/dashboard" variant="secondary" size="lg">Ke dashboard</ButtonLink>
          </div>
        </div>
      )}
    </div>
  );
}
