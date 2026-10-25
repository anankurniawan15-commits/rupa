'use client';
import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { toast } from '@/lib/store/toast';

/** Menampilkan toast dari parameter yang dipasang proxy.ts (mis. ?ditolak=admin), lalu membersihkan URL. */
export function RouteNotice() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const denied = sp.get('ditolak');
  useEffect(() => {
    if (denied === 'admin') {
      toast('Halaman ini khusus admin', { kind: 'warn' });
      router.replace(pathname);
    }
  }, [denied, router, pathname]);
  return null;
}
