'use client';
/**
 * AssistantService — AI Assistant. Balasan dari route handler POST /api/assistant
 * (Groq + pencarian katalog deterministik; server jatuh ke mesin aturan kalau Groq tidak tersedia).
 * Bentuk balasan (AssistantReply) tetap sama sehingga UI tidak berubah.
 * TODO(Supabase): riwayat percakapan masih di localStorage (store chat); nanti tabel
 * `assistant_sessions` / `assistant_messages` untuk pengguna yang masuk.
 */
import { useChat, chatSeed } from '@/lib/store/chat';
import { db } from '@/lib/store/db';
import { toast } from '@/lib/store/toast';
import { SUGGESTIONS, compareRows } from '@/lib/ai/assistant-engine';
import { MAX_HISTORY, MAX_TEXT } from '@/lib/ai/assistant-schema';
import type { AiMessage, AssistantReply, ChatMessage, ChatMode, ShopContext } from '@/types/ai';

export { SUGGESTIONS, compareRows };

const S = () => useChat.getState();

/** Server menjawab ≤ 10 detik; ini batas aman kalau jaringan macet. */
const CLIENT_TIMEOUT_MS = 12_000;
const ERR_NETWORK = 'Asisten belum bisa menjawab. Periksa koneksimu lalu coba lagi.';
const ERR_CANCELLED = 'Jawaban dibatalkan karena percakapan ditutup atau diganti.';

/** Satu permintaan aktif sekaligus; `conv` = percakapan asal supaya jawaban tidak salah tempat. */
let inflight: { ctrl: AbortController; conv: string; text: string } | null = null;

const subOf = (mode: ChatMode) => (mode === 'shop' ? 'Belanja dengan AI' : 'Konsultasi upcycle');
const errorMsg = (text: string, errText: string): AiMessage => ({ role: 'ai', kind: 'error', errText, retryText: text });

/** Tambahkan pesan AI ke percakapan `conv` (bukan s.cur — pengguna mungkin sudah pindah). */
function appendTo(conv: string, msg: AiMessage, ctx?: ShopContext) {
  S().patch((s) => {
    const cv = s.convs[conv];
    if (!cv) return { typing: false };
    return { convs: { ...s.convs, [conv]: { ...cv, msgs: [...cv.msgs, msg] } }, typing: false, ...(ctx && s.cur === conv ? { ctx } : {}) };
  });
}

/** Batalkan permintaan berjalan; percakapan asalnya mendapat pesan galat + "Coba lagi" agar tidak menggantung. */
function cancelInflight() {
  const cur = inflight;
  if (!cur) return;
  inflight = null;
  cur.ctrl.abort();
  appendTo(cur.conv, errorMsg(cur.text, ERR_CANCELLED));
}

/** Riwayat singkat untuk konteks LLM: pesan sebelum pesan terakhir pengguna, tanpa pesan galat. */
function historyOf(msgs: ChatMessage[]) {
  const prior = msgs.length && msgs[msgs.length - 1].role === 'user' ? msgs.slice(0, -1) : msgs;
  return prior
    .filter((m) => m.role === 'user' || m.kind !== 'error')
    .slice(-MAX_HISTORY)
    .map((m) => ({ role: m.role, text: (m.role === 'user' ? m.text : (m.paras || []).join(' ') || m.title || '').slice(0, MAX_TEXT) }));
}

const isReply = (v: unknown): v is AssistantReply =>
  typeof v === 'object' && v !== null && 'msg' in v && typeof v.msg === 'object' && v.msg !== null && 'kind' in v.msg;

