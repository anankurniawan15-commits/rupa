'use client';
import { Icon } from '@/components/ui/Icon';
import { confidenceClass, LOW_PICKS } from '@/lib/ai/sortir-engine';
import { SourceVisual, type SourceVis } from './SourceVisual';
import type { ScenarioKey, SortirScenario, SortirSource } from '@/types/ai';

/** Langkah 2 — hasil identifikasi (perkiraan), meter keyakinan, peringatan, koreksi material. */
export function SortirResult({
  S, vis, src, picked, correcting, onToggleCorrect, onPick, onNext,
}: {
  S: SortirScenario;
  vis: SourceVis;
  src: SortirSource | null;
  picked: boolean;
  correcting: boolean;
  onToggleCorrect: () => void;
  onPick: (k: ScenarioKey) => void;
  onNext: () => void;
}) {
  const upload = src?.kind === 'upload';
  const srcNote = !src ? '' : upload ? 'Contoh hasil untuk jenis barang yang kamu pilih — prototipe tidak membaca fotomu.' : src.kind === 'manual' ? 'Berdasarkan deskripsi teks, bukan foto.' : 'Analisis foto contoh (simulasi).';
  return (
    <div className="res">
      <div className="res-img">
        <div className="frame"><SourceVisual vis={vis} /></div>
        <p className="fine">{srcNote}</p>
      </div>
      <div className="res-main">
        <div className="col gap-8">
          <span className="tag tag-ai" style={{ alignSelf: 'flex-start' }}>Perkiraan AI{upload ? ' · contoh' : ''}</span>
          <h2 className="h1">{S.catLabel}</h2>
          <p className="muted">{S.sub}</p>
        </div>
        <dl className="res-dl">
          <div><dt>Kategori material</dt><dd>{S.cat}</dd></div>
          <div><dt>Perkiraan komposisi</dt><dd>{S.comp} <span className="tag tag-est">Perkiraan</span></dd></div>
          <div><dt>Kondisi yang terlihat</dt><dd><ul>{S.cond.map((c) => <li key={c}>{c}</li>)}</ul></dd></div>
          <div><dt>Kategori pemanfaatan</dt><dd>{S.reuse}</dd></div>
        </dl>
        <div className="conf">
          <div className="conf-l"><span>Keyakinan</span><b>{picked ? 'Dipilih olehmu' : S.confLabel + ' · ' + S.conf + '%'}</b></div>
          {!picked ? (
            <div className="meter" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={S.conf} aria-label="Tingkat keyakinan">
              <span className={confidenceClass(S.conf)} style={{ width: S.conf + '%' }} />
            </div>
          ) : null}
          <p className="fine">{picked ? 'Kamu menentukan materialnya sendiri, jadi saran di bawah bersifat umum untuk kategori ini.' : S.confNote}</p>
        </div>
        {S.warnings.length ? (
          <div className="warn-box" role="note">
            <Icon name="warn" />
            <div><b>Perhatikan sebelum digunakan</b><ul>{S.warnings.map((w) => <li key={w}>{w}</li>)}</ul></div>
          </div>
        ) : null}
        <p className="fine">Batasan: analisis dari foto tidak dapat memastikan komposisi kimia, kontaminasi, kekuatan struktur, atau apakah barang diterima fasilitas daur ulang tertentu.</p>
        {correcting ? (
          <div className="col gap-8">
            <h3 className="h4">Material yang benar:</h3>
            <div className="chips">{LOW_PICKS.map(([k, l]) => <button key={k} type="button" className="chip" onClick={() => onPick(k)}>{l}</button>)}</div>
          </div>
        ) : null}
        <div className="row gap-8 wrapf">
          <button type="button" className="btn btn-primary btn-lg" onClick={onNext}>Lihat langkah berikutnya<Icon name="arrowRight" /></button>
          <button type="button" className="btn btn-ghost btn-lg" onClick={onToggleCorrect} aria-expanded={correcting}>Bukan ini? Koreksi material</button>
        </div>
      </div>
    </div>
  );
}
