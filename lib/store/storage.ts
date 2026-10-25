import { createJSONStorage } from 'zustand/middleware';

/**
 * localStorage aman untuk SSR. Semua store persisted memakai `skipHydration: true`
 * lalu di-rehydrate oleh <StoreHydrator /> setelah mount, supaya render server dan
 * render pertama klien sama (tidak ada hydration mismatch).
 */
export const safeStorage = createJSONStorage(() => {
  if (typeof window === 'undefined') {
    return { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  }
  return window.localStorage;
});
