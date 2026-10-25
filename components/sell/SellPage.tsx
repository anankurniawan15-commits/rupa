'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Guard } from '@/components/auth/Guard';
import { ConfirmDialog } from '@/components/ui/Modal';
import { Icon } from '@/components/ui/Icon';
import { toast } from '@/lib/store/toast';
import { useSell } from '@/lib/store';
import { AI_TIPS, CALC_RATE_DEFAULT, CITIES, listingAssistService, sellInit, stepErrors } from '@/lib/services/listing-assist.service';
import type { Account } from '@/types/user';
import type { ListingDraft } from '@/types/product';
import { ListingStepper } from './ListingStepper';
import { PhotoUploader } from './PhotoUploader';
import { AssistantPanel } from './AiSuggestions';
import { StepMaterial, StepPrice, StepShipping, StepTitle } from './SellSteps';
import { ListingPreview } from './ListingPreview';
import type { SellUi, SetForm, SetUi, StepProps } from './types';

const uiInit = (): SellUi => ({ step: 1, titleSugs: [], titleLoading: false, recCat: '', tagSugs: [], tagInput: '', descLoading: false, calcMat: '', calcHours: '', calcRate: CALC_RATE_DEFAULT, errors: {} });
const toTop = () => { try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch { /* noop */ } };

export function SellPage() {
  return <Guard need="seller">{(me) => <SellForm me={me} />}</Guard>;
}

