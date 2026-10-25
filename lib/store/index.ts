'use client';
import { useEffect, useSyncExternalStore } from 'react';
import { useSession } from './session';
import { useCart } from './cart';
import { useWishlist } from './wishlist';
import { useChat } from './chat';
import { useSortir } from './sortir';
import { useDb } from './db';

export { useSession } from './session';
export { useCart } from './cart';
export { useWishlist } from './wishlist';
export { useChat } from './chat';
export { useSortir } from './sortir';
export { useDb } from './db';
export { useToast, toast } from './toast';
export { useSell } from './sell';

const persisted = [useSession, useCart, useWishlist, useChat, useSortir, useDb];

let hydrated = false;
const listeners = new Set<() => void>();

/** Dipanggil sekali oleh <StoreHydrator /> di layout. */
export async function rehydrateAll() {
  if (hydrated) return;
  await Promise.all(persisted.map((s) => s.persist.rehydrate()));
  hydrated = true;
  listeners.forEach((l) => l());
}

/** true setelah semua store membaca localStorage. Sebelum itu tampilkan keadaan netral/skeleton. */
export function useHydrated() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => hydrated,
    () => false,
  );
}

export function useRehydrateOnMount() {
  useEffect(() => {
    void rehydrateAll();
  }, []);
}
