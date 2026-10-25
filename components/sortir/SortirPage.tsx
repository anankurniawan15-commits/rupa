'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { ProductCard } from '@/components/product/ProductCard';
import { ChatModal } from '@/components/modals/SharedModals';
import { useSortir, toast } from '@/lib/store';
import { sampleOf, sortirService } from '@/lib/services/sortir.service';
import { actionTitle, validateFile } from '@/lib/ai/sortir-engine';
import { exploreHref } from '@/lib/services/product.service';
import { listingAssistService } from '@/lib/services/listing-assist.service';
import { currentUser } from '@/lib/services/auth.service';
import { isAbort } from '@/lib/services/util';
import { SortirStepper } from './SortirStepper';
import { SortirError, SortirPreview, SortirUnsupported, SortirUpload, SortirUploadChoice } from './SortirUpload';
import { SortirLoading } from './SortirLoading';
import { SortirResult } from './SortirResult';
import { LowConfidencePanel } from './LowConfidencePanel';
import { ActionPicker } from './ActionPicker';
import { IdeaCard } from './IdeaCard';
import { CreatorList } from './CreatorList';
import { sourceVis } from './SourceVisual';
import type { ScenarioKey, SortirSource } from '@/types/ai';
import type { Seller } from '@/types/product';

const SAVE_NOTE = 'Masuk untuk menyimpan hasil AI Sortir. Hasil analisismu tetap ada.';

