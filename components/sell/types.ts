import type { ListingDraft } from '@/types/product';

/** State UI halaman Jual (di luar draf listing yang diterbitkan). */
export interface SellUi {
  step: number;
  titleSugs: string[];
  titleLoading: boolean;
  recCat: string;
  tagSugs: string[];
  tagInput: string;
  descLoading: boolean;
  calcMat: string;
  calcHours: string;
  calcRate: string;
  errors: Record<string, string>;
}

export type SetForm = (patch: Partial<ListingDraft> | ((f: ListingDraft) => Partial<ListingDraft>)) => void;
export type SetUi = (patch: Partial<SellUi> | ((u: SellUi) => Partial<SellUi>)) => void;

export interface StepProps {
  form: ListingDraft;
  ui: SellUi;
  setForm: SetForm;
  setUi: SetUi;
  /** Ubah isian draf sekaligus hapus galat field tersebut. */
  setField: <K extends keyof ListingDraft>(k: K, v: ListingDraft[K]) => void;
}
