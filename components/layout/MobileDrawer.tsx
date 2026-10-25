'use client';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { Icon } from '@/components/ui/Icon';
import { BrandMark } from './Brand';
import { accountLinks, accountSub, useLogout } from './ProfileMenu';
import { useWishIds } from '@/lib/services/cart.service';
import type { Account } from '@/types/user';

export function MobileDrawer({ me, onClose }: { me: Account | null; onClose: () => void }) {
  const ref = useRef<HTMLElement>(null);
  const logout = useLogout();
  const wishCount = useWishIds().length;

  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>('button, a')?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); trigger?.focus(); };
  }, [onClose]);

  return (
    <>
      <div className="drawer-ov" onClick={onClose} />
      <nav className="drawer" aria-label="Menu" ref={ref}>
        <div className="row between center" style={{ marginBottom: 8 }}>
          <span className="row gap-8 center"><BrandMark /></span>
          <button type="button" className="iconbtn" onClick={onClose} aria-label="Tutup menu"><Icon name="close" /></button>
        </div>
        <Link className="dl" href="/" onClick={onClose}>Beranda</Link>
        <Link className="dl" href="/jelajahi" onClick={onClose}>Jelajahi Produk</Link>
        <Link className="dl" href="/sortir" onClick={onClose}>Sortir dengan AI</Link>
        <Link className="dl" href="/assistant" onClick={onClose}>AI Assistant</Link>
        <Link className="dl" href="/jual" onClick={onClose}>Jual Produk</Link>
        <hr />
        {!me ? (
          <div className="col gap-8" style={{ padding: '8px 4px' }}>
            <Link className="btn btn-primary w100" href="/masuk" onClick={onClose}>Masuk</Link>
            <Link className="btn btn-secondary w100" href="/daftar" onClick={onClose}>Daftar akun baru</Link>
          </div>
        ) : (
          <>
            <div className="col" style={{ padding: '4px 12px 8px' }}><b>{me.name}</b><span className="fine">{accountSub(me)}</span></div>
            {accountLinks(me).filter((l) => l.href !== '/assistant').map((l) => (
              <Link key={l.href} className="dl" href={l.href} onClick={onClose}>
                {l.href === '/wishlist' ? 'Wishlist (' + wishCount + ')' : l.label}
              </Link>
            ))}
            <button type="button" className="dl" onClick={() => { onClose(); logout(); }}>Keluar</button>
          </>
        )}
      </nav>
    </>
  );
}
