'use client';
import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { CONDITION_ENTRIES, MATERIAL_ENTRIES, PRICE_OPTIONS, SELLER_CITIES, materialCount } from '@/lib/services/product.service';
import { cx } from '@/lib/format';
import type { ProductFilter } from '@/types/product';

const toggleIn = <T,>(arr: T[], v: T) => (arr.indexOf(v) >= 0 ? arr.filter((x) => x !== v) : [...arr, v]);

/** Panel filter Jelajahi. ≤900 px menjadi panel layar penuh (`.filters.is-open`). */
export function FilterPanel({ f, count, open, onClose, onChange, onReset }: {
  f: ProductFilter; count: number; open: boolean; onClose: () => void; onChange: (patch: Partial<ProductFilter>) => void; onReset: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <aside className={cx('filters', open && 'is-open')} aria-label="Filter produk">
      <div className="f-head">
        <h2 className="h4">Filter</h2>
        <button type="button" className="iconbtn only-nav" onClick={onClose} aria-label="Tutup filter"><Icon name="close" /></button>
      </div>
      <fieldset>
        <legend>Harga</legend>
        {PRICE_OPTIONS.map(([v, l]) => (
          <label key={v || 'all'} className="check"><input type="radio" name="f-price" checked={f.price === v} onChange={() => onChange({ price: v })} />{l}</label>
        ))}
      </fieldset>
      <fieldset>
        <legend>Material</legend>
        {MATERIAL_ENTRIES.map(([m, l]) => (
          <label key={m} className="check">
            <input type="checkbox" checked={f.mats.indexOf(m) >= 0} onChange={() => onChange({ mats: toggleIn(f.mats, m) })} />{l}
            <span className="muted" style={{ marginLeft: 'auto', fontSize: 12.5 }}>{materialCount(m)}</span>
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend>Kondisi</legend>
        {CONDITION_ENTRIES.map(([c, l]) => (
          <label key={c} className="check"><input type="checkbox" checked={f.conds.indexOf(c) >= 0} onChange={() => onChange({ conds: toggleIn(f.conds, c) })} />{l}</label>
        ))}
      </fieldset>
      <fieldset>
        <legend>Lokasi penjual</legend>
        <label htmlFor="f-city" className="sr">Lokasi penjual</label>
        <select id="f-city" className="input" value={f.city} onChange={(e) => onChange({ city: e.target.value })}>
          <option value="">Semua lokasi</option>
          {SELLER_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </fieldset>
      <fieldset>
        <legend>Penjual dan stok</legend>
        <label className="check"><input type="checkbox" checked={f.r47} onChange={() => onChange({ r47: !f.r47 })} />Rating penjual 4,7 ke atas</label>
        <label className="check"><input type="checkbox" checked={f.avail} onChange={() => onChange({ avail: !f.avail })} />Sembunyikan yang stoknya habis</label>
      </fieldset>
      <div className="col gap-8">
        <Button block className="only-nav" onClick={onClose}>Tampilkan {count} produk</Button>
        <Button block variant="secondary" onClick={onReset}>Reset filter</Button>
      </div>
    </aside>
  );
}
