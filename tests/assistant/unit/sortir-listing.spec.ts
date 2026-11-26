import { expect, test } from '@playwright/test';
import { safetyWarnings } from '@/lib/ai/safety';
import { validateFile } from '@/lib/ai/sortir-engine';
import {
  analyzeSortirVision,
  analyzeSortirWithLlm,
  analyzeTextOnlySortir,
  fallbackSortirAnalysis,
} from '@/lib/ai/sortir-llm';
import { applyManualMaterialSelection, normalizeMaterialCategory } from '@/lib/ai/sortir-schema';
import { runListingAssistWithLlm } from '@/lib/ai/listing-llm';

test('safetyWarnings mendeteksi kata kunci berbahaya dari safety.py', () => {
  expect(safetyWarnings('botol kaca pecah dengan pecahan kaca tajam')).toEqual(
    expect.arrayContaining([expect.stringContaining('Benda tajam')]),
  );
  expect(safetyWarnings('kaleng bekas oli dan baterai bocor')).toEqual(
    expect.arrayContaining([
      expect.stringContaining('Bahan kimia'),
      expect.stringContaining('Komponen listrik'),
    ]),
  );
});

test('fallbackSortirAnalysis mengenali Kaca sebelum Plastik dan menandai risiko', () => {
  const glass = fallbackSortirAnalysis('botol kaca sirup bekas ada retak dan pecahan kaca');
  expect(glass.status).toBe('done');
  if (glass.status === 'done') {
    expect(glass.low).toBe(false);
    expect(glass.customScenario?.cat).toBe('Kaca');
    expect(glass.customScenario?.warnings.some((w) => w.includes('Benda tajam'))).toBe(true);
  }
});

test('analyzeSortirVision: mengikuti struktur sortir.py terbaru (Groq/Gemini Vision, detected_objects, Safety Gate, threshold 60)', async () => {
  const res = await analyzeSortirVision(
    { imageDataUrl: 'data:image/jpeg;base64,/9j/4AAQ', description: 'pecah di tepi bawah' },
    async () => ({
      provider: 'Groq',
      model: 'qwen/qwen3.8-27b',
      text: JSON.stringify({
        supported: true,
        item_name: 'Gelas kaca bening',
        material_category: 'Kaca',
        composition_estimate: 'Kaca bening (perkiraan visual)',
        detected_objects: ['gelas kaca', 'pecahan kaca'],
        visible_conditions: ['Retak memanjang di bagian tepi'],
        confidence: 86,
        warnings: [],
      }),
    }),
  );

  expect(res.path).toBe('llm');
  expect(res.outcome.status).toBe('done');
  if (res.outcome.status === 'done') {
    expect(res.outcome.low).toBe(false);
    expect(res.outcome.customScenario?.cat).toBe('Kaca');
    expect(res.outcome.customScenario?.conf).toBe(86);
    expect(res.outcome.customScenario?.visionProvider).toBe('Groq');
    expect(res.outcome.customScenario?.visionBackbone).toBe('qwen/qwen3.8-27b');
    expect(res.outcome.customScenario?.detectedObjects).toEqual(['gelas kaca', 'pecahan kaca']);
    expect(res.outcome.customScenario?.needsManualReview).toBe(false);
    expect(res.outcome.customScenario?.warnings.some((w) => w.includes('Benda tajam'))).toBe(true);
    expect(res.outcome.customScenario?.cond.some((c) => c.includes('Catatan pengguna: pecah di tepi bawah'))).toBe(true);
  }
});

