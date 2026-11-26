'use client';
import { Button } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { categoryLabel, conditionLabel } from '@/lib/services/product.service';
import type { Product } from '@/types/product';

/** "Dari apa, menjadi apa": Material asal → Proses → Produk jadi, spesifikasi, disclaimer + Laporkan listing. */
export function MaterialStory({ p, onReport }: { p: Product; onReport: () => void }) {
  return (
    <section className="pd-story" aria-labelledby="pd-asal">
      <div className="row between wrapf gap-12 center">
        <h2 id="pd-asal" className="h2">Dari apa, menjadi apa</h2>
        <Tag kind="seller">Informasi dari penjual</Tag>
      </div>
      <div className="transform">
        <div className="tf-col"><p className="mono-label">Material asal</p><p className="tf-big">{p.originShort}</p><p>{p.origin}</p></div>
        <span className="tf-arrow" aria-hidden="true"><Icon name="arrowRight" /></span>
        <div className="tf-col"><p className="mono-label">Proses</p><p>{p.made}</p></div>
        <span className="tf-arrow" aria-hidden="true"><Icon name="arrowRight" /></span>
        <div className="tf-col final"><p className="mono-label">Produk jadi</p><p className="tf-big">{p.title}</p><p>{p.finished}</p></div>
      </div>
      <dl className="specs">
        <div><dt>Kondisi</dt><dd>{conditionLabel(p.cond)}</dd></div>
        <div><dt>Komposisi material</dt><dd>{p.comp}</dd></div>
        <div><dt>Ukuran</dt><dd>{p.dims}</dd></div>
        <div><dt>Perawatan</dt><dd>{p.care}</dd></div>
        <div><dt>Kategori</dt><dd>{categoryLabel(p.cat)}</dd></div>
        <div><dt>Catatan penjual</dt><dd>{p.note || '—'}</dd></div>
      </dl>
      <div className="disclaimer">
        <Icon name="info" />
        <p>Rupa tidak menguji atau menyertifikasi klaim material maupun dampak lingkungan. Informasi di atas disediakan penjual. Jika barang yang kamu terima tidak sesuai, ajukan bantuan dari halaman Pesanan Saya.</p>
        <Button variant="ghost" size="sm" onClick={onReport}><Icon name="flag" size="s" />Laporkan listing</Button>
      </div>
    </section>
  );
}
