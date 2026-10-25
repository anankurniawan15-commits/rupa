'use client';
/**
 * AssistantService — AI Assistant (aturan lokal, bukan LLM).
 * TODO(Groq): reply() → route handler POST /api/assistant: parseIntent → searchCatalog (Supabase)
 * → explain (Groq chat). Bentuk balasan (AssistantReply) tetap sama sehingga UI tidak berubah.
 */
import { useChat, chatSeed } from '@/lib/store/chat';
import { db } from '@/lib/store/db';
import { toast } from '@/lib/store/toast';
import { respond, SUGGESTIONS, compareRows } from '@/lib/ai/assistant-engine';
import { delay } from './util';
import type { ChatMode } from '@/types/ai';

export { SUGGESTIONS, compareRows };

const S = () => useChat.getState();

export const assistantService = {
  /** Kirim pesan pengguna lalu tambahkan balasan AI setelah jeda mengetik. */
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
        convs[id] = { title: text.length > 36 ? text.slice(0, 34) + '…' : text, sub: c.mode === 'shop' ? 'Belanja dengan AI' : 'Konsultasi upcycle', mode: c.mode, msgs: [] };
        convs.new = { title: 'Percakapan baru', sub: '', mode: c.mode, msgs: [] };
        cur = id;
        order = [id, ...order];
        seq += 1;
      }
      convs[cur] = { ...convs[cur], msgs: [...convs[cur].msgs, { role: 'user', text }] };
      return { convs, cur, order, seq, input: '', typing: true };
    });
    await delay(900 + Math.min(700, text.length * 10));
    assistantService.reply(text);
  },

  reply(text: string) {
    const c = S();
    const res = respond(text, { mode: c.mode, ctx: c.ctx, compare: c.compare, hidden: db().hidden });
    S().patch((s) => {
      const conv = s.convs[s.cur];
      return { convs: { ...s.convs, [s.cur]: { ...conv, msgs: [...conv.msgs, res.msg] } }, typing: false, ctx: res.ctx || s.ctx };
    });
  },

  /** "Coba lagi" pada pesan galat. */
  async retry(index: number): Promise<void> {
    const c = S();
    const conv = c.convs[c.cur];
    const m = conv.msgs[index];
    if (!m || m.role !== 'ai' || !m.retryText) return;
    const text = m.retryText;
    S().patch((s) => {
      const cv = s.convs[s.cur];
      return { typing: true, convs: { ...s.convs, [s.cur]: { ...cv, sub: cv.mode === 'shop' ? 'Belanja dengan AI' : 'Konsultasi upcycle', msgs: cv.msgs.filter((_, i) => i !== index) } } };
    });
    await delay(1000);
    assistantService.reply(text);
  },

  setMode(mode: ChatMode) {
    S().patch((c) => ({ mode, convs: c.cur === 'new' ? { ...c.convs, new: { ...c.convs.new, mode } } : c.convs }));
  },
  openConversation(id: string) {
    const conv = S().convs[id];
    if (conv) S().patch({ cur: id, mode: conv.mode, ctx: {}, compare: [] });
  },
  newConversation() {
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
    S().patch({ panel: open });
  },
  /** Buka panel dan (opsional) kirim pertanyaan — dipakai kotak "Tanya AI Assistant" di Jelajahi. */
  ask(text?: string) {
    S().patch({ panel: true, mode: 'shop' });
    if (text) setTimeout(() => void assistantService.send(text), 50);
  },
  /** Privasi: hapus semua riwayat. */
  clearHistory() {
    const seed = chatSeed();
    S().patch((c) => ({ ...seed, order: [], convs: { new: seed.convs.new }, mode: c.mode, ctx: {}, compare: [] }));
  },
};
