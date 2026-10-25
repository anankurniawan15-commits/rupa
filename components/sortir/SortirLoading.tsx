'use client';
import { Icon } from '@/components/ui/Icon';
import { LOAD_LINES } from '@/lib/ai/sortir-engine';
import { SourceVisual, type SourceVis } from './SourceVisual';

/** Analisis berjalan: tiga baris progres, scanline di atas gambar, skeleton, tombol Batalkan. */
export function SortirLoading({ vis, loadIdx, onCancel }: { vis: SourceVis; loadIdx: number; onCancel: () => void }) {
  return (
    <div className="preview" aria-busy="true">
      <div className="frame">
        <SourceVisual vis={vis} />
        <span className="scanline" aria-hidden="true" />
      </div>
      <div>
        <h2 className="h2">Menganalisis…</h2>
        <ul className="load-lines" aria-live="polite">
          {LOAD_LINES.map((t, i) => (
            <li key={t} className={i < loadIdx ? 'is-done' : i === loadIdx ? 'is-now' : ''}>
              {i < loadIdx ? <Icon name="check" /> : null}
              {i === loadIdx ? <span className="spin" aria-hidden="true" /> : null}
              {i > loadIdx ? <span className="dotwait" aria-hidden="true" /> : null}
              {t}
            </li>
          ))}
        </ul>
        <div className="col gap-8" aria-hidden="true">
          <div className="skel" style={{ width: '70%' }} />
          <div className="skel" style={{ width: '90%' }} />
          <div className="skel" style={{ width: '55%' }} />
        </div>
        <button type="button" className="btn btn-ghost mt-24" onClick={onCancel}>Batalkan</button>
      </div>
    </div>
  );
}
