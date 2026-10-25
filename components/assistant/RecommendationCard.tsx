'use client';
import Image from 'next/image';
import { productAlt, useWishToggle } from '@/components/product/ProductCard';
import { getProduct, getSeller } from '@/lib/services/product.service';
import { assistantService } from '@/lib/services/assistant.service';
import { r1, rp } from '@/lib/format';

/** Kartu rekomendasi produk (label "Data katalog" + alasan "kenapa cocok"). */
export function RecommendationCard({ id, reasons, inCompare, onOpen }: { id: string; reasons: string[]; inCompare: boolean; onOpen: (id: string) => void }) {
  const p = getProduct(id);
  const { wished, toggle } = useWishToggle(id);
  if (!p) return null;
  const s = getSeller(p.seller);
  return (
    <article className="rec">
      <button type="button" className="rec-img" style={{ position: 'relative' }} onClick={() => onOpen(p.id)} aria-label={'Lihat ' + p.title}>
        {p.img ? <Image className="cover" src={p.img} alt={productAlt(p)} fill sizes="84px" /> : <span className={'ph ph-' + (p.ph || 'textile')} />}
      </button>
      <div className="rec-b">
        <span className="tag tag-data" style={{ alignSelf: 'flex-start' }}>Data katalog</span>
        <button type="button" className="linkbtn" style={{ fontWeight: 600 }} onClick={() => onOpen(p.id)}>{p.title}</button>
        <span><b>{rp(p.price)}</b> <span className="fine">· {s.name}, {s.city} · ★ {r1(p.rating)}</span></span>
        <ul className="why" aria-label="Kenapa cocok">
          {reasons.map((r) => <li key={r}>{r}</li>)}
        </ul>
        <div className="rec-actions">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => onOpen(p.id)}>Lihat Produk</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => assistantService.toggleCompare(p.id)} aria-pressed={inCompare}>{inCompare ? 'Batal bandingkan' : 'Bandingkan'}</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void toggle()} aria-pressed={wished}>{wished ? 'Tersimpan' : 'Simpan'}</button>
        </div>
      </div>
    </article>
  );
}
