'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon, type IconName } from '@/components/ui/Icon';
import { authService } from '@/lib/services/auth.service';
import { toast } from '@/lib/store/toast';
import { initialsOf } from '@/lib/format';
import type { Account } from '@/types/user';

export function accountSub(me: Account) {
  return me.role === 'admin' ? 'Admin · ' + me.email : me.shop ? me.shop.name + ' · ' + me.email : me.email;
}

/** Item menu akun — dipakai juga oleh MobileDrawer. */
export function accountLinks(me: Account): { href: string; label: string; icon: IconName }[] {
  const out: { href: string; label: string; icon: IconName }[] = [];
  if (me.role === 'admin') out.push({ href: '/admin', label: 'Panel Admin', icon: 'shieldCheck' });
  out.push({ href: '/pesanan', label: 'Pesanan Saya', icon: 'box' });
  out.push({ href: '/wishlist', label: 'Wishlist', icon: 'heart' });
  if (me.shop) out.push({ href: '/dashboard', label: 'Dashboard Penjual', icon: 'store' });
  else if (me.role !== 'admin') out.push({ href: '/buka-toko', label: 'Buka Toko', icon: 'storePlus' });
  out.push({ href: '/assistant', label: 'AI Assistant', icon: 'chat' });
  out.push({ href: '/profil', label: 'Profil dan Pengaturan', icon: 'user' });
  return out;
}

export function useLogout() {
  const router = useRouter();
  return () => {
    authService.logout();
    router.push('/');
    toast('Kamu sudah keluar dari akun', { kind: 'info' });
  };
}

export function ProfileMenu({ me }: { me: Account }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const logout = useLogout();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <div className="pmenu hide-m" ref={ref}>
      <button type="button" className="avatar-btn" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="menu" aria-label={'Menu akun ' + me.name}>
        {initialsOf(me.name)}
      </button>
      {open ? (
        <div className="pmenu-pop" role="menu" aria-label="Menu akun">
          <div className="pm-head"><b>{me.name}</b><span className="fine">{accountSub(me)}</span></div>
          {accountLinks(me).map((l) => (
            <Link key={l.href} href={l.href} role="menuitem" onClick={() => setOpen(false)}>
              <Icon name={l.icon} />{l.label}
            </Link>
          ))}
          <button type="button" role="menuitem" onClick={() => { setOpen(false); logout(); }}>
            <Icon name="logout" />Keluar
          </button>
        </div>
      ) : null}
    </div>
  );
}
