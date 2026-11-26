'use client';
import { calcPrice } from '@/lib/services/listing-assist.service';
import { rp } from '@/lib/format';
import type { SellUi } from './types';

/** Kalkulator harga: (bahan + jam × tarif) × 1,3, dibulatkan ke Rp5.000. */
export function PriceCalculator({ ui, onChange, onUse }: { ui: SellUi; onChange: (k: 'calcMat' | 'calcHours' | 'calcRate', v: string) => void; onUse: (price: number) => void }) {
  const c = calcPrice(ui.calcMat, ui.calcHours, ui.calcRate);
  return (
    <div className="col gap-12">
      <h3 className="h4">Hitung dari biaya dan waktumu</h3>
      <div className="calc">
        <div className="field"><label className="lbl" htmlFor="c-mat">Biaya bahan (Rp)</label><input id="c-mat" className="input" inputMode="numeric" value={ui.calcMat} onChange={(e) => onChange('calcMat', e.target.value)} placeholder="25000" /></div>
        <div className="field"><label className="lbl" htmlFor="c-h">Jam kerja</label><input id="c-h" className="input" inputMode="decimal" value={ui.calcHours} onChange={(e) => onChange('calcHours', e.target.value)} placeholder="3" /></div>
        <div className="field"><label className="lbl" htmlFor="c-r">Tarif per jam (Rp)</label><input id="c-r" className="input" inputMode="numeric" value={ui.calcRate} onChange={(e) => onChange('calcRate', e.target.value)} /></div>
        <div className="calc-out" aria-live="polite">
          <span>{c.has ? 'Biaya ' + rp(c.cost) + ' + margin 30% ≈ ' + rp(c.price) : 'Isi ketiga kolom untuk melihat harga minimal yang menutup biaya dan waktumu.'}</span>
          {c.has ? <button type="button" className="btn btn-secondary btn-sm" onClick={() => onUse(c.price)}>Pakai {rp(c.price)}</button> : null}
        </div>
      </div>
    </div>
  );
}