test('analyzeSortirVision: confidence < 60 atau Lainnya / Campuran memicu needsManualReview=true, supported=false -> unsupported', async () => {
  const lowConf = await analyzeSortirVision(
    { imageDataUrl: 'data:image/jpeg;base64,/9j/4AAQ' },
    async () => ({
      provider: 'Gemini',
      model: 'gemini-3.8-flash',
      text: JSON.stringify({
        supported: true,
        item_name: 'Tas campuran',
        material_category: 'Plastik',
        composition_estimate: 'Plastik belum jelas',
        detected_objects: ['tas'],
        visible_conditions: ['Foto agak buram'],
        confidence: 48,
        warnings: [],
      }),
    }),
  );
  expect(lowConf.outcome.status).toBe('done');
  if (lowConf.outcome.status === 'done') {
    expect(lowConf.outcome.customScenario?.conf).toBe(48);
    expect(lowConf.outcome.customScenario?.visionProvider).toBe('Gemini');
    expect(lowConf.outcome.customScenario?.needsManualReview).toBe(true);
  }

  const unsup = await analyzeSortirVision(
    { imageDataUrl: 'data:image/jpeg;base64,/9j/4AAQ' },
    async () => ({
      provider: 'Groq',
      model: 'qwen/qwen3.8-27b',
      text: JSON.stringify({ supported: false, warnings: ['Bukan barang fisik'] }),
    }),
  );
  expect(unsup.outcome.status).toBe('unsupported');
});

test('analyzeTextOnlySortir: menjalankan Safety Gate lalu meminta pilih material manual', () => {
  const res = analyzeTextOnlySortir('gelas kaca pecah tajam');
  expect(res.status).toBe('done');
  if (res.status === 'done') {
    expect(res.low).toBe(true);
    expect(res.customScenario).toBeNull();
    expect(res.warnings?.some((w) => w.includes('Benda tajam'))).toBe(true);
    expect(res.limitations?.length).toBeGreaterThanOrEqual(2);
  }
});

test('analyzeSortirWithLlm: memberi angka akurasi deterministik (bukan dari LLM) + 3 ide dengan matchScore', async () => {
  const res = await analyzeSortirWithLlm(
    { imageDataUrl: 'data:image/jpeg;base64,/9j/4AAQ', description: 'botol kaca' },
    {
      vision: async () =>
        JSON.stringify({
          supported: true,
          item_name: 'Botol kaca bening',
          material_category: 'Kaca',
          composition_estimate: 'Kaca soda-lime (perkiraan visual)',
          visible_conditions: ['Utuh', 'Tutup lepas'],
          limitations: ['Tidak dapat memastikan ketebalan kaca'],
          recommended_action: 'Bersihkan untuk vas atau setor ke bank sampah kaca.',
          upcycle_ideas: [{ title: 'Vas meja', description: 'Isi bunga kering.' }],
          marketplace_search_terms: ['botol kaca'],
        }),
      chat: async () => {
        throw new Error('should not call chat');
      },
    },
  );
  expect(res.path).toBe('llm');
  expect(res.outcome.status).toBe('done');
  if (res.outcome.status === 'done') {
    expect(res.outcome.low).toBe(false);
    expect(typeof res.outcome.customScenario?.conf).toBe('number');
    expect(res.outcome.customScenario?.conf).toBeGreaterThanOrEqual(60);
    expect(res.outcome.customScenario?.conf).toBeLessThanOrEqual(95);
    expect(res.outcome.customScenario?.needsManualReview).toBe(false);
    expect(res.outcome.customScenario?.ideas.length).toBe(3);
    expect(
      res.outcome.customScenario?.ideas.every(
        (i) => typeof i.matchScore === 'number' && i.matchScore >= 68 && i.matchScore <= 96,
      ),
    ).toBe(true);
  }
});

test('analyzeSortirWithLlm: supported=false -> unsupported, unknown -> low confidence', async () => {
  const unsupported = await analyzeSortirWithLlm(
    { imageDataUrl: 'data:image/jpeg;base64,/9j/4AAQ' },
    {
      vision: async () => JSON.stringify({ supported: false, material_category: 'unknown' }),
      chat: async () => '',
    },
  );
  expect(unsupported.outcome).toEqual({ status: 'unsupported' });

  const unknown = await analyzeSortirWithLlm(
    { description: 'benda aneh' },
    {
      vision: async () => '',
      chat: async () => JSON.stringify({ supported: true, material_category: 'unknown' }),
    },
  );
  expect(unknown.outcome).toEqual({ status: 'done', scen: null, customScenario: null, low: true });
});

