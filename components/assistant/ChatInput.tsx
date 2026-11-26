'use client';
import type { FormEvent } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useChat } from '@/lib/store';
import { assistantService } from '@/lib/services/assistant.service';
import type { ChatMode } from '@/types/ai';

export const CHAT_INPUT_ID = 'chat-input';

/** Kolom pesan; tombol kirim nonaktif saat kosong atau asisten sedang menulis. */
export function ChatInput({ mode }: { mode: ChatMode }) {
  const input = useChat((s) => s.input);
  const typing = useChat((s) => s.typing);
  const patch = useChat((s) => s.patch);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    void assistantService.send(input);
  };
  return (
    <form className="as-input" onSubmit={submit}>
      <label htmlFor={CHAT_INPUT_ID} className="sr">Tulis pesan untuk asisten</label>
      <input
        id={CHAT_INPUT_ID}
        className="input"
        value={input}
        onChange={(e) => patch({ input: e.target.value })}
        placeholder={mode === 'shop' ? 'Contoh: tas denim di bawah Rp150.000' : 'Contoh: apa yang bisa dibuat dari kaleng bekas?'}
        autoComplete="off"
      />
      <button className="btn btn-primary" type="submit" disabled={!input.trim() || typing} aria-label="Kirim pesan"><Icon name="send" /></button>
    </form>
  );
}
