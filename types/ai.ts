import type { MaterialKey, PlaceholderKind } from './product';

/* ---------- AI Assistant ---------- */
export type ChatMode = 'shop' | 'upcycle';
export type ChatChip = string | { label: string; go: string };

export interface GuideIdea {
  name: string;
  meta: string;
  steps: string[];
}

export type ChatMessage =
  | { role: 'user'; text: string }
  | {
      role: 'ai';
      kind: 'text' | 'clarify' | 'guide' | 'products' | 'compare' | 'error';
      paras?: string[];
      chips?: ChatChip[];
      title?: string;
      ideas?: GuideIdea[];
      safety?: string;
      ids?: string[];
      reasons?: Record<string, string[]>;
      errText?: string;
      retryText?: string;
    };

export type AiMessage = Extract<ChatMessage, { role: 'ai' }>;

export interface Conversation {
  title: string;
  sub: string;
  mode: ChatMode;
  msgs: ChatMessage[];
}

/** Konteks percakapan belanja (untuk "yang lebih murah", "pilihan lain"). */
export interface ShopContext {
  budget?: number;
  mats?: MaterialKey[];
  types?: string[];
  words?: string[];
  gift?: boolean;
  lastIds?: string[];
  awaiting?: 'gift' | null;
}

export interface AssistantReply {
  msg: AiMessage;
  ctx?: ShopContext;
}

/* ---------- AI Sortir ---------- */
export type ScenarioKey = 'jeans' | 'bottle' | 'chair';
export type SampleKey = ScenarioKey | 'blurry' | 'screen' | 'error';
export type ActionKey = 'diy' | 'repair' | 'sell' | 'creator' | 'recycle';

export interface SortirSample {
  label: string;
  note: string;
  img?: string;
  ph?: PlaceholderKind;
  blur?: boolean;
}

export interface SortirIdea {
  name: string;
  out: string;
  diff: string;
  diffN: number;
  tools: string;
  cost: string;
  time: string;
  steps: string[];
  rel: string;
}

export interface SortirScenario {
  item: string;
  cat: string;
  catLabel: string;
  sub: string;
  comp: string;
  cond: string[];
  reuse: string;
  conf: number;
  confLabel: string;
  confNote: string;
  warnings: string[];
  mat: MaterialKey;
  rec: ActionKey;
  /** [tag, alasan]; tag: 'rec' (disarankan), 'caution' (perlu hati-hati), '' */
  actions: Record<ActionKey, [string, string]>;
  ideas: SortirIdea[];
  similar: string[];
  creators: string[];
  sellMat: string;
  sellDraft: string;
  tags: string[];
}

export type SortirSource =
  | { kind: 'sample'; key: SampleKey }
  | { kind: 'upload'; url: string; name: string }
  | { kind: 'manual'; text: string };

export type SortirOutcome =
  | { status: 'done'; scen: ScenarioKey | null; low: boolean }
  | { status: 'unsupported' }
  | { status: 'error' }
  /** Foto unggahan sungguhan tidak dianalisis di versi ini — pengguna memilih jenis barang. */
  | { status: 'uploadChoice' };

/* ---------- Asisten listing ---------- */
export interface ClaimFlag {
  phrase: string;
  why: string;
}

export interface TitleSuggestion {
  titles: string[];
  recCat: string;
  tags: string[];
}

export interface PriceReference {
  has: boolean;
  n: number;
  range: string;
  median: string;
}
