'use client';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Avatar, MatTag } from '@/components/ui/Chip';
import { Placeholder } from '@/components/ui/Placeholder';
import { useIsWished, wishlistService, WISH_LOGIN_NOTE } from '@/lib/services/cart.service';
import { getSeller } from '@/lib/services/product.service';
import { useHydrated } from '@/lib/store';
import { cx, rp } from '@/lib/format';
import type { Product } from '@/types/product';

export const productAlt = (p: Product) => p.title + ', dibuat dari ' + p.matShort.toLowerCase();
export const productHref = (id: string) => '/produk/' + id;

/** Hook tombol wishlist: tamu diarahkan ke Masuk lalu kembali ke halaman ini. */
export function useWishToggle(id: string) {
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useHydrated();
  const wished = useIsWished(id) && hydrated;
  const toggle = async () => {
    const r = await wishlistService.toggle(id);
    if (r === 'login') router.push('/masuk?next=' + encodeURIComponent(pathname) + '&note=' + encodeURIComponent(WISH_LOGIN_NOTE));
  };
  return { wished, toggle };
}

export function FavButton({ p }: { p: Product }) {
  const { wished, toggle } = useWishToggle(p.id);
  return (
    <button type="button" className={cx('fav', wished && 'is-on')} onClick={toggle} aria-pressed={wished} aria-label={(wished ? 'Hapus ' : 'Simpan ') + p.title + (wished ? ' dari wishlist' : ' ke wishlist')}>
      <Icon name="heart" />
    </button>
  );
}

/** Foto produk atau placeholder material jujur. Dipakai di kartu, keranjang, pesanan. */
export function ProductThumb({ p, sizes = '(max-width: 760px) 50vw, 25vw', priority }: { p: Product; sizes?: string; priority?: boolean }) {
  return p.img ? (
    <Image className="pc-img" src={p.img} alt={productAlt(p)} fill sizes={sizes} priority={priority} />
  ) : (
    <Placeholder kind={p.ph} />
  );
}

/** Kartu produk (`.pc`) persis seperti prototipe. */
export function ProductCard({ p, priority, showSoldOut, footer }: { p: Product; priority?: boolean; /** Label "Stok habis" (Jelajahi, Wishlist). */ showSoldOut?: boolean; footer?: ReactNode }) {
  const s = getSeller(p.seller);
  return (
    <article className="pc">
      <div className="pc-media">
        <Link className="pc-open" href={productHref(p.id)} aria-label={'Lihat detail ' + p.title}>
          <ProductThumb p={p} priority={priority} />
        </Link>
        {showSoldOut && p.stock <= 0 ? <span className="pc-flag">Stok habis</span> : null}
        <FavButton p={p} />
      </div>
      <div className="pc-body">
        <MatTag>{p.matShort}</MatTag>
        <h3 className="pc-title"><Link className="linkbtn" href={productHref(p.id)}>{p.title}</Link></h3>
        <p className="pc-price">{rp(p.price)}</p>
        <p className="pc-seller"><Avatar initials={s.initials} /><span className="t">{s.name} · {s.city}</span></p>
        {footer}
      </div>
    </article>
  );
}

/** Rail horizontal (`.rail`). */
export function ProductRail({ products }: { products: Product[] }) {
  return (
    <div className="rail" role="list">
      {products.map((p) => (
        <div role="listitem" key={p.id}><ProductCard p={p} /></div>
      ))}
    </div>
  );
}
