'use client';
import { create } from 'zustand';
import type { ListingDraft } from '@/types/product';

export const sellInit = (): ListingDraft => ({
  photos: [], draft: '', title: '', cat: '', matOrigin: '', tags: [], cond: '', dims: '', weight: '',
  process: '', desc: '', keywords: [], price: '', stock: '1', city: 'Bandung', procTime: '1–2 hari kerja',
  ships: { reg: true, exp: false, cargo: false, pickup: false }, editId: null,
});

interface SellState {
  /** Draf yang akan dimuat halaman /jual (dari AI Sortir "Jual Material" atau Edit di dashboard). */
  seed: ListingDraft | null;
  setSeed: (d: ListingDraft | null) => void;
}

/** Penghubung antarhalaman untuk draf listing (tidak dipersist). */
export const useSell = create<SellState>()((set) => ({
  seed: null,
  setSeed: (seed) => set({ seed }),
}));