const toTop = () => {
  try {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch {
    /* noop */
  }
};

/** Object URL foto unggahan dilepas saat diganti/dihapus. */
const revoke = (src: SortirSource | null, next?: SortirSource | null) => {
  if (src && src.kind === 'upload' && src.url && (!next || next.kind !== 'upload' || next.url !== src.url)) {
    try {
      URL.revokeObjectURL(src.url);
    } catch {
      /* noop */
    }
  }
};

/** AI Sortir — 5 langkah (Unggah, Identifikasi, Langkah, Ide, Marketplace). State alur di useSortir. */
export function SortirPage() {
  const router = useRouter();
  const flow = useSortir((s) => s.flow);
  const setFlow = useSortir((s) => s.setFlow);
  const resetFlow = useSortir((s) => s.resetFlow);
  const ctrl = useRef<AbortController | null>(null);
  const [chatWith, setChatWith] = useState<Seller | null>(null);

  // Analisis yang masih berjalan dibatalkan saat meninggalkan halaman.
  useEffect(() => () => {
    if (ctrl.current) {
      ctrl.current.abort();
      ctrl.current = null;
      const st = useSortir.getState();
      if (st.flow.status === 'loading') st.setFlow({ status: 'preview', loadIdx: 0 });
    }
  }, []);

  const S = flow.scen ? sortirService.getScenario(flow.scen) : null;
  const src = flow.src;
  const vis = sourceVis(src);

  const setSrc = (next: SortirSource, patch: Parameters<typeof setFlow>[0] = {}) => {
    revoke(useSortir.getState().flow.src, next);
    setFlow({ ...(typeof patch === 'function' ? {} : patch), src: next });
  };

  const reset = () => {
    ctrl.current?.abort();
    ctrl.current = null;
    revoke(useSortir.getState().flow.src);
    resetFlow();
  };

  const toResult = (k: ScenarioKey | null, low: boolean) => {
    setFlow((f) => ({ status: 'done', scen: k, low, picked: false, step: 2, maxStep: Math.max(f.maxStep, 2), action: k ? sortirService.getScenario(k).rec : null, correcting: false, openIdea: 0 }));
    toTop();
  };

  const pickScen = (k: ScenarioKey) => {
    setFlow((f) => ({ status: 'done', scen: k, low: false, picked: true, step: 2, maxStep: Math.max(f.maxStep, 2), action: sortirService.getScenario(k).rec, correcting: false, openIdea: 0 }));
  };

  const analyze = async (next?: SortirSource) => {
    const s = next || useSortir.getState().flow.src;
    if (!s) return;
    ctrl.current?.abort();
    const ac = new AbortController();
    ctrl.current = ac;
    setSrc(s, { status: 'loading', loadIdx: 0 });
    try {
      const out = await sortirService.analyze(s, (i) => { if (!ac.signal.aborted) setFlow({ loadIdx: i }); }, ac.signal);
      if (ac.signal.aborted || useSortir.getState().flow.status !== 'loading') return;
      ctrl.current = null;
      if (out.status === 'done') toResult(out.scen, out.low);
      else setFlow({ status: out.status });
    } catch (e) {
      if (!isAbort(e)) setFlow({ status: 'error' });
    }
  };

  const cancel = () => {
    ctrl.current?.abort();
    ctrl.current = null;
    setFlow({ status: 'preview', loadIdx: 0 });
  };

  const handleFile = (f: File | null) => {
    if (!f) return;
    const err = validateFile(f);
    if (err) return setFlow({ fileErr: err });
    let url = '';
    try {
      url = URL.createObjectURL(f);
    } catch {
      url = '';
    }
    setSrc({ kind: 'upload', url, name: f.name }, { status: 'preview', fileErr: '', step: 1 });
  };

  const toManual = () => {
    const manual = useSortir.getState().flow.manual;
    reset();
    setFlow({ manual });
    setTimeout(() => document.getElementById('somanual')?.focus(), 80);
  };

  const submitManual = () => {
    const t = flow.manual.trim();
    if (t.length < 12) return setFlow({ manualErr: 'Tulis minimal satu kalimat: jenis barang, bahan, dan kondisinya.' });
    void analyze({ kind: 'manual', text: t });
  };

  const next = () => {
    if (flow.step === 2 && !flow.scen) return toast('Pilih material dulu supaya sarannya tepat', { kind: 'warn' });
    if (flow.step === 3 && !flow.action) return toast('Pilih salah satu langkah dulu', { kind: 'warn' });
    const n = Math.min(5, flow.step + 1);
    setFlow((f) => ({ step: n, maxStep: Math.max(f.maxStep, n) }));
    toTop();
  };
  const back = () => setFlow({ step: Math.max(1, flow.step - 1) });

  const save = (title?: string) => {
    if (!S || !flow.scen) return;
    if (!currentUser()) {
      toast('Masuk dulu untuk menyimpan hasil analisis', { kind: 'info', actionLabel: 'Masuk', href: '/masuk?next=' + encodeURIComponent('/sortir') + '&note=' + encodeURIComponent(SAVE_NOTE) });
      return;
    }
    const t = title || ((src && src.kind === 'sample' ? sampleOf(src.key).label : 'Barang dari fotomu') + ' — ' + S.catLabel);
    void sortirService.save(t, flow.scen).then(() => toast('Tersimpan di profil (tanpa foto)', { actionLabel: 'Lihat', href: '/profil?tab=saved' }));
  };

  const findCreators = () => {
    document.querySelector('.creator')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    toast('Kreator yang menerima material ini ada di daftar sebelah kanan', { kind: 'info' });
  };

  const sellMaterial = () => {
    if (!S) return;
    listingAssistService.seedDraft({ draft: S.sellDraft, matOrigin: S.sellMat, cat: 'Bahan dan Material', cond: 'bahan', tags: S.tags.slice() });
    router.push('/jual');
    toast('Data analisis dipakai sebagai draf listing — periksa lagi sebelum terbit', { kind: 'info' });
  };

  const restart = () => {
    reset();
    toTop();
  };

  const itemName = S ? S.item : 'barang ini';
  const isPreview = flow.status === 'preview' || (flow.step === 1 && flow.status === 'done');

  return (
    <div className="page wrap">
      <header className="so-head">
        <p className="eyebrow">AI Sortir Barang</p>
        <h1 className="h1">Barang ini masih bisa jadi apa?</h1>
        <p className="lede" style={{ maxWidth: '60ch' }}>Unggah foto barang yang tak terpakai. Kamu akan mendapat perkiraan material, catatan kondisi yang terlihat, dan pilihan langkah berikutnya — lengkap dengan batasan analisisnya.</p>
      </header>
      <SortirStepper step={flow.step} maxStep={flow.maxStep} onGo={(n) => setFlow({ step: n })} />

      {flow.step === 1 ? (
        <div>
          {flow.status === 'idle' ? (
            <SortirUpload
              fileErr={flow.fileErr}
              manual={flow.manual}
              manualErr={flow.manualErr}
              onFile={handleFile}
              onSample={(k) => setSrc({ kind: 'sample', key: k }, { status: 'preview', fileErr: '' })}
              onManualChange={(v) => setFlow({ manual: v, manualErr: '' })}
              onManualSubmit={submitManual}
            />
          ) : null}
          {isPreview ? <SortirPreview vis={vis} onAnalyze={() => void analyze()} onFile={handleFile} onRemove={reset} /> : null}
          {flow.status === 'loading' ? <SortirLoading vis={vis} loadIdx={flow.loadIdx} onCancel={cancel} /> : null}
          {flow.status === 'unsupported' ? <SortirUnsupported onRemove={reset} onManual={toManual} /> : null}
          {flow.status === 'error' ? <SortirError onRetry={() => void analyze({ kind: 'sample', key: 'jeans' })} onManual={toManual} onRemove={reset} /> : null}
          {flow.status === 'uploadChoice' ? <SortirUploadChoice vis={vis} onPick={pickScen} onRemove={reset} /> : null}
          {flow.fileErr && flow.status !== 'idle' ? <p className="err mt-8" role="alert"><Icon name="warn" size="s" />{flow.fileErr}</p> : null}
        </div>
      ) : null}

      {flow.step === 2 ? (
        <div>
          {flow.status === 'done' && flow.low ? (
            <LowConfidencePanel vis={vis} manual={src?.kind === 'manual'} onPick={pickScen} onRetake={reset} onManual={toManual} />
          ) : null}
          {flow.status === 'done' && S && !flow.low ? (
            <SortirResult
              S={S}
              vis={vis}
              src={src}
              picked={flow.picked}
              correcting={flow.correcting}
              onToggleCorrect={() => setFlow((f) => ({ correcting: !f.correcting }))}
              onPick={pickScen}
              onNext={next}
            />
          ) : null}
        </div>
      ) : null}

      {flow.step === 3 && flow.scen ? (
        <div>
          <h2 className="h2">Apa langkah terbaik untuk {itemName}?</h2>
          <p className="muted mt-8" style={{ marginBottom: 24 }}>Diurutkan dari kondisi yang terlihat dan tingkat ketidakpastian material. Pilih satu untuk melihat ide yang sesuai.</p>
          <ActionPicker scen={flow.scen} action={flow.action} onPick={(k) => setFlow({ action: k })} />
          <div className="so-nav">
            <button type="button" className="btn btn-secondary" onClick={back}>Kembali</button>
            <button type="button" className="btn btn-primary" onClick={next}>Lihat ide pemanfaatan<Icon name="arrowRight" /></button>
          </div>
        </div>
      ) : null}

      {flow.step === 4 && S && flow.scen ? (
        <div>
          <h2 className="h2">Tiga ide untuk {itemName}</h2>
          <p className="muted mt-8" style={{ marginBottom: 24 }}>Langkah yang kamu pilih: <b>{flow.action ? actionTitle(flow.action) : ''}</b>. Biaya adalah kisaran kasar untuk bahan tambahan, bukan harga pasti.</p>
          <div className="ideas">
            {sortirService.generateIdeas(flow.scen, flow.action).map((idea, idx) => (
              <IdeaCard
                key={idea.name}
                idea={idea}
                n={idx + 1}
                open={flow.openIdea === idx}
                onToggle={() => setFlow((f) => ({ openIdea: f.openIdea === idx ? -1 : idx }))}
                onSave={() => save('Ide: ' + idea.name + ' (' + S.catLabel + ')')}
              />
            ))}
          </div>
          <div className="so-nav">
            <button type="button" className="btn btn-secondary" onClick={back}>Kembali</button>
            <button type="button" className="btn btn-primary" onClick={next}>Hubungkan ke marketplace<Icon name="arrowRight" /></button>
          </div>
        </div>
      ) : null}

      {flow.step === 5 && S && flow.scen ? (
        <div>
          <h2 className="h2">Terhubung ke marketplace</h2>
          <p className="muted mt-8" style={{ marginBottom: 24 }}>Lihat hasil karya serupa, temukan kreator yang menerima material ini, atau jual sendiri.</p>
          <div className="cta-grid">
            <button type="button" className="cta-tile" onClick={() => router.push(exploreHref({ mats: [S.mat] }))}><Icon name="search" /><b>Lihat Produk Serupa</b><span>Produk jadi dari material yang sama</span></button>
            <button type="button" className="cta-tile" onClick={findCreators}><Icon name="users" /><b>Temukan Kreator</b><span>Yang menerima material serupa</span></button>
            <button type="button" className="cta-tile" onClick={sellMaterial}><Icon name="store" /><b>Jual Material</b><span>Buat listing dengan data analisis ini</span></button>
            <button type="button" className="cta-tile" onClick={() => save()}><Icon name="bookmark" /><b>Simpan Hasil Analisis</b><span>Tersimpan di profil, tanpa foto</span></button>
          </div>
          <div className="mk">
            <div>
              <h3 className="h3" style={{ marginBottom: 16 }}>Produk dari material serupa</h3>
              <div className="grid-3">
                {sortirService.findSimilar(flow.scen).map((p) => <ProductCard key={p.id} p={p} />)}
              </div>
            </div>
            <CreatorList creators={sortirService.findCreators(flow.scen)} onContact={setChatWith} />
          </div>
          <div className="so-nav">
            <button type="button" className="btn btn-secondary" onClick={back}>Kembali</button>
            <button type="button" className="btn btn-ghost" onClick={restart}><Icon name="retry" />Sortir barang lain</button>
          </div>
          <ChatModal
            open={!!chatWith}
            threadKey={chatWith ? chatWith.id : ''}
            title={chatWith ? 'Chat dengan ' + chatWith.name : ''}
            sub={'Menawarkan material: ' + S.catLabel}
            onClose={() => setChatWith(null)}
          />
        </div>
      ) : null}
    </div>
  );
}
