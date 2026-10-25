/**
 * STUB — belum dipakai. Client Groq hanya boleh dipanggil di server (route handler),
 * karena GROQ_API_KEY rahasia.
 *
 * Dipakai nanti oleh:
 *  - assistant.service  → chat(messages)
 *  - sortir.service     → vision(image, prompt)
 *  - listing-assist     → chat(messages)
 */
export interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export const groq = {
  async chat(_messages: GroqMessage[]): Promise<string> {
    if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY belum diisi. Fase ini memakai mesin aturan di lib/ai.');
    throw new Error('Stub: panggil https://api.groq.com/openai/v1/chat/completions dari route handler.');
  },
  async vision(_imageBase64: string, _prompt: string): Promise<string> {
    if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY belum diisi. Fase ini tidak menganalisis foto sungguhan.');
    throw new Error('Stub: kirim gambar ke model vision Groq dari route handler.');
  },
};
