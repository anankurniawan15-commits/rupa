'use client';
import { Tag } from '@/components/ui/Chip';

/** Skeleton saat AI menyusun saran. */
export function AiSkeleton({ widths }: { widths: string[] }) {
  return (
    <div className="col gap-8" aria-busy="true">
      {widths.map((w, i) => <div key={i} className="skel" style={{ width: w }} />)}
    </div>
  );
}

/** Daftar saran judul AI (klik untuk memakai). */
export function TitleSuggestions({ titles, onPick }: { titles: string[]; onPick: (t: string) => void }) {
  if (!titles.length) return null;
  return (
    <div className="col gap-8">
      <p className="row gap-8 center"><Tag kind="ai">Saran AI</Tag><span className="fine">Pilih satu, lalu ubah sesukamu.</span></p>
      <div className="sugg-list">
        {titles.map((t) => (
          <button key={t} type="button" className="sugg-item" onClick={() => onPick(t)}>
            <span>{t}</span><span className="use">Pakai</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Saran kategori AI bila berbeda dari pilihan saat ini. */
export function CategorySuggestion({ recCat, onUse }: { recCat: string; onUse: () => void }) {
  return (
    <div className="row gap-8 center wrapf">
      <Tag kind="ai">Saran AI</Tag>
      <span className="fine">Kategori yang cocok: <b>{recCat}</b></span>
      <button type="button" className="btn btn-ghost btn-sm" onClick={onUse}>Pakai</button>
    </div>
  );
}

/** Panel kanan "Asisten listing" (ungu muda). */
export function AssistantPanel({ head, items }: { head: string; items: string[] }) {
  return (
    <aside className="sell-ai" aria-label="Asisten listing">
      <p className="eyebrow on-dark">Asisten listing</p>
      <h2 className="h4">{head}</h2>
      <ul className="ai-list">
        {items.map((a) => (
          <li key={a}>
            <svg className="ic ic-s" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
            <span>{a}</span>
          </li>
        ))}
      </ul>
      <p className="fine" style={{ color: '#3A3A3A' }}>AI hanya memberi saran. Kamu bertanggung jawab atas kebenaran isi listing.</p>
    </aside>
  );
}
