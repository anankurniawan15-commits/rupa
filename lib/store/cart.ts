'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { safeStorage } from './storage';
import { SEED_CART } from '@/lib/data';
import type { CartItem } from '@/types/order';

interface CartState {
  items: CartItem[];
  setItems: (items: CartItem[]) => void;
}

/** Isi keranjang (persisted). Logika stok & pengelompokan ada di cart.service.ts. */
export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: SEED_CART,
      setItems: (items) => set({ items }),
    }),
    { name: 'rupa-cart', storage: safeStorage, skipHydration: true },
  ),
);
