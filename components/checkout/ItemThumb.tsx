import Image from 'next/image';
import Link from 'next/link';
import { productHref } from '@/components/product/ProductCard';
import type { Product } from '@/types/product';

/** Thumbnail produk kecil yang membuka detail (`.cthumb` keranjang / `.oi-th` pesanan). */
export function ItemThumb({ p, className = 'cthumb', sizes = '88px' }: { p: Product; className?: 'cthumb' | 'oi-th'; sizes?: string }) {
  return (
    <Link className={className} href={productHref(p.id)} aria-label={'Lihat ' + p.title} style={{ position: 'relative' }}>
      {p.img ? <Image className="cover" src={p.img} alt="" fill sizes={sizes} /> : <span className={'ph ph-' + (p.ph || 'textile')} />}
    </Link>
  );
}
