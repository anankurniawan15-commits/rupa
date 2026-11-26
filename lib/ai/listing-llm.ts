import { z } from 'zod';
import { SELL_CATEGORIES } from '@/lib/data';
import type { ChatOptions, GroqMessage } from '@/lib/clients/groq';
import { CRISP_DM_SPEC } from './crisp-dm';
import { claimsFlags, generateDescription, generateKeywords, suggestTitles } from './listing-assist';
import { safetyWarnings } from './safety';
import { extractJsonObject } from './sortir-schema';
import type { ListingAiMeta, TitleSuggestion } from '@/types/ai';

export const ListingAssistRequestSchema = z.discriminatedUnion('task', [
  z.object({
    task: z.literal('titles'),
    draft: z.string().min(3).max(800),
    matOrigin: z.string().max(300).optional().default(''),
    tags: z.array(z.string().max(40)).max(12).optional().default([]),
    price: z.union([z.string(), z.number()]).optional(),
  }),
  z.object({
    task: z.literal('description'),
    title: z.string().max(120).optional().default(''),
    draft: z.string().max(800).optional().default(''),
    matOrigin: z.string().max(300).optional().default(''),
    process: z.string().max(600).optional().default(''),
    cond: z.string().max(60).optional().default(''),
    dims: z.string().max(120).optional().default(''),
  }),
  z.object({
    task: z.literal('keywords'),
    title: z.string().max(120).optional().default(''),
    draft: z.string().max(800).optional().default(''),
    matOrigin: z.string().max(300).optional().default(''),
  }),
]);

export type ListingAssistRequest = z.infer<typeof ListingAssistRequestSchema>;

const TitlesOutSchema = z.object({
  title: z.string().min(3).max(70).optional(),
  titles: z.array(z.string().min(3).max(70)).min(1).max(5).optional(),
  category: z.string().max(60).optional().default(''),
  material_tags: z.array(z.string().max(36)).max(8).optional().default([]),
});

const DescriptionOutSchema = z.object({
  description: z.string().min(10).max(1200),
});

const KeywordsOutSchema = z.object({
  keywords: z.array(z.string().min(2).max(40)).min(1).max(10),
});

export interface ListingDeps {
  chat: (messages: GroqMessage[], opts?: ChatOptions) => Promise<string>;
  chatWithMeta?: (
    messages: GroqMessage[],
    opts?: ChatOptions,
  ) => Promise<{ text: string; provider: 'Groq' | 'Gemini'; model: string }>;
}

const PRICE_REF_STATUS = `Membutuhkan minimal ${CRISP_DM_SPEC.minPriceComparables} listing pembanding valid.`;

export function buildListingGateMeta(
  combinedText: string,
  provider?: string,
  model?: string,
): ListingAiMeta {
  const safety_warnings = safetyWarnings(combinedText);
  const claim_warnings = claimsFlags(combinedText);
  return {
    safety_warnings,
    claim_warnings,
    needs_claim_review: Boolean(claim_warnings.length || safety_warnings.length),
    price_comparisons: [],
    price_reference_status: PRICE_REF_STATUS,
    text_provider: provider,
    text_model: model,
    crisp_dm_version: CRISP_DM_SPEC.version,
  };
}