function SellForm({ me }: { me: Account }) {
  const router = useRouter();
  const shopCity = me.shop && CITIES.indexOf(me.shop.city) >= 0 ? me.shop.city : sellInit().city;
  const fresh = (): ListingDraft => ({ ...sellInit(), city: shopCity });

  /* Draf titipan (AI Sortir "Jual Material" / Edit di dashboard / Listing baru). Dibaca saat mount
     dan setiap kali titipan baru muncul — halaman bisa tetap terpasang lewat <Activity>. */
  const seed = useSell((s) => s.seed);
  const [applied, setApplied] = useState<ListingDraft | null>(() => listingAssistService.peekSeed());
  const [form, setFormState] = useState<ListingDraft>(() => listingAssistService.peekSeed() || fresh());
  const [ui, setUiState] = useState<SellUi>(uiInit);
  const [confirm, setConfirm] = useState(false);
  if (seed && seed !== applied) {
    setApplied(seed);
    setFormState(seed);
    setUiState(uiInit());
  }
  useEffect(() => { if (seed) listingAssistService.takeSeed(); }, [seed]);

  const setForm: SetForm = (patch) => setFormState((f) => ({ ...f, ...(typeof patch === 'function' ? patch(f) : patch) }));
  const setUi: SetUi = (patch) => setUiState((u) => ({ ...u, ...(typeof patch === 'function' ? patch(u) : patch) }));
  const setField = <K extends keyof ListingDraft>(k: K, v: ListingDraft[K]) => {
    setFormState((f) => ({ ...f, [k]: v }));
    setUiState((u) => (u.errors[k as string] ? { ...u, errors: { ...u.errors, [k]: '' } } : u));
  };

  const flags = useMemo(() => listingAssistService.checkClaims([form.title, form.draft, form.desc, form.process].join(' ')), [form.title, form.draft, form.desc, form.process]);
  const missing = listingAssistService.missingSteps(form);
  const refData = useMemo(() => listingAssistService.priceReference(form.cat), [form.cat]);
  const step = ui.step;
  const isEdit = !!form.editId;
  const tips = AI_TIPS(step, { recCat: ui.recCat, flags: flags.length, refHas: refData.has, refN: refData.n, missing: missing.length });

  const go = (n: number) => { setUi({ step: n }); };
  const next = () => {
    const e = stepErrors(step, form);
    if (Object.keys(e).length) { setUi((u) => ({ errors: { ...u.errors, ...e } })); toast('Lengkapi isian yang ditandai dulu', { kind: 'warn' }); return; }
    setUi({ step: Math.min(6, step + 1), errors: {} });
    toTop();
  };
  const back = () => { setUi({ step: Math.max(1, step - 1) }); toTop(); };
  const publish = () => {
    let first = 0;
    let errs: Record<string, string> = {};
    for (let n = 1; n <= 5; n++) { const e = stepErrors(n, form); if (Object.keys(e).length && !first) first = n; errs = { ...errs, ...e }; }
    if (first) { setUi({ errors: errs, step: first }); toast('Masih ada info wajib yang kosong', { kind: 'warn' }); toTop(); return; }
    setConfirm(true);
  };
  const doPublish = async () => {
    const wasEdit = isEdit;
    await listingAssistService.publish(form, me.id);
    setConfirm(false);
    setFormState(fresh());
    setUiState(uiInit());
    router.push('/dashboard?tab=listings');
    toast(wasEdit ? 'Perubahan listing disimpan' : 'Listing terbit di dashboard-mu (prototipe: belum masuk katalog publik)');
  };
  const cancelEdit = () => { setFormState(fresh()); setUiState(uiInit()); router.push('/dashboard'); };

  const props: StepProps = { form, ui, setForm, setUi, setField };
  const headTitle = isEdit ? 'Edit listing' : 'Listing produk baru';

  return (
    <div className="page wrap">
      <nav className="crumbs" aria-label="Breadcrumb"><Link href="/dashboard">Dashboard Penjual</Link><span aria-hidden="true">/</span><span aria-current="page">{headTitle}</span></nav>
      <div className="row between center wrapf gap-16" style={{ marginBottom: 28 }}>
        <div className="col gap-8"><h1 className="h1">{headTitle}</h1><p className="muted">Isi bertahap. Semua saran AI bisa kamu ubah sebelum listing terbit.</p></div>
        <div className="row gap-8 wrapf">
          {isEdit ? <button type="button" className="btn btn-ghost" onClick={cancelEdit}>Batalkan edit</button> : null}
          <button type="button" className="btn btn-secondary" onClick={() => toast('Draf tersimpan (simulasi). Lanjutkan kapan saja dari dashboard.', { kind: 'info' })}>Simpan draf</button>
        </div>
      </div>
      <div className="sell">
        <ListingStepper step={step} missing={missing} onGo={go} />
        <div className="sell-form">
          {step === 1 ? <PhotoUploader {...props} /> : null}
          {step === 2 ? <StepTitle {...props} /> : null}
          {step === 3 ? <StepMaterial {...props} flags={flags} /> : null}
          {step === 4 ? <StepPrice {...props} refData={refData} /> : null}
          {step === 5 ? <StepShipping {...props} /> : null}
          {step === 6 ? <ListingPreview form={form} missing={missing} flagCount={flags.length} shopName={me.shop?.name || ''} /> : null}
          <div className="so-nav" style={{ marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={back} disabled={step === 1}>Kembali</button>
            {step < 6 ? (
              <button type="button" className="btn btn-primary" onClick={next}>Lanjut<Icon name="arrowRight" /></button>
            ) : (
              <button type="button" className="btn btn-primary btn-lg" onClick={publish}>{isEdit ? 'Simpan perubahan' : 'Terbitkan listing'}</button>
            )}
          </div>
        </div>
        <AssistantPanel head={missing.length ? missing.length + ' langkah belum lengkap' : 'Info wajib sudah lengkap'} items={tips} />
      </div>
      <ConfirmDialog
        open={confirm}
        title={isEdit ? 'Simpan perubahan listing?' : 'Terbitkan listing?'}
        body={isEdit ? 'Perubahan langsung terlihat oleh pembeli.' : 'Listing akan tampil untuk semua pengguna. Kamu tetap bisa mengedit atau menjedanya kapan saja dari dashboard.'}
        confirmLabel={isEdit ? 'Simpan perubahan' : 'Terbitkan'}
        onConfirm={() => void doPublish()}
        onClose={() => setConfirm(false)}
      />
    </div>
  );
}
