'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { safeStorage } from './storage';
import { SEED_CONVERSATIONS } from '@/lib/data';
import type { ChatMode, Conversation, ShopContext } from '@/types/ai';

export interface ChatState {
  cur: string;
  mode: ChatMode;
  seq: number;
  order: string[];
  convs: Record<string, Conversation>;
  /* tidak dipersist */
  input: string;
  typing: boolean;
  /** Panel melayang terbuka. */
  panel: boolean;
  compare: string[];
  ctx: ShopContext;
  patch: (p: Partial<ChatState> | ((s: ChatState) => Partial<ChatState>)) => void;
}

export const chatSeed = () => ({
  cur: 'new',
  mode: 'shop' as ChatMode,
  seq: 4,
  order: ['c1', 'c2', 'c3'],
  convs: structuredClone(SEED_CONVERSATIONS),
});

/** Riwayat chat AI Assistant (persisted). Logika balasan di assistant.service.ts. */
export const useChat = create<ChatState>()(
  persist(
    (set) => ({
      ...chatSeed(),
      input: '',
      typing: false,
      panel: false,
      compare: [],
      ctx: {},
      patch: (p) => set((s) => (typeof p === 'function' ? p(s) : p)),
    }),
    {
      name: 'rupa-chat',
      storage: safeStorage,
      skipHydration: true,
      partialize: (s) => ({ cur: s.cur, mode: s.mode, seq: s.seq, order: s.order, convs: s.convs }),
    },
  ),
);