test('normalizeMaterialCategory dan applyManualMaterialSelection bekerja untuk semua kategori dengan akurasi 100% tanpa mencampur produk/ide lain', () => {
  expect(normalizeMaterialCategory('logam aluminium')).toBe('Logam');
  const logam = applyManualMaterialSelection('Logam');
  expect(logam.cat).toBe('Logam');
  expect(logam.conf).toBe(100);
  expect(logam.needsManualReview).toBe(false);
  expect(logam.similar).toEqual(['p11']);
  expect(logam.creators).toEqual(['kaleng']);

  const kaca = applyManualMaterialSelection('Kaca');
  expect(kaca.cat).toBe('Kaca');
  expect(kaca.conf).toBe(100);
  expect(kaca.mat).toBeNull();
  expect(kaca.similar).toEqual([]);
  expect(kaca.creators).toEqual([]);
  expect(kaca.ideas.every((i) => !/tote|patchwork|kain/i.test(i.name))).toBe(true);
  expect(kaca.ideas.every((i) => i.rel === '')).toBe(true);
  expect(kaca.ideas.every((i) => typeof i.matchScore === 'number')).toBe(true);

  const kertas = applyManualMaterialSelection('Kertas');
  expect(kertas.mat).toBeNull();
  expect(kertas.similar).toEqual([]);
  expect(kertas.creators).toEqual([]);

  const switchedToTekstil = applyManualMaterialSelection('Tekstil', kaca);
  expect(switchedToTekstil.cat).toBe('Tekstil');
  expect(switchedToTekstil.item).not.toContain('kaca');
});

test('validateFile menerima gambar unduhan web (AVIF, JFIF, WebP) dan menolak non-gambar', () => {
  expect(validateFile({ type: 'image/avif', size: 1024, name: 'download.avif' })).toBe('');
  expect(validateFile({ type: '', size: 1024, name: 'photo.jfif' })).toBe('');
  expect(validateFile({ type: 'application/pdf', size: 1024, name: 'doc.pdf' })).not.toBe('');
});

test('runListingAssistWithLlm membersihkan klaim absolut, memetakan kategori, serta mengisi Gate & metadata provider', async () => {
  const out = await runListingAssistWithLlm(
    { task: 'titles', draft: 'tote bag dari jeans bekas sangat kuat', matOrigin: 'jeans bekas', tags: [], price: '85000' },
    {
      chat: async () => '',
      chatWithMeta: async () => ({
        provider: 'Groq',
        model: 'qwen/qwen3.8-27b',
        text: JSON.stringify({
          title: 'Tote Bag Denim Bekas 100% Ramah Lingkungan',
          titles: ['Tote Bag Denim Bekas 100% Ramah Lingkungan', 'Tas Tote Saku Jeans Upcycle', 'Tote Kanvas & Denim Daur Ulang'],
          category: 'Tas dan Dompet',
          material_tags: ['denim bekas', 'katun'],
        }),
      }),
    },
  );
  expect(out.path).toBe('llm');
  if (out.task === 'titles') {
    expect(out.data.title).toBeDefined();
    expect(out.data.recCat).toBe('Tas dan Dompet');
    expect(out.data.titles[0]).not.toMatch(/100\s*%\s*ramah lingkungan/i);
    expect(out.data.text_provider).toBe('Groq');
    expect(out.data.text_model).toBe('qwen/qwen3.8-27b');
    expect(out.data.price_comparisons).toEqual([]);
    expect(out.data.price_reference_status).toContain('minimal 3');
  }
});
