'use client';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Avatar } from '@/components/ui/Chip';
import { productHref } from '@/components/product/ProductCard';
import { cartService, type CartGroup as Group } from '@/lib/services/cart.service';
import { rp } from '@/lib/format';
import { ItemThumb } from './ItemThumb';

/** Satu paket (per penjual) di keranjang. */
export function CartGroup({ g, n }: { g: Group; n: number }) {
  return (
    <section className="grp" aria-label={'Paket dari ' + g.seller.name}>
      <div className="grp-h">
        <div className="row gap-12 center">
          <Avatar initials={g.seller.initials} size="m" />
          <div className="col">
            <b>{g.seller.name}</b>
            <span className="fine">Paket {n} · dikirim dari {g.seller.city}</span>
          </div>
        </div>
        <span className="fine">Subtotal {rp(g.subtotal)}</span>
      </div>
      {g.items.map(({ p, qty }) => (
        <div className="citem" key={p.id}>
          <ItemThumb p={p} />
          <div className="col gap-4">
            <span className="mat-tag">{p.matShort}</span>
            <Link className="linkbtn" style={{ fontWeight: 600 }} href={productHref(p.id)}>{p.title}</Link>
            <span className="pc-price">{rp(p.price)}</span>
            <span className="fine">{p.stock === 1 ? 'Satu-satunya' : 'Stok ' + p.stock}</span>
          </div>
          <div className="c-r">
            <div className="stepper" role="group" aria-label={'Jumlah ' + p.title}>
              <button type="button" onClick={() => void cartService.setQty(p.id, qty - 1)} aria-label="Kurangi"><Icon name="minus" size="s" /></button>
              <output aria-live="polite">{qty}</output>
              <button type="button" onClick={() => void cartService.setQty(p.id, qty + 1)} disabled={qty >= p.stock} aria-label="Tambah"><Icon name="plus" size="s" /></button>
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => void cartService.remove(p.id)}>
              <Icon name="trash" size="s" />Hapus
            </button>
          </div>
        </div>
      ))}
    </section>
  );
}
