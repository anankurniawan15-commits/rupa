import { PH_LABEL } from '@/lib/data/placeholder';
import type { PlaceholderKind } from '@/types/product';

/**
 * Placeholder foto jujur berpola material (`.ph-wood` dst.) dengan label
 * "Ilustrasi … · foto menyusul". Jangan diganti foto stok.
 */
export function Placeholder({ kind = 'textile', label, noLabel }: { kind?: PlaceholderKind | null; label?: string; noLabel?: boolean }) {
  const k = kind || 'textile';
  return (
    <span className={'ph ph-' + k} role="img" aria-label={label || 'Ilustrasi ' + PH_LABEL[k] + ', foto menyusul'}>
      {noLabel ? null : <span className="ph-tag">{label || 'Ilustrasi ' + PH_LABEL[k] + ' · foto menyusul'}</span>}
    </span>
  );
}
