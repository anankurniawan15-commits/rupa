import { expect, test } from '@playwright/test';
import {
  classifyHttpStatusForRotation,
  collectKeysFromEnv,
  executeWithKeyRotation,
  parseRetryAfterFromText,
  RotatingKeyPool,
} from '@/lib/ai/key-rotation';
import { generateSortirOutcomeWithAdvice } from '@/lib/ai/sortir-advice';
import type { VisionEnsembleDecision } from '@/lib/ai/vision-classifier';

test('collectKeysFromEnv menggabungkan key pool, key tunggal, dan key bernomor tanpa duplikasi', () => {
  const keys = collectKeysFromEnv(
    {
      GROQ_API_KEYS: 'k1, k2\nk3',
      GROQ_API_KEY: 'k2;k4',
      GROQ_API_KEY_1: 'k5',
      GROQ_API_KEY_2: 'k1',
    },
    'GROQ',
  );
  expect(keys).toEqual(['k1', 'k2', 'k3', 'k4', 'k5']);
});

test('RotatingKeyPool & executeWithKeyRotation memutar round-robin dan melewati key yang terkena 429/402/413', async () => {
  const pool = new RotatingKeyPool(60_000);
  let now = 1_000_000;
  const keys = ['keyA', 'keyB', 'keyC'];

  expect(pool.orderKeys(keys, now)[0]).toBe('keyA');
  expect(pool.orderKeys(keys, now)[0]).toBe('keyB');
  expect(pool.orderKeys(keys, now)[0]).toBe('keyC');
  expect(pool.hasHealthyKey(keys, now)).toBe(true);

  const tried: string[] = [];
  const res = await executeWithKeyRotation(
    keys,
    pool,
    async (k) => {
      tried.push(k);
      if (k === 'keyA') {
        throw { status: 429, detail: 'Rate limit reached: tokens per day (TPD)' };
      }
      if (k === 'keyB') {
        throw { status: 413, detail: 'tokens per minute limit exceeded' };
      }
      return `ok-${k}`;
    },
    (err) => {
      const e = err as { status?: number; detail?: string };
      return classifyHttpStatusForRotation(e.status, undefined, e.detail);
    },
    () => now,
  );

  expect(res).toBe('ok-keyC');
  expect(tried).toEqual(['keyA', 'keyB', 'keyC']);
  expect(pool.isCoolingDown('keyA', now)).toBe(true);
  expect(pool.isCoolingDown('keyB', now)).toBe(true);
  expect(pool.isCoolingDown('keyC', now)).toBe(false);
  expect(pool.hasHealthyKey(keys, now)).toBe(true);

  // Panggilan berikutnya memprioritaskan key sehat ('keyC') lebih dulu selama cooldown belum habis
  expect(pool.orderKeys(keys, now + 5_000)[0]).toBe('keyC');

  // keyA kena TPD (300s), sedangkan keyB kena TPM (60s)
  expect(pool.isCoolingDown('keyA', now + 120_000)).toBe(true);
  expect(pool.isCoolingDown('keyB', now + 120_000)).toBe(false);

  // Setelah cooldown 305 detik berlalu, semua key sehat kembali
  now += 305_000;
  expect(pool.isCoolingDown('keyA', now)).toBe(false);
});

test('parseRetryAfterFromText & classifyHttpStatusForRotation mengenali batas token, quota, dan waktu tunggu', () => {
  expect(parseRetryAfterFromText('Please try again in 1m15s.')).toBe(75_000);
  expect(parseRetryAfterFromText('retryDelay: 25.5s')).toBe(25_500);

  const tpm = classifyHttpStatusForRotation(429, undefined, 'Please try again in 45s');
  expect(tpm.rotate).toBe(true);
  expect(tpm.cooldownMs).toBe(45_000);

  const geminiQuota = classifyHttpStatusForRotation(undefined, undefined, 'RESOURCE_EXHAUSTED: insufficient_quota');
  expect(geminiQuota.rotate).toBe(true);
  expect(geminiQuota.cooldownMs).toBe(300_000);

  const badReq = classifyHttpStatusForRotation(400, undefined, 'invalid parameter');
  expect(badReq.rotate).toBe(false);
});

test('generateSortirOutcomeWithAdvice mengunci kategori CV dan memakai saran teks LLM serta fallback aman', async () => {
  const glassDecision: VisionEnsembleDecision = {
    supported: true,
    category: 'Kaca',
    confidence: 56,
    agreed: true,
    siglipTopCategory: 'Kaca',
    convnextTopCategory: 'Kaca',
    detectedObjects: ['red wine', 'water jug'],
    conditionHint: 'broken',
    itemLabel: 'pecahan kaca tajam / retak',
  };

  // Simulasi Text LLM memberi saran pengolahan kaca namun mencoba mengembalikan kategori salah ("Tekstil")
  const enriched = await generateSortirOutcomeWithAdvice(glassDecision, 'bekas gelas pecah', async () =>
    JSON.stringify({
      item_name: 'Pecahan gelas kaca bening',
      material_category: 'Tekstil',
      composition_estimate: 'Kaca soda-lime bening (periksa tepi tajam langsung)',
      recommended_action: 'Pakai sarung tangan tebal dan kemas pecahan ke kardus berlabel Awas Kaca.',
      upcycle_ideas: [
        { title: 'Mozaik pot taman tertutup', description: 'Tanam kepingan kecil ke adukan semen sehingga sisi tajam aman.' },
        { title: 'Setor cullet bank sampah kaca', description: 'Kemas rapat dengan koran tebal dan kardus.' },
        { title: 'Panel hias resin tertutup', description: 'Cor resin bening di bingkai kayu tertutup.' },
      ],
      marketplace_search_terms: ['kaca', 'cullet kaca'],
    }),
  );

  expect(enriched.advicePath).toBe('llm_rotated');
  expect(enriched.outcome.status).toBe('done');
  if (enriched.outcome.status === 'done' && enriched.outcome.customScenario) {
    expect(enriched.outcome.customScenario.cat).toBe('Kaca');
    expect(enriched.outcome.customScenario.mat).toBeNull();
    expect(enriched.outcome.customScenario.creators).toEqual([]);
    expect(enriched.outcome.customScenario.ideas[0].name).toBe('Mozaik pot taman tertutup');
    expect(enriched.outcome.customScenario.needsManualReview).toBe(true);
  }

  // Saat seluruh key Text LLM gagal/limit, tetap fallback aman ke template Computer Vision
  const fallback = await generateSortirOutcomeWithAdvice(glassDecision, '', async () => {
    throw new Error('all_keys_429');
  });
  expect(fallback.advicePath).toBe('cv_template');
  expect(fallback.outcome.status).toBe('done');
  if (fallback.outcome.status === 'done' && fallback.outcome.customScenario) {
    expect(fallback.outcome.customScenario.cat).toBe('Kaca');
    expect(fallback.outcome.customScenario.ideas.length).toBe(3);
  }
});
