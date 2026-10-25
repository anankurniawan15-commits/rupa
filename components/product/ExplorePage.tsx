'use client';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/Boxes';
import { Icon } from '@/components/ui/Icon';
import { ProductCard } from '@/components/product/ProductCard';
import { CATEGORY_ENTRIES, SORT_OPTIONS, exploreHref, filterFromParams, filterProducts, useCatalog } from '@/lib/services/product.service';
import { assistantService } from '@/lib/services/assistant.service';
import type { ProductFilter, SortKey } from '@/types/product';
import { FilterPanel } from './FilterPanel';
import { ActiveFilterChips, activeChips } from './ActiveFilterChips';

/** Jelajahi — filter disimpan di query string URL. */
export function ExplorePage() {
  const router = useRouter();
  const sp = useSearchParams();
  const f = useMemo(() => filterFromParams(new URLSearchParams(sp.toString())), [sp]);
  const catalog = useCatalog();

  /* Kolom cari: state lokal, dikirim ke URL setelah jeda mengetik atau saat submit. */
  const [q, setQ] = useState(f.q);
  const [urlQ, setUrlQ] = useState(f.q);
  if (f.q !== urlQ) {
    setUrlQ(f.q);
    if (f.q !== q.trim()) setQ(f.q);
  }
  const [open, setOpen] = useState(false);

  const update = useCallback((patch: Partial<ProductFilter>) => {
    router.replace(exploreHref({ ...f, q, ...patch }), { scroll: false });
  }, [router, f, q]);

  useEffect(() => {
    if (q.trim() === f.q) return;
    const t = setTimeout(() => update({ q }), 300);
    return () => clearTimeout(t);
  }, [q, f.q, update]);

  const results = useMemo(() => filterProducts(catalog, f), [catalog, f]);
  const chips = activeChips(f);
  const clearAll = () => { setQ(''); router.replace(exploreHref({ sort: f.sort }), { scroll: false }); };
  const close = useCallback(() => setOpen(false), []);
  const askAI = () => assistantService.ask(f.q ? 'Cari ' + f.q : undefined);
  const onSubmit = (e: FormEvent) => { e.preventDefault(); update({ q }); };

  return (
    <div className="page wrap">
      <div className="ex-head">
        <nav className="crumbs" aria-label="Breadcrumb"><Link href="/">Beranda</Link><span aria-hidden="true">/</span><span aria-current="page">Jelajahi</span></nav>
        <h1 className="h1">Jelajahi Produk</h1>
        <form className="ex-search" role="search" onSubmit={onSubmit}>
          <div className="field-inline">
            <Icon name="search" />
            <label htmlFor="exq" className="sr">Cari produk</label>
            <input id="exq" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nama produk, material, kategori, atau kegunaan" />
          </div>
          <Button type="submit" size="lg">Cari</Button>
        </form>
        <div className="cat-tabs" role="group" aria-label="Kategori">
          <Chip on={f.cat === ''} onClick={() => update({ cat: '' })}>Semua</Chip>
          {CATEGORY_ENTRIES.map(([k, l]) => <Chip key={k} on={f.cat === k} onClick={() => update({ cat: k })}>{l}</Chip>)}
        </div>
      </div>
      <div className="ex-body">
        <FilterPanel f={f} count={results.length} open={open} onClose={close} onChange={update} onReset={clearAll} />
        <section aria-label="Hasil pencarian">
          <div className="ex-toolbar">
            <p aria-live="polite"><b>{results.length}</b> produk{f.q ? <> untuk “{f.q}”</> : null}</p>
            <Button variant="secondary" size="sm" className="only-nav" onClick={() => setOpen(true)}><Icon name="filter" size="s" />Filter ({chips.length})</Button>
            <label htmlFor="sort" className="sr">Urutkan</label>
            <select id="sort" className="input sortsel" value={f.sort} onChange={(e) => update({ sort: e.target.value as SortKey })}>
              {SORT_OPTIONS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </div>
          <ActiveFilterChips chips={chips} onRemove={update} onClearAll={clearAll} />
          <div className="ai-entry">
            <Icon name="chatLines" size="l" style={{ color: '#0B7A43' }} />
            <p><b>Belum ketemu yang pas?</b> Ceritakan budget, fungsi, dan gaya yang kamu cari ke AI Assistant — rekomendasinya diambil dari katalog ini.</p>
            <Button variant="secondary" size="sm" onClick={askAI}>Tanya AI Assistant</Button>
          </div>
          {results.length ? (
            <div className="grid-prod">
              {results.map((p, i) => <ProductCard key={p.id} p={p} showSoldOut priority={i < 2} />)}
            </div>
          ) : (
            <EmptyState
              icon="searchMinus"
              title="Belum ada produk yang cocok"
              actions={<><Button onClick={clearAll}>Reset semua filter</Button><Button variant="secondary" onClick={askAI}>Tanya AI Assistant</Button></>}
            >
              Coba kurangi filter, gunakan kata lain (misalnya “denim” alih-alih “jeans biru”), atau ceritakan kebutuhanmu ke AI Assistant.
            </EmptyState>
          )}
        </section>
      </div>
    </div>
  );
}