function sanitizeTextAgainstClaims(text: string): string {
  const warnings = [...claimsFlags(text).map((f) => f.phrase), ...safetyWarnings(text)];
  if (!warnings.length) return text;
  return text
    .replace(/100\s*%\s*ramah lingkungan/gi, 'dibuat dari material daur ulang')
    .replace(/\bzero waste\b/gi, 'memanfaatkan bahan sisa')
    .replace(/\bbebas (bahan )?kimia\b/gi, 'dibuat secara manual')
    .replace(/\bbebas racun\b/gi, 'untuk penggunaan wajar')
    .replace(/\banti ?bakteri\b/gi, '')
    .replace(/\baman untuk semua orang\b/gi, 'periksa kecocokan penggunaan sebelum dipakai')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function normalizeSellCategory(raw: string, fallbackCat: string): string {
  const lower = (raw || '').trim().toLowerCase();
  const exact = SELL_CATEGORIES.find((c) => c.toLowerCase() === lower);
  if (exact) return exact;
  const partial = SELL_CATEGORIES.find((c) => lower && (c.toLowerCase().includes(lower) || lower.includes(c.toLowerCase().split(' ')[0])));
  return partial || fallbackCat;
}

async function runChat(
  deps: ListingDeps,
  messages: GroqMessage[],
  opts: ChatOptions,
): Promise<{ text: string; provider: string; model?: string }> {
  if (deps.chatWithMeta) {
    const res = await deps.chatWithMeta(messages, opts);
    return { text: res.text, provider: res.provider, model: res.model };
  }
  const text = await deps.chat(messages, opts);
  return { text, provider: 'LLM' };
}

export async function runListingAssistWithLlm(
  req: ListingAssistRequest,
  deps: ListingDeps,
): Promise<
  | { task: 'titles'; data: TitleSuggestion; path: 'llm' | 'fallback' }
  | { task: 'description'; description: string; path: 'llm' | 'fallback'; meta: ListingAiMeta }
  | { task: 'keywords'; keywords: string[]; path: 'llm' | 'fallback'; meta: ListingAiMeta }
> {
  if (req.task === 'titles') {
    const fb = suggestTitles(req.draft, req.matOrigin, req.tags);
    const fbCombined = [fb.titles[0] || '', req.draft, req.matOrigin, ...fb.tags].join(' ');
    const fbData: TitleSuggestion = {
      title: fb.titles[0] || '',
      ...fb,
      ...buildListingGateMeta(fbCombined, 'Lokal (Fallback)', 'rule-based-v1'),
    };
    const priceInput =
      req.price !== undefined && String(req.price).trim() ? `Rp${String(req.price).trim()}` : 'Belum ditentukan';

    const prompt = `Anda adalah AI Listing untuk marketplace RUPA.
Buat draf listing produk yang jujur, informatif, dan mudah dipahami.
Jangan mengarang fakta yang tidak diberikan penjual.

HINDARI KLAIM ABSOLUT:
- 100% ramah lingkungan
- Zero waste
- Bebas racun
- Antibakteri
- Aman untuk semua orang
- Klaim sertifikasi yang tidak terbukti

DATA PRODUK:
Cerita produk penjual: ${req.draft}
Material pilihan penjual: ${req.matOrigin || 'Belum diisi'}
Tag yang sudah ada: ${req.tags.join(', ') || 'Belum ada'}
Harga input penjual: ${priceInput}

KATEGORI PRODUK YANG DIPERBOLEHKAN:
${SELL_CATEGORIES.join(', ')}

ATURAN:
1. Buat judul utama maksimal 70 karakter.
2. Buat 3 judul alternatif (masing-masing maksimal 70 karakter).
3. Pilih kategori dari daftar yang tersedia.
4. Buat tag material yang sesuai dengan informasi penjual.
5. Jangan membuat estimasi atau referensi harga; harga input penjual bukan dasar pembanding.

KEMBALIKAN HANYA JSON VALID:
{
  "title": "judul singkat maksimal 70 karakter",
  "titles": [
    "judul alternatif 1",
    "judul alternatif 2",
    "judul alternatif 3"
  ],
  "category": "salah satu kategori valid di atas",
  "material_tags": ["tag 1", "tag 2", "tag 3"]
}
Gunakan Bahasa Indonesia sederhana dan informatif.`;

    try {
      const { text, provider, model } = await runChat(deps, [{ role: 'user', content: prompt }], {
        json: true,
        temperature: 0.3,
        maxTokens: 550,
      });
      const parsed = TitlesOutSchema.safeParse(extractJsonObject(text));
      if (!parsed.success) return { task: 'titles', data: fbData, path: 'fallback' };

      const primaryTitle = sanitizeTextAgainstClaims(
        (parsed.data.title || parsed.data.titles?.[0] || fb.titles[0] || '').trim(),
      ).slice(0, 70);
      const rawTitles = parsed.data.titles?.length
        ? parsed.data.titles
        : primaryTitle
          ? [primaryTitle]
          : fb.titles;
      const titles = rawTitles.map((t) => sanitizeTextAgainstClaims(t).slice(0, 70)).filter(Boolean);
      const finalPrimary = primaryTitle || titles[0] || fb.titles[0] || '';
      const existing = new Set(req.tags.map((x) => x.toLowerCase()));
      const tags = (parsed.data.material_tags || fb.tags)
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t && !existing.has(t))
        .slice(0, 5);
      const finalTags = tags.length ? tags : fb.tags;
      const gateText = [finalPrimary, ...titles, req.draft, req.matOrigin, ...finalTags].join(' ');

      return {
        task: 'titles',
        data: {
          title: finalPrimary,
          titles: titles.length ? titles : fb.titles,
          recCat: normalizeSellCategory(parsed.data.category, fb.recCat),
          tags: finalTags,
          ...buildListingGateMeta(gateText, provider, model),
        },
        path: 'llm',
      };
    } catch {
      return { task: 'titles', data: fbData, path: 'fallback' };
    }
  }

  if (req.task === 'description') {
    const fb = generateDescription({
      title: req.title,
      matOrigin: req.matOrigin,
      process: req.process,
      cond: req.cond,
      dims: req.dims,
    });
    const fbGate = buildListingGateMeta([req.title, fb, req.matOrigin].join(' '), 'Lokal (Fallback)', 'rule-based-v1');
    const prompt = `Anda adalah AI Listing pada marketplace RUPA.
Buat draf deskripsi produk berbahasa Indonesia yang jelas dan jujur berdasarkan data penjual berikut:
Judul: ${req.title || 'Belum diisi'}
Cerita/draft: ${req.draft || 'Belum diisi'}
Material asal: ${req.matOrigin || 'Belum diisi'}
Kondisi: ${req.cond || 'Belum dipilih'}
Proses pembuatan: ${req.process || 'Belum diisi'}
Ukuran: ${req.dims || 'Belum diisi'}

Aturan:
1. Gunakan Bahasa Indonesia yang jelas dan singkat (2–4 kalimat).
2. Jangan mengarang kondisi, ukuran, atau karakteristik yang tidak diberikan penjual.
3. Jangan menambahkan klaim lingkungan mutlak tanpa bukti ("100% ramah lingkungan", "zero waste", "bebas racun", "antibakteri", "organik").
4. Jangan menuliskan referensi harga.

Kembalikan JSON valid:
{
  "description": "teks deskripsi produk"
}`;

    try {
      const { text, provider, model } = await runChat(deps, [{ role: 'user', content: prompt }], {
        json: true,
        temperature: 0.3,
        maxTokens: 500,
      });
      const parsed = DescriptionOutSchema.safeParse(extractJsonObject(text));
      if (!parsed.success) return { task: 'description', description: fb, path: 'fallback', meta: fbGate };
      const cleaned = sanitizeTextAgainstClaims(parsed.data.description) || fb;
      return {
        task: 'description',
        description: cleaned,
        path: 'llm',
        meta: buildListingGateMeta([req.title, cleaned, req.matOrigin].join(' '), provider, model),
      };
    } catch {
      return { task: 'description', description: fb, path: 'fallback', meta: fbGate };
    }
  }

  const fbKw = generateKeywords({ title: req.title, matOrigin: req.matOrigin, draft: req.draft });
  const fbKwGate = buildListingGateMeta([req.title, req.matOrigin, ...fbKw].join(' '), 'Lokal (Fallback)', 'rule-based-v1');
  const prompt = `Anda adalah AI Listing untuk marketplace RUPA.
Buat 5–8 kata kunci pencarian pendek dalam Bahasa Indonesia untuk membantu pembeli menemukan produk ini:
Judul: ${req.title || 'Belum diisi'}
Material asal: ${req.matOrigin || 'Belum diisi'}
Cerita produk: ${req.draft || 'Belum diisi'}

Kembalikan JSON valid:
{
  "keywords": ["kata kunci 1", "kata kunci 2"]
}`;

  try {
    const { text, provider, model } = await runChat(deps, [{ role: 'user', content: prompt }], {
      json: true,
      temperature: 0.2,
      maxTokens: 300,
    });
    const parsed = KeywordsOutSchema.safeParse(extractJsonObject(text));
    if (!parsed.success) return { task: 'keywords', keywords: fbKw, path: 'fallback', meta: fbKwGate };
    const keywords = Array.from(new Set(parsed.data.keywords.map((k) => k.trim().toLowerCase()).filter(Boolean))).slice(0, 8);
    const finalKw = keywords.length ? keywords : fbKw;
    return {
      task: 'keywords',
      keywords: finalKw,
      path: 'llm',
      meta: buildListingGateMeta([req.title, req.matOrigin, ...finalKw].join(' '), provider, model),
    };
  } catch {
    return { task: 'keywords', keywords: fbKw, path: 'fallback', meta: fbKwGate };
  }
}
