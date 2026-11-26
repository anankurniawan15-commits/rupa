import { expect, test } from '@playwright/test';
import { applySortirConfidenceGate } from '@/lib/ai/crisp-dm';
import { buildScenarioFromLlm } from '@/lib/ai/sortir-schema';
import {
  buildVisionSortirRaw,
  combineVisionPredictions,
  LOCAL_CV_ARCHITECTURE,
  mapImageNetLabelToCategory,
  SIGLIP_MATERIAL_PROMPTS,
} from '@/lib/ai/vision-classifier';

const promptFor = (id: string) => SIGLIP_MATERIAL_PROMPTS.find((p) => p.id === id)!.prompt;

test('mapImageNetLabelToCategory memetakan kelas ImageNet ke kategori RUPA dan mendeteksi screenshot', () => {
  expect(mapImageNetLabelToCategory('red wine')).toBe('Kaca');
  expect(mapImageNetLabelToCategory('beer glass')).toBe('Kaca');
  expect(mapImageNetLabelToCategory('jean, blue jean, denim')).toBe('Tekstil');
  expect(mapImageNetLabelToCategory('water bottle')).toBe('Plastik');
  expect(mapImageNetLabelToCategory('carton')).toBe('Kertas');
  expect(mapImageNetLabelToCategory('frying pan')).toBe('Logam');
  expect(mapImageNetLabelToCategory('folding chair')).toBe('Kayu');
  expect(mapImageNetLabelToCategory('car wheel')).toBe('Karet');
  expect(mapImageNetLabelToCategory('web site, website, internet site, site')).toBe('__unsupported__');
  expect(mapImageNetLabelToCategory('notebook, notebook computer')).toBe('Lainnya / Campuran');
});

test('combineVisionPredictions mengenali pecahan kaca tanpa mencampur Tekstil dan tetap jujur soal kalibrasi', () => {
  const decision = combineVisionPredictions(
    [
      { label: promptFor('kaca_pecah'), score: 0.43 },
      { label: promptFor('kaca_utuh'), score: 0.02 },
      { label: promptFor('plastik'), score: 0.001 },
    ],
    [
      { label: 'red wine', score: 0.32 },
      { label: 'water jug', score: 0.08 },
      { label: 'beer glass', score: 0.04 },
    ],
  );

  expect(decision.supported).toBe(true);
  expect(decision.category).toBe('Kaca');
  expect(decision.conditionHint).toBe('broken');
  expect(decision.agreed).toBe(true);
  expect(decision.confidence).toBeGreaterThanOrEqual(70);
  expect(decision.confidence).toBeLessThanOrEqual(93);

  const raw = buildVisionSortirRaw(decision, '');
  const scenario = buildScenarioFromLlm(raw, `${decision.itemLabel} ${decision.detectedObjects.join(' ')}`, 'llm').scenario!;
  const gated = applySortirConfidenceGate(scenario, {
    label: decision.category,
    confidence: decision.confidence,
    backbone: LOCAL_CV_ARCHITECTURE,
    calibrated: false,
  });

  expect(gated.cat).toBe('Kaca');
  expect(gated.conf).toBe(decision.confidence);
  expect(gated.mat).toBeNull();
  expect(gated.creators).toEqual([]);
  expect(gated.similar).toEqual([]);
  expect(gated.needsManualReview).toBe(false);
  expect(gated.confNote).toContain('ConvNeXt-Tiny');
  expect(gated.confNote).toContain(`${decision.confidence}%`);
  expect(gated.warnings.some((w) => /sarung tangan|tajam/i.test(w))).toBe(true);
  expect(gated.ideas.every((i) => !/tote|kain|denim/i.test(i.name))).toBe(true);
  expect(gated.ideas.every((i) => typeof i.matchScore === 'number' && i.matchScore >= 68)).toBe(true);
});

test('combineVisionPredictions menandai tangkapan layar sebagai unsupported dan menurunkan skor jika model berbeda pendapat', () => {
  const screenshot = combineVisionPredictions(
    [
      { label: promptFor('unsupported'), score: 0.25 },
      { label: promptFor('kaca_pecah'), score: 0.01 },
    ],
    [
      { label: 'web site, website, internet site, site', score: 0.66 },
      { label: 'monitor', score: 0.05 },
    ],
  );
  expect(screenshot.supported).toBe(false);

  const disagree = combineVisionPredictions(
    [
      { label: promptFor('plastik'), score: 0.6 },
      { label: promptFor('kayu'), score: 0.05 },
    ],
    [{ label: 'folding chair', score: 0.55 }],
  );
  expect(disagree.supported).toBe(true);
  expect(disagree.agreed).toBe(false);
  expect(disagree.confidence).toBeLessThanOrEqual(58);
});
