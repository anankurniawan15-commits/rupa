'use client';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { getProduct } from '@/lib/services/product.service';
import { productHref } from '@/components/product/ProductCard';
import type { SortirIdea } from '@/types/ai';

/** Langkah 4 — satu kartu ide (kesulitan bertitik, waktu, biaya, alat, langkah bisa dibuka). */
export function IdeaCard({ idea, n, open, onToggle, onSave }: { idea: SortirIdea; n: number; open: boolean; onToggle: () => void; onSave: () => void }) {
  const rel = getProduct(idea.rel);
  return (
    <article className="idea">
      <p className="idea-n">Ide {n}</p>
      <h3>{idea.name}</h3>
      <p className="muted" style={{ fontSize: 14.5 }}>{idea.out}</p>
      <dl className="meta-grid">
        <div><dt>Kesulitan</dt><dd><span className="diff" aria-hidden="true">{[1, 2, 3].map((d) => <i key={d} className={d <= idea.diffN ? 'on' : ''} />)}</span>{idea.diff}</dd></div>
        <div><dt>Waktu</dt><dd>{idea.time}</dd></div>
        <div><dt>Perkiraan biaya</dt><dd>{idea.cost}</dd></div>
        <div><dt>Alat dan bahan</dt><dd>{idea.tools}</dd></div>
      </dl>
      <button type="button" className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start', paddingLeft: 0 }} onClick={onToggle} aria-expanded={open}>
        {open ? 'Sembunyikan langkah' : 'Lihat langkah-langkah'}
      </button>
      {open ? <ol className="steps">{idea.steps.map((s) => <li key={s}>{s}</li>)}</ol> : null}
      <div className="row gap-8 wrapf" style={{ marginTop: 'auto', paddingTop: 8, borderTop: '1px solid #E2E2E2' }}>
        {rel ? <Link className="btn btn-secondary btn-sm" href={productHref(rel.id)}>Contoh: {rel.title}</Link> : null}
        <button type="button" className="btn btn-ghost btn-sm" onClick={onSave}><Icon name="bookmark" size="s" />Simpan ide</button>
      </div>
    </article>
  );
}
