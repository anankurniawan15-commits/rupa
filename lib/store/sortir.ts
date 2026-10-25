'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { safeStorage } from './storage';
import { SEED_PROFILE } from '@/lib/data';
import type { ActionKey, ScenarioKey, SortirSource } from '@/types/ai';
import type { SavedAnalysis } from '@/types/user';

export type SortirStatus = 'idle' | 'preview' | 'loading' | 'unsupported' | 'error' | 'uploadChoice' | 'done';

export interface SortirFlow {
  step: number;
  maxStep: number;
  status: SortirStatus;
  src: SortirSource | null;
  scen: ScenarioKey | null;
  low: boolean;
  /** Material dipilih manual oleh pengguna (bukan hasil analisis). */
  picked: boolean;
  fileErr: string;
  manual: string;
  manualErr: string;
  loadIdx: number;
  action: ActionKey | null;
  openIdea: number;
  correcting: boolean;
}

export const sortirInit = (): SortirFlow => ({
  step: 1, maxStep: 1, status: 'idle', src: null, scen: null, low: false, picked: false,
  fileErr: '', manual: '', manualErr: '', loadIdx: 0, action: null, openIdea: 0, correcting: false,
});

interface SortirState {
  flow: SortirFlow;
  /** Hasil tersimpan (tanpa foto) — persisted. */
  saved: SavedAnalysis[];
  setFlow: (p: Partial<SortirFlow> | ((f: SortirFlow) => Partial<SortirFlow>)) => void;
  resetFlow: (keep?: Partial<SortirFlow>) => void;
  setSaved: (saved: SavedAnalysis[]) => void;
}

export const useSortir = create<SortirState>()(
  persist(
    (set) => ({
      flow: sortirInit(),
      saved: SEED_PROFILE.saved,
      setFlow: (p) => set((s) => ({ flow: { ...s.flow, ...(typeof p === 'function' ? p(s.flow) : p) } })),
      resetFlow: (keep) => set({ flow: { ...sortirInit(), ...keep } }),
      setSaved: (saved) => set({ saved }),
    }),
    { name: 'rupa-sortir', storage: safeStorage, skipHydration: true, partialize: (s) => ({ saved: s.saved }) },
  ),
);
