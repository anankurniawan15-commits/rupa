import { expect, test } from '@playwright/test';
import {
  applySortirConfidenceGate,
  CRISP_DM_SPEC,
  evaluateListingClaimsGate,
  pythonListingToResponse,
  pythonSortirToOutcome,
} from '@/lib/ai/crisp-dm';
import { buildScenarioFromLlm } from '@/lib/ai/sortir-schema';

test('CRISP-DM gate: confidence >= 60 & cocok tidak wajib manual review; < 60 atau beda pendapat wajib review', () => {
  const base = buildScenarioFromLlm(
    {
      supported: true,
      item_name: 'Celana jeans',
      material_category: 'Tekstil',
      composition_estimate: 'Katun denim',
      visible_conditions: ['Pudar'],
      limitations: [],
      recommended_action: 'Jahit ulang jadi tas',
      upcycle_ideas: [],
      marketplace_search_terms: ['denim'],
    },
    'jeans bekas',
    'llm',
  ).scenario!;

  const highMatch = applySortirConfidenceGate(base, { label: 'Tekstil', confidence: 84.3 });
  expect(highMatch.conf).toBe(84);
  expect(highMatch.needsManualReview).toBe(false);

  const lowMatch = applySortirConfidenceGate(base, { label: 'Tekstil', confidence: 52.1 });
  expect(lowMatch.conf).toBe(52);
  expect(lowMatch.needsManualReview).toBe(true);

  const mismatch = applySortirConfidenceGate(base, { label: 'Plastik', confidence: 91 });
  expect(mismatch.conf).toBeLessThan(CRISP_DM_SPEC.confidenceThreshold);
  expect(mismatch.needsManualReview).toBe(true);

  const noClassifier = applySortirConfidenceGate(base, null);
  expect(noClassifier.conf).toBeNull();
  expect(noClassifier.needsManualReview).toBe(true);
});

test('CRISP-DM bridge: pythonSortirToOutcome memetakan respons FastAPI ke SortirOutcome termasuk provider & text-only warnings', () => {
  const outcome = pythonSortirToOutcome(
    {
      supported: true,
      item_name: 'Toples kaca',
      material_category: 'Kaca',
      composition_estimate: 'Kaca bening',
      detected_objects: ['toples kaca', 'tutup logam'],
      visible_conditions: ['Utuh'],
      limitations: ['Ketebalan kaca tidak dapat dipastikan'],
      confidence: 78.4,
      classifier_prediction: 'Kaca',
      vision_provider: 'Groq',
      vision_backbone: 'qwen/qwen3.8-27b',
      needs_manual_review: false,
      crisp_dm_version: '1.0-crispdm',
    },
    'toples kaca',
  );
  expect(outcome?.status).toBe('done');
  if (outcome?.status === 'done') {
    expect(outcome.customScenario?.cat).toBe('Kaca');
    expect(outcome.customScenario?.conf).toBe(78);
    expect(outcome.customScenario?.needsManualReview).toBe(false);
    expect(outcome.customScenario?.visionProvider).toBe('Groq');
    expect(outcome.customScenario?.visionBackbone).toBe('qwen/qwen3.8-27b');
    expect(outcome.customScenario?.detectedObjects).toEqual(['toples kaca', 'tutup logam']);
  }

  const textOnly = pythonSortirToOutcome(
    {
      supported: true,
      item_name: 'Barang berdasarkan deskripsi pengguna',
      material_category: 'unknown',
      composition_estimate: 'Material belum dapat dipastikan karena tidak terdapat gambar.',
      visible_conditions: ['pecahan kaca tajam'],
      limitations: ['Tidak ada gambar yang dianalisis menggunakan Vision API.'],
      warnings: ['Benda tajam: periksa retakan terlebih dahulu.'],
      confidence: null,
      needs_manual_review: true,
    },
    'pecahan kaca tajam',
  );
  expect(textOnly?.status).toBe('done');
  if (textOnly?.status === 'done') {
    expect(textOnly.low).toBe(true);
    expect(textOnly.warnings?.some((w) => w.includes('Benda tajam'))).toBe(true);
    expect(textOnly.noteText).toContain('tidak terdapat gambar');
  }
});

test('CRISP-DM Listing gate: klaim berisiko & aturan minimal 3 pembanding harga', () => {
  const gate = evaluateListingClaimsGate('Tote bag 100% ramah lingkungan bebas racun');
  expect(gate.claimFlags.length).toBeGreaterThanOrEqual(1);
  expect(gate.safetyWarnings.length).toBeGreaterThanOrEqual(1);
  expect(gate.priceReferenceAllowed(2)).toBe(false);
  expect(gate.priceReferenceAllowed(3)).toBe(true);

  const mapped = pythonListingToResponse(
    {
      title: 'Tote Bag Denim Bekas',
      titles: ['Tote Bag Denim Bekas', 'Tas Saku Jeans', 'Tote Kanvas Denim'],
      category: 'Tas dan Dompet',
      material_tags: ['denim bekas'],
      safety_warnings: [],
      claim_warnings: [],
      needs_claim_review: false,
      price_comparisons: [],
      price_reference_status: 'Membutuhkan minimal 3 listing pembanding valid.',
      text_provider: 'Groq',
      text_model: 'qwen/qwen3.8-27b',
      crisp_dm_version: '1.0-crispdm',
    },
    { task: 'titles', draft: 'tote denim bekas', matOrigin: 'denim', tags: [] },
  );
  expect(mapped?.task).toBe('titles');
  if (mapped?.task === 'titles') {
    expect(mapped.data.title).toBe('Tote Bag Denim Bekas');
    expect(mapped.data.recCat).toBe('Tas dan Dompet');
    expect(mapped.data.text_provider).toBe('Groq');
    expect(mapped.data.price_reference_status).toContain('minimal 3');
  }
});
