'use client';
import { RadioCard } from '@/components/ui/Field';
import { shipOptions } from '@/lib/services/checkout.service';
import type { CartGroup } from '@/lib/services/cart.service';
import { rp } from '@/lib/format';

export const itemsText = (g: CartGroup) => g.items.map((it) => it.p.title + ' × ' + it.qty).join(', ');

/** Pilihan kurir (Reguler/Ekspres) untuk satu paket. */
export function ShippingOptions({ g, n, city, value, onPick }: { g: CartGroup; n: number; city: string; value: 'reg' | 'exp'; onPick: (v: 'reg' | 'exp') => void }) {
  const opts = shipOptions(g.seller.city, city);
  return (
    <section className="panel col gap-12" aria-label={'Pengiriman paket ' + n}>
      <div className="row between wrapf gap-8">
        <div className="col">
          <h2 className="h3">Paket {n} · {g.seller.name}</h2>
          <span className="fine">Dari {g.seller.city} · {itemsText(g)}</span>
        </div>
      </div>
      <fieldset>
        <legend className="sr">Metode pengiriman paket {n}</legend>
        <div className="radio-cards">
          {opts.map((o) => (
            <RadioCard key={o.id} name={'ship-' + g.sid} title={o.label + ' · ' + rp(o.cost)} desc={'Estimasi ' + o.eta} checked={value === o.id} onSelect={() => onPick(o.id)} />
          ))}
        </div>
      </fieldset>
    </section>
  );
}
