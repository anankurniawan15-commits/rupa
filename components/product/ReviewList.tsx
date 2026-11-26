'use client';
import { Stars } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { ratingDistribution, reviewsFor } from '@/lib/services/product.service';
import { r1 } from '@/lib/format';
import type { Product } from '@/types/product';

/** Ulasan pembeli: rata-rata, distribusi bintang (`.bars`), daftar ulasan terverifikasi. */
export function ReviewList({ p }: { p: Product }) {
  const dist = ratingDistribution(p.rating);
  const reviews = reviewsFor(p.id);
  return (
    <section className="pd-story" id="ulasan" aria-labelledby="pd-ulasan">
      <h2 id="pd-ulasan" className="h2">Ulasan pembeli</h2>
      <div className="rev-wrap">
        <div>
          <p className="rev-big">{r1(p.rating)}</p>
          <p className="muted">dari 5 · {p.nrev} ulasan</p>
          <div className="bars">
            {[5, 4, 3, 2, 1].map((n, i) => (
              <div key={n} className="bar-row"><span>{n}★</span><span className="track"><span style={{ width: dist[i] + '%' }} /></span><span>{dist[i]}%</span></div>
            ))}
          </div>
        </div>
        <div>
          {reviews.map((r, i) => (
            <article key={i} className="rev">
              <div className="row gap-12 center wrapf"><b>{r.n}</b><Stars n={r.s} /><span className="fine">{r.d}</span></div>
              <span className="verified"><Icon name="check" size="s" />Pembelian terverifikasi</span>
              <p>{r.t}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