async function requestReply(body: unknown, signal: AbortSignal): Promise<AssistantReply> {
  const res = await fetch('/api/assistant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal });
  const json: unknown = await res.json().catch(() => null);
  // 400/429 juga berbentuk AssistantReply (kind 'error') dengan pesan yang aman ditampilkan.
  if (isReply(json)) return json;
  throw new Error('assistant_http_' + res.status);
}

export const assistantService = {
  /** Kirim pesan pengguna lalu tambahkan balasan AI. */
  async send(text: string): Promise<void> {
    text = (text || '').trim();
    const c0 = S();
    if (!text || c0.typing) return;
    S().patch((c) => {
      const convs = { ...c.convs };
      let cur = c.cur;
      let order = c.order;
      let seq = c.seq;
      if (cur === 'new') {
        const id = 'c' + c.seq;
        convs[id] = { title: text.length > 36 ? text.slice(0, 34) + '…' : text, sub: subOf(c.mode), mode: c.mode, msgs: [] };
        convs.new = { title: 'Percakapan baru', sub: '', mode: c.mode, msgs: [] };
        cur = id;
        order = [id, ...order];
        seq += 1;
      }
      convs[cur] = { ...convs[cur], msgs: [...convs[cur].msgs, { role: 'user', text }] };
      return { convs, cur, order, seq, input: '', typing: true };
    });
    if (text.length > MAX_TEXT) {
      appendTo(S().cur, { role: 'ai', kind: 'clarify', paras: ['Pesanmu terlalu panjang. Ringkas jadi maksimal ' + MAX_TEXT + ' karakter, ya.'] });
      return;
    }
    await assistantService.reply(text);
  },

  /** Minta balasan ke /api/assistant untuk percakapan aktif. Jawaban yang terlambat/dibatalkan dibuang. */
  async reply(text: string): Promise<void> {
    const c = S();
    const conv = c.cur;
    const ctrl = new AbortController();
    inflight = { ctrl, conv, text };
    const timer = setTimeout(() => ctrl.abort(), CLIENT_TIMEOUT_MS);
    const body = { mode: c.mode, text, history: historyOf(c.convs[conv]?.msgs || []), ctx: c.ctx, compare: c.compare, hidden: db().hidden };
    let res: AssistantReply;
    try {
      res = await requestReply(body, ctrl.signal);
    } catch {
      res = { msg: errorMsg(text, ERR_NETWORK) };
    } finally {
      clearTimeout(timer);
    }
    // Dibatalkan pengguna (ganti percakapan/mode, tutup panel) → sudah ditangani cancelInflight.
    if (inflight?.ctrl !== ctrl) return;
    inflight = null;
    appendTo(conv, res.msg.kind === 'error' ? { ...res.msg, retryText: text } : res.msg, res.ctx);
  },

  /** "Coba lagi" pada pesan galat. */
  async retry(index: number): Promise<void> {
    const c = S();
    const conv = c.convs[c.cur];
    const m = conv.msgs[index];
    if (c.typing || !m || m.role !== 'ai' || !m.retryText) return;
    const text = m.retryText;
    S().patch((s) => {
      const cv = s.convs[s.cur];
      return { typing: true, convs: { ...s.convs, [s.cur]: { ...cv, sub: subOf(cv.mode), msgs: cv.msgs.filter((_, i) => i !== index) } } };
    });
    await assistantService.reply(text);
  },

  setMode(mode: ChatMode) {
    if (mode === S().mode) return;
    cancelInflight();
    S().patch((c) => ({ mode, convs: c.cur === 'new' ? { ...c.convs, new: { ...c.convs.new, mode } } : c.convs }));
  },
  openConversation(id: string) {
    const conv = S().convs[id];
    if (!conv || id === S().cur) return;
    cancelInflight();
    S().patch({ cur: id, mode: conv.mode, ctx: {}, compare: [] });
  },
  newConversation() {
    cancelInflight();
    S().patch({ cur: 'new', ctx: {}, compare: [], input: '' });
  },
  /** Maks. 3 produk untuk dibandingkan. */
  toggleCompare(id: string) {
    const list = S().compare;
    if (list.indexOf(id) >= 0) return S().patch({ compare: list.filter((x) => x !== id) });
    if (list.length >= 3) return toast('Maksimal 3 produk untuk dibandingkan', { kind: 'warn' });
    S().patch({ compare: [...list, id] });
  },
  clearCompare() {
    S().patch({ compare: [] });
  },
  openPanel(open = true) {
    // Panel juga ditutup saat pindah ke /assistant ("Buka layar penuh"); di sana percakapan tetap
    // terlihat, jadi jawaban yang ditunggu tidak dibatalkan.
    if (!open && window.location.pathname !== '/assistant') cancelInflight();
    S().patch({ panel: open });
  },
  /** Buka panel dan (opsional) kirim pertanyaan — dipakai kotak "Tanya AI Assistant" di Jelajahi. */
  ask(text?: string) {
    S().patch({ panel: true, mode: 'shop' });
    if (text) setTimeout(() => void assistantService.send(text), 50);
  },
  /** Privasi: hapus semua riwayat. */
  clearHistory() {
    cancelInflight();
    const seed = chatSeed();
    S().patch((c) => ({ ...seed, order: [], convs: { new: seed.convs.new }, mode: c.mode, ctx: {}, compare: [] }));
  },
};
