'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useState, type FormEvent } from 'react';
import { Icon } from '@/components/ui/Icon';
import { IconLink } from '@/components/ui/Button';
import { BrandMark } from './Brand';
import { ProfileMenu } from './ProfileMenu';
import { MobileDrawer } from './MobileDrawer';
import { isCurrent, isNavOn, type NavKey } from './nav';
import { useCurrentUser } from '@/lib/services/auth.service';
import { useCartCount, useWishIds } from '@/lib/services/cart.service';
import { exploreHref } from '@/lib/services/product.service';
import { useHydrated } from '@/lib/store';
import { cx } from '@/lib/format';

const LINKS: [NavKey, string, string][] = [
  ['home', '/', 'Beranda'],
  ['explore', '/jelajahi', 'Jelajahi'],
  ['sortir', '/sortir', 'Sortir dengan AI'],
  ['sell', '/jual', 'Jual Produk'],
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const me = useCurrentUser();
  const hydrated = useHydrated();
  const wishCount = useWishIds().length;
  const cartCount = useCartCount();
  const [menu, setMenu] = useState(false);
  const [q, setQ] = useState('');
  const closeMenu = useCallback(() => setMenu(false), []);

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    router.push(exploreHref({ q }));
  };

  return (
    <>
      <header className="hdr">
        <div className="hdr-in">
          <button type="button" className="iconbtn only-nav" onClick={() => setMenu(!menu)} aria-label="Buka menu" aria-expanded={menu}>
            <Icon name="menu" />
          </button>
          <Link className="brand" href="/" aria-label="Rupa, ke Beranda"><BrandMark /></Link>
          <nav className="hdr-nav" aria-label="Navigasi utama">
            {LINKS.map(([k, href, label]) => (
              <Link key={k} href={href} className={cx('navlink', isNavOn(k, pathname) && 'is-on')} aria-current={isCurrent(href, pathname) ? 'page' : undefined}>
                {label}
              </Link>
            ))}
          </nav>
          <form className="hdr-search" role="search" onSubmit={onSearch}>
            <label htmlFor="hq" className="sr">Cari produk, material, atau kegunaan</label>
            <Icon name="search" />
            <input id="hq" type="search" placeholder="Cari tote denim, lampu kayu, hadiah…" value={q} onChange={(e) => setQ(e.target.value)} />
          </form>
          <div className="hdr-actions">
            <IconLink href="/jelajahi" className="only-m" label="Cari produk"><Icon name="search" /></IconLink>
            <IconLink href="/wishlist" label={'Wishlist, ' + (hydrated ? wishCount : 0) + ' produk'} badge={hydrated ? wishCount : 0}><Icon name="heart" /></IconLink>
            <IconLink href="/keranjang" label={'Keranjang, ' + (hydrated ? cartCount : 0) + ' barang'} badge={hydrated ? cartCount : 0}><Icon name="bag" /></IconLink>
            {!hydrated ? (
              <span style={{ width: 40 }} aria-hidden="true" />
            ) : me ? (
              <ProfileMenu me={me} />
            ) : (
              <div className="row gap-8 center hdr-auth">
                <Link className="btn btn-ghost btn-sm" href="/masuk">Masuk</Link>
                <Link className="btn btn-primary btn-sm hide-m" href="/daftar">Daftar</Link>
              </div>
            )}
          </div>
        </div>
      </header>
      {menu ? <MobileDrawer me={me} onClose={closeMenu} /> : null}
    </>
  );
}
