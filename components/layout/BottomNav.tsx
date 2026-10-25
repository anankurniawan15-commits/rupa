'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon, type IconName } from '@/components/ui/Icon';
import { isCurrent, isNavOn, NO_BNAV, startsWithAny, type NavKey } from './nav';
import { cx } from '@/lib/format';

const ITEMS: [NavKey, string, string, IconName][] = [
  ['home', '/', 'Beranda', 'home'],
  ['explore', '/jelajahi', 'Jelajahi', 'search'],
  ['sortir', '/sortir', 'Sortir AI', 'scan'],
  ['sell', '/jual', 'Jual', 'store'],
  ['profile', '/profil', 'Akun', 'user'],
];

/** Navigasi bawah mobile (≤760 px), disembunyikan di checkout & pembayaran. */
export function BottomNav() {
  const pathname = usePathname();
  if (startsWithAny(pathname, NO_BNAV)) return null;
  return (
    <nav className="bnav" aria-label="Navigasi bawah">
      {ITEMS.map(([k, href, label, icon]) => (
        <Link key={k} href={href} className={cx(isNavOn(k, pathname) && 'is-on')} aria-current={isCurrent(href, pathname) ? 'page' : undefined}>
          <Icon name={icon} />
          {label}
        </Link>
      ))}
    </nav>
  );
}
