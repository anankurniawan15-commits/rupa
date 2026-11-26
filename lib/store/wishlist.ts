'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { safeStorage } from './storage';
import { SEED_WISH } from '@/lib/data';

interface WishState {
  ids: string[];
  setIds: (ids: string[]) => void;
}

export const useWishlist = create<WishState>()(
  persist(
    (set) => ({
      ids: SEED_WISH,
      setIds: (ids) => set({ ids }),
    }),
    { name: 'rupa-wishlist', storage: safeStorage, skipHydration: true },
  ),
);
