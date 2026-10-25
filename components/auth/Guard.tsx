'use client';
import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useHydrated } from '@/lib/store';
import { authService, useCurrentUser } from '@/lib/services/auth.service';
import { toast } from '@/lib/store/toast';
import { Skeleton } from '@/components/ui/Boxes';
import type { Account } from '@/types/user';

type Need = 'user' | 'admin' | 'seller' | 'shopless';

/**
 * Penjaga halaman di sisi klien (pelengkap proxy.ts yang membaca cookie).
 *  - user:     harus masuk
 *  - admin:    harus role admin ("Halaman ini khusus admin")
 *  - seller:   harus punya toko; admin ditolak; tanpa toko → /buka-toko
 *  - shopless: untuk /buka-toko; admin ditolak; sudah punya toko → /dashboard
 * Selama store belum terhidrasi tampil skeleton.
 */
export function Guard({ need, children, allowWithShop }: { need: Need; children: (me: Account) => ReactNode; allowWithShop?: boolean }) {
  const hydrated = useHydrated();
  const me = useCurrentUser();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const verdict: 'wait' | 'ok' | 'login' | 'notAdmin' | 'admin' | 'noShop' | 'hasShop' = !hydrated
    ? 'wait'
    : !me
      ? 'login'
      : need === 'admin' && me.role !== 'admin'
        ? 'notAdmin'
        : (need === 'seller' || need === 'shopless') && me.role === 'admin'
          ? 'admin'
          : need === 'seller' && !me.shop
            ? 'noShop'
            : need === 'shopless' && me.shop && !allowWithShop
              ? 'hasShop'
              : 'ok';

  useEffect(() => {
    const here = pathname + (sp.toString() ? '?' + sp.toString() : '');
    if (verdict === 'login') router.replace(authService.justLoggedOut() ? '/' : '/masuk?next=' + encodeURIComponent(here));
    if (verdict === 'notAdmin') { toast('Halaman ini khusus admin', { kind: 'warn' }); router.replace('/'); }
    if (verdict === 'admin') { toast('Akun admin tidak bisa berjualan. Masuk dengan akun pengguna.', { kind: 'warn' }); router.replace('/admin'); }
    if (verdict === 'noShop') { toast('Buka toko dulu untuk mulai berjualan — hanya tiga langkah', { kind: 'info' }); router.replace('/buka-toko'); }
    if (verdict === 'hasShop') router.replace('/dashboard');
  }, [verdict, router, pathname, sp]);

  if (verdict !== 'ok' || !me) {
    return (
      <div className="page wrap col gap-16" aria-busy="true" aria-label="Memuat">
        <Skeleton w="40%" h={36} />
        <Skeleton w="70%" />
        <Skeleton w="100%" h={240} />
      </div>
    );
  }
  return <>{children(me)}</>;
}
