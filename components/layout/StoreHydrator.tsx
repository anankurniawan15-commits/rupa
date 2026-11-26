'use client';
import { useEffect } from 'react';
import { rehydrateAll } from '@/lib/store';
import { useSession } from '@/lib/store/session';
import { db } from '@/lib/store/db';

/**
 * Membaca store persisted dari localStorage setelah mount (hindari hydration mismatch),
 * lalu menyamakan cookie sesi (dibaca proxy.ts) dengan isi store.
 */
export function StoreHydrator() {
  useEffect(() => {
    void rehydrateAll().then(() => {
      const { userId, setUser } = useSession.getState();
      const acc = userId ? db().accounts.find((a) => a.id === userId) : null;
      setUser(acc ? acc.id : null, acc?.role);
    });
  }, []);
  return null;
}
