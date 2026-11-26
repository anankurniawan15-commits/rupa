'use client';
import { Button } from '@/components/ui/Button';
import { StatusPill } from '@/components/ui/Chip';
import { ItemThumb } from '@/components/checkout/ItemThumb';
import { orderStatusLabel, orderTotal, timelineIndex } from '@/lib/services/order.service';
import { getProduct, getSeller } from '@/lib/services/product.service';
import { rp } from '@/lib/format';
import type { Order } from '@/types/order';
import { OrderTimeline } from './OrderTimeline';

export type OrderAction = 'chat' | 'dispute' | 'cancel' | 'pay' | 'receive' | 'review' | 'rebuy';

/** Kartu pesanan (`.ord`) dengan aksi sesuai status. */
export function OrderCard({ o, showTl, onToggleTl, onAction }: { o: Order; showTl: boolean; onToggleTl: () => void; onAction: (a: OrderAction) => void }) {
  const s = getSeller(o.seller);
  const idx = timelineIndex(o.status);
  const hasTl = idx !== undefined;
  const note = o.note || (o.resi ? 'Nomor resi: ' + o.resi : '');
  const st = o.status;
  return (
    <article className="ord" aria-label={'Pesanan ' + o.id}>
      <div className="ord-h">
        <div className="col"><b>{o.id}</b><span className="fine">{o.date} · {s?.name}, {s?.city}</span></div>
        <StatusPill status={st}>{orderStatusLabel(st)}</StatusPill>
      </div>
      <div className="col gap-8">
        {o.items.map((it) => {
          const p = getProduct(it.id);
          if (!p) return null;
          return (
            <div className="oi" key={it.id}>
              <ItemThumb p={p} className="oi-th" sizes="56px" />
              <div className="col"><span style={{ fontWeight: 600 }}>{p.title}</span><span className="fine">{it.qty} × {rp(p.price)}</span></div>
            </div>
          );
        })}
      </div>
      {note ? <p className="fine">{note}</p> : null}
      {hasTl && showTl ? <OrderTimeline idx={idx} resi={o.resi} /> : null}
      <div className="row between center wrapf gap-12" style={{ paddingTop: 12, borderTop: '1px solid #E2E2E2' }}>
        <span>Total <b>{rp(orderTotal(o)) + ' (termasuk ongkir ' + rp(o.ship) + ')'}</b></span>
        <div className="row gap-8 wrapf">
          {hasTl ? <Button variant="ghost" size="sm" onClick={onToggleTl} aria-expanded={showTl}>{showTl ? 'Sembunyikan status' : 'Lacak pesanan'}</Button> : null}
          <Button variant="ghost" size="sm" onClick={() => onAction('chat')}>Chat penjual</Button>
          {st === 'dikirim' || st === 'selesai' ? <Button variant="ghost" size="sm" onClick={() => onAction('dispute')}>Ajukan bantuan</Button> : null}
          {st === 'menunggu' || st === 'dikemas' ? <Button variant="secondary" size="sm" onClick={() => onAction('cancel')}>Batalkan</Button> : null}
          {st === 'menunggu' ? <Button size="sm" onClick={() => onAction('pay')}>Bayar sekarang</Button> : null}
          {st === 'dikirim' ? <Button size="sm" onClick={() => onAction('receive')}>Pesanan diterima</Button> : null}
          {st === 'selesai' && !o.reviewed ? <Button size="sm" onClick={() => onAction('review')}>Beri ulasan</Button> : null}
          {st === 'dibatalkan' || (st === 'selesai' && o.reviewed) ? <Button variant="secondary" size="sm" onClick={() => onAction('rebuy')}>Beli lagi</Button> : null}
        </div>
      </div>
    </article>
  );
}
