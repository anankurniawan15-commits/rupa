'use client';
import { Button } from '@/components/ui/Button';
import { RemovableChip } from '@/components/ui/Chip';
import { PRICE_LABEL, categoryLabel, conditionLabel, getSeller, materialLabel } from '@/lib/services/product.service';
import type { ProductFilter } from '@/types/product';

export interface ActiveChip { key: string; label: string; patch: Partial<ProductFilter> }

/** Daftar filter aktif (urutan seperti prototipe). */
export function activeChips(f: ProductFilter): ActiveChip[] {
  const chips: ActiveChip[] = [];
  if (f.cat) chips.push({ key: 'cat', label: categoryLabel(f.cat), patch: { cat: '' } });
  f.mats.forEach((m) => chips.push({ key: 'm-' + m, label: materialLabel(m), patch: { mats: f.mats.filter((x) => x !== m) } }));
  if (f.price) chips.push({ key: 'price', label: PRICE_LABEL[f.price], patch: { price: '' } });
  f.conds.forEach((c) => chips.push({ key: 'c-' + c, label: conditionLabel(c), patch: { conds: f.conds.filter((x) => x !== c) } }));
  if (f.city) chips.push({ key: 'city', label: f.city, patch: { city: '' } });
  if (f.r47) chips.push({ key: 'r47', label: 'Rating 4,7+', patch: { r47: false } });
  if (f.avail) chips.push({ key: 'avail', label: 'Stok tersedia', patch: { avail: false } });
  if (f.seller) chips.push({ key: 'seller', label: 'Penjual: ' + getSeller(f.seller).name, patch: { seller: '' } });
  return chips;
}

export function ActiveFilterChips({ chips, onRemove, onClearAll }: { chips: ActiveChip[]; onRemove: (patch: Partial<ProductFilter>) => void; onClearAll: () => void }) {
  if (!chips.length) return null;
  return (
    <div className="chips" style={{ marginBottom: 16 }} aria-label="Filter aktif">
      {chips.map((c) => <RemovableChip key={c.key} label={c.label} onRemove={() => onRemove(c.patch)} />)}
      <Button variant="ghost" size="sm" onClick={onClearAll}>Hapus semua</Button>
    </div>
  );
}
