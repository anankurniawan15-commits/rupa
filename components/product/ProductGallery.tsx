'use client';
import Image from 'next/image';
import { useState } from 'react';
import { Placeholder } from '@/components/ui/Placeholder';
import { cx } from '@/lib/format';
import type { Product } from '@/types/product';
import { productAlt } from './ProductCard';

/** Foto utama + thumbnail + catatan foto jujur. */
export function ProductGallery({ p }: { p: Product }) {
  const [gi, setGi] = useState(0);
  const gal = p.gallery;
  const main = gal[gi] || p.img;
  return (
    <div>
      <div className="pd-main">
        {main ? (
          <Image className="cover" src={main} alt={productAlt(p) + (gi > 0 ? ' — detail' : '')} fill priority sizes="(max-width: 900px) 100vw, 50vw" />
        ) : (
          <Placeholder kind={p.ph} />
        )}
      </div>
      {gal.length > 1 ? (
        <div className="pd-thumbs" role="group" aria-label="Pilih foto">
          {gal.map((src, i) => (
            <button key={src} type="button" className={cx('thumb', gi === i && 'is-on')} onClick={() => setGi(i)} aria-pressed={gi === i} aria-label={'Foto ' + (i + 1) + ' dari ' + gal.length}>
              <Image className="cover" src={src} alt="" width={76} height={88} />
            </button>
          ))}
        </div>
      ) : null}
      <p className="fine mt-8">{p.img ? 'Foto dari penjual (contoh). Kondisi detail tertulis di bawah.' : 'Penjual belum mengunggah foto — gambar ini ilustrasi material, bukan foto produk.'}</p>
    </div>
  );
}
