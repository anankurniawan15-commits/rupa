import { expect, test } from '@playwright/test';
import { EVAL_CASES } from '../eval-cases';
import { PRODUCTS } from '@/lib/data';
import type { AssistantReply, ShopContext } from '@/types/ai';

/**
 * Evaluasi live terhadap Groq sungguhan — TIDAK jalan di `npm test` biasa.
 * Jalankan: ASSISTANT_EVAL=1 npx playwright test --project=api eval   (butuh GROQ_API_KEY di .env.local)
 * Antar-giliran diberi jeda supaya tidak menabrak batas token per menit Groq (paket gratis 8K TPM);
 * kalau tertabrak, jawabannya dari mesin aturan dan evaluasi tidak lagi menilai LLM.
 */
test.skip(!process.env.ASSISTANT_EVAL, 'Set ASSISTANT_EVAL=1 untuk evaluasi live (memanggil Groq).');

const GAP_MS = Number(process.env.ASSISTANT_EVAL_GAP_MS ?? 15_000);
const TURN_BUDGET_MS = 15_000;

const byId = (id: string) => PRODUCTS.find((p) => p.id === id);
const textOf = (r: AssistantReply) => JSON.stringify([r.msg.paras, r.msg.reasons, r.msg.title, r.msg.ideas, r.msg.safety, r.msg.errText]);

for (const c of EVAL_CASES) {
  test(c.name, async ({ request }, info) => {
    test.setTimeout(c.turns.length * (GAP_MS + TURN_BUDGET_MS));
    const ip = 'eval-' + Date.now() + '-' + info.testId;
    let ctx: ShopContext = {};
    let lastIds: string[] = [];
    const history: { role: 'user' | 'ai'; text: string }[] = [];
    for (const turn of c.turns) {
      await new Promise((resolve) => setTimeout(resolve, GAP_MS));
      const t0 = Date.now();
      const res = await request.post('/api/assistant', {
        headers: { 'x-forwarded-for': ip },
        data: { mode: c.mode, text: turn.input, history: history.slice(-8), ctx, compare: turn.compareLast ? lastIds : [], hidden: [] },
      });
      const ms = Date.now() - t0;
      expect(res.status()).toBe(200);
      const r = (await res.json()) as AssistantReply;
      info.annotations.push({ type: 'turn', description: turn.input + ' → ' + r.msg.kind + ' (' + ms + ' ms) ' + (r.msg.ids || []).join(',') });
      const e = turn.expect;
      expect(e.kind, turn.input).toContain(r.msg.kind);
      expect(ms, 'waktu respons').toBeLessThanOrEqual(10_000);
      const ids = r.msg.ids || [];
      if (e.noIds) expect(ids).toEqual([]);
      for (const id of ids) expect(byId(id)?.stock ?? 0).toBeGreaterThan(0);
      if (e.maxPrice) for (const id of ids) expect(byId(id)!.price).toBeLessThanOrEqual(e.maxPrice);
      if (e.newIds) for (const id of ids) expect(lastIds).not.toContain(id);
      if (e.mustMatch) expect(textOf(r)).toMatch(e.mustMatch);
      if (e.mustNotMatch) expect(textOf(r)).not.toMatch(e.mustNotMatch);
      history.push({ role: 'user', text: turn.input }, { role: 'ai', text: (r.msg.paras || []).join(' ').slice(0, 500) });
      ctx = r.ctx || ctx;
      if (ids.length) lastIds = ids;
    }
  });
}
