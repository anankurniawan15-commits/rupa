'use client';
import { Icon } from '@/components/ui/Icon';
import { confidenceClass, LOW_PICKS } from '@/lib/ai/sortir-engine';
import { SourceVisual, type SourceVis } from './SourceVisual';
import type { SortirMaterialCategory, SortirScenario, SortirSource } from '@/types/ai';

/** Langkah 2 — hasil klasifikasi gambar AI Sortir sesuai struktur output `sortir.py` terbaru (tanpa rekomendasi upcycle/DIY). */
export function SortirResult({
  S, vis, src, picked, correcting, onToggleCorrect, onPick, onNext,
}: {
  S: SortirScenario;
  vis: SourceVis;
  src: SortirSource | null;
  picked: boolean;
  correcting: boolean;
  onToggleCorrect: () => void;
  onPick: (k: Exclude<SortirMaterialCategory, 'unknown'>) => void;
  onNext: () => void;
}) {
  const isLlm = S.sourcePath === 'llm';
  const isFallback = S.sourcePath === 'fallback';
  const providerSummary = S.visionProvider
    ? `${S.visionProvider} Vision${S.visionBackbone ? ` (${S.visionBackbone})` : ''}`
    : 'Vision API (Groq / Gemini fallback)';

  const srcNote = !src
    ? ''
    : isLlm
      ? (src.kind === 'upload' ? `Analisis gambar via ${providerSummary}.` : 'Analisis deskripsi teks.')
      : isFallback
        ? (picked ? 'Material dipilih manual olehmu.' : 'Analisis aturan teks berdasarkan deskripsi.')
        : src.kind === 'manual'
          ? 'Berdasarkan deskripsi teks, bukan foto.'
          : 'Analisis foto contoh (simulasi).';

  const scoreValue = S.conf ?? (picked ? 100 : 65);
  const detectedObjects = S.detectedObjects || [];

  return (
    <div className="res">
      <div className="res-img">
        <div className="frame"><SourceVisual vis={vis} /></div>
        <p className="fine">{srcNote}</p>
      </div>
      <div className="res-main">
        <div className="col gap-8">
          <div className="row gap-8 wrapf center">
            <span className="tag tag-ai">
              {picked
                ? 'Dipilih manual'
                : S.visionProvider
                  ? `${S.visionProvider} Vision`
                  : `Perkiraan AI${isFallback ? ' · aturan' : ''}`}
            </span>
            <span className="tag tag-data">Confidence {scoreValue}%</span>
            {S.visionBackbone && !picked ? <span className="tag tag-est">{S.visionBackbone}</span> : null}
            {S.crispDmVersion ? <span className="tag tag-est">{S.crispDmVersion}</span> : null}
            {S.needsManualReview && !picked ? <span className="tag tag-warn">Perlu verifikasi manual</span> : null}
          </div>
          <h2 className="h1">{S.catLabel}</h2>
          <p className="muted">{S.sub}</p>
        </div>
        <div className="conf">
          <div className="conf-l">
            <span>Confidence Visual</span>
            <b>
              {picked
                ? `Ditetapkan olehmu · ${scoreValue}%`
                : `${S.confLabel} · ${scoreValue}%`}
            </b>
          </div>
          <div className="meter" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={scoreValue} aria-label="Tingkat confidence visual">
            <span className={confidenceClass(scoreValue)} style={{ width: scoreValue + '%' }} />
          </div>
          <p className="fine">{picked ? 'Kamu menentukan materialnya sendiri secara manual (100%).' : S.confNote}</p>
        </div>
        <dl className="res-dl">
          <div><dt>Jenis barang</dt><dd>{S.item}</dd></div>
          <div><dt>Kategori material</dt><dd>{S.cat}</dd></div>
          <div><dt>Perkiraan komposisi</dt><dd>{S.comp} <span className="tag tag-est">Perkiraan</span></dd></div>
          {detectedObjects.length ? (
            <div>
              <dt>Objek teridentifikasi</dt>
              <dd>
                <div className="chips" style={{ marginTop: 4 }}>
                  {detectedObjects.map((obj) => <span key={obj} className="tag tag-est">{obj}</span>)}
                </div>
              </dd>
            </div>
          ) : null}
          <div>
            <dt>Kondisi yang terlihat</dt>
            <dd>
              {S.cond.length === 1 ? (
                S.cond[0]
              ) : (
                <ul style={{ margin: 0, paddingLeft: 18 }}>{S.cond.map((c) => <li key={c}>{c}</li>)}</ul>
              )}
            </dd>
          </div>
          {S.visionProvider || S.visionBackbone ? (
            <div>
              <dt>Provider &amp; Model</dt>
              <dd>{[S.visionProvider, S.visionBackbone].filter(Boolean).join(' · ')}</dd>
            </div>
          ) : null}
        </dl>
        {S.warnings.length ? (
          <div className="warn-box" role="note">
            <Icon name="warn" />
            <div><b>Safety Gate — Perhatikan sebelum digunakan</b><ul>{S.warnings.map((w) => <li key={w}>{w}</li>)}</ul></div>
          </div>
        ) : null}
        {S.limitations && S.limitations.length ? (
          <div className="notice">
            <Icon name="info" />
            <div>
              <b>Batasan analisis:</b>
              <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                {S.limitations.map((lim) => <li key={lim}>{lim}</li>)}
              </ul>
            </div>
          </div>
        ) : (
          <p className="fine">Batasan: analisis dari foto tidak dapat memastikan komposisi kimia, kontaminasi, kekuatan struktur, atau apakah barang diterima fasilitas daur ulang tertentu.</p>
        )}
        {correcting ? (
          <div className="col gap-8">
            <h3 className="h4">Material yang benar:</h3>
            <div className="chips">{LOW_PICKS.map(([k, l]) => <button key={k} type="button" className="chip" onClick={() => onPick(k)}>{l}</button>)}</div>
          </div>
        ) : null}
        <div className="row gap-8 wrapf">
          <button type="button" className="btn btn-primary btn-lg" onClick={onNext}>Lanjut ke langkah berikutnya<Icon name="arrowRight" /></button>
          <button type="button" className="btn btn-ghost btn-lg" onClick={onToggleCorrect} aria-expanded={correcting}>Bukan ini? Koreksi material</button>
        </div>
      </div>
    </div>
  );
}
