'use client';
import { create } from 'zustand';

export type ToastKind = 'ok' | 'warn' | 'info';

export interface ToastData {
  id: number;
  msg: string;
  kind: ToastKind;
  actionLabel?: string;
  /** Aksi tombol toast (Urungkan / Lihat). Bisa berupa fungsi atau href. */
  action?: (() => void) | null;
  href?: string;
}

interface ToastState {
  toast: ToastData | null;
  show: (msg: string, o?: { kind?: ToastKind; actionLabel?: string; action?: () => void; href?: string; ms?: number }) => void;
  clear: () => void;
}

let timer: ReturnType<typeof setTimeout> | undefined;
let seq = 0;

export const useToast = create<ToastState>()((set) => ({
  toast: null,
  show: (msg, o = {}) => {
    clearTimeout(timer);
    seq += 1;
    set({ toast: { id: seq, msg, kind: o.kind || 'ok', actionLabel: o.actionLabel, action: o.action || null, href: o.href } });
    timer = setTimeout(() => set({ toast: null }), o.ms || 4500);
  },
  clear: () => {
    clearTimeout(timer);
    set({ toast: null });
  },
}));

/** Pemakaian di luar komponen: toast('Disimpan', { kind: 'info' }). */
export const toast = (...args: Parameters<ToastState['show']>) => useToast.getState().show(...args);
