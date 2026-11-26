import { expect, test } from '@playwright/test';
import { extractCriteria, extractFlags, searchCatalog, shop, type SearchOptions, type ShopCriteria } from '@/lib/ai/assistant-engine';
import { PRODUCTS } from '@/lib/data';

const crit = (c: Partial<ShopCriteria>): ShopCriteria => ({ budget: 0, mats: [], types: [], words: [], gift: false, ...c });
const opts = (o: Partial<SearchOptions> = {}): SearchOptions => ({ hidden: [], wantsBahan: false, exclude: [], ...o });
const byId = (id: string) => PRODUCTS.find((p) => p.id === id)!;

test.describe('searchCatalog', () => {
  test('filter budget: semua harga ≤ budget dan tidak dilonggarkan', () => {
    const { list, relaxed } = searchCatalog(crit({ budget: 150000 }), opts());
    expect(relaxed).toBe(false);
    expect(list.length).toBeGreaterThan(0);
    for (const p of list) expect(p.price).toBeLessThanOrEqual(150000);
  });

  test('filter material', () => {
    const { list } = searchCatalog(crit({ mats: ['denim'] }), opts());
    expect(list.length).toBeGreaterThan(0);
    for (const p of list) expect(p.mats).toContain('denim');
  });

  test('stok 0 tidak pernah muncul', () => {
    expect(byId('p9').stock).toBe(0);
    const { list } = searchCatalog(crit({ types: ['dekorasi'], mats: ['kayu'] }), opts());
    expect(list.map((p) => p.id)).not.toContain('p9');
    const all = searchCatalog(crit({ budget: 10_000_000 }), opts({ wantsBahan: true })).list;
    for (const p of all) expect(p.stock).toBeGreaterThan(0);
  });

  test('daftar hidden dan exclude disaring', () => {
    const { list } = searchCatalog(crit({ types: ['tas'] }), opts({ hidden: ['p1'], exclude: ['p2'] }));
    const ids = list.map((p) => p.id);
    expect(ids).not.toContain('p1');
    expect(ids).not.toContain('p2');
  });

  test('material mentah hanya kalau diminta', () => {
    expect(searchCatalog(crit({ mats: ['denim'] }), opts()).list.map((p) => p.id)).not.toContain('p12');
    expect(searchCatalog(crit({ mats: ['denim'] }), opts({ wantsBahan: true })).list.map((p) => p.id)).toContain('p12');
  });

  test('tidak ada yang masuk budget → dilonggarkan, urut dari termurah', () => {
    const { list, relaxed } = searchCatalog(crit({ budget: 10000, types: ['tas'] }), opts());
    expect(relaxed).toBe(true);
    const prices = list.map((p) => p.price);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  test('uses hanya menaikkan skor, tidak menyaring', () => {
    const base = searchCatalog(crit({ budget: 300000 }), opts()).list.map((p) => p.id);
    const withUses = searchCatalog(crit({ budget: 300000 }), opts({ uses: ['kuliah'] })).list.map((p) => p.id);
    expect([...withUses].sort()).toEqual([...base].sort());
  });
});

test.describe('mesin aturan shop()', () => {
  test('ekstraksi kriteria dan sinyal lanjutan', () => {
    expect(extractCriteria('cari tas denim di bawah rp150.000')).toMatchObject({ budget: 150000, mats: ['denim'], types: ['tas'] });
    expect(extractFlags('yang lebih murah')).toMatchObject({ cheaper: true, refine: true });
  });

  test('"yang lebih murah" menjaga konteks dan menurunkan harga', () => {
    const first = shop('cari produk di bawah rp300.000', { mode: 'shop', ctx: {}, compare: [] });
    const minFirst = Math.min(...first.msg.ids!.map((id) => byId(id).price));
    const next = shop('yang lebih murah', { mode: 'shop', ctx: first.ctx!, compare: [] });
    expect(next.msg.kind).toBe('products');
    for (const id of next.msg.ids!) expect(byId(id).price).toBeLessThan(minFirst);
    expect(next.ctx?.budget).toBe(300000);
  });

  test('"pilihan lain" saat semua sudah ditunjukkan → jujur, tanpa produk', () => {
    const r = shop('ada pilihan lain?', { mode: 'shop', ctx: { types: ['tas'], lastIds: ['p1', 'p2'] }, compare: [] });
    expect(r.msg.kind).toBe('clarify');
    expect(r.msg.ids).toBeUndefined();
  });
});
