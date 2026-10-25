'use client';
import { useCallback } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * Tab aktif disimpan di `?tab=` (mendukung tautan langsung, mis. /dashboard?tab=listings).
 * Mengganti tab memakai history.replaceState — terintegrasi dengan router Next tanpa
 * perjalanan ke server.
 */
export function useUrlTab<K extends string>(keys: readonly K[], fallback: K): [K, (k: K) => void] {
  const sp = useSearchParams();
  const pathname = usePathname();
  const raw = sp.get('tab') as K | null;
  const tab = raw && keys.indexOf(raw) >= 0 ? raw : fallback;
  const setTab = useCallback((k: K) => {
    const p = new URLSearchParams(sp.toString());
    if (k === fallback) p.delete('tab'); else p.set('tab', k);
    const qs = p.toString();
    window.history.replaceState(null, '', pathname + (qs ? '?' + qs : ''));
  }, [sp, pathname, fallback]);
  return [tab, setTab];
}
