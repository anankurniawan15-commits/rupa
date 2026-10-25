'use client';
import { useState } from 'react';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { ChatModal } from '@/components/modals/SharedModals';
import { toast } from '@/lib/store/toast';
import { rp } from '@/lib/format';
import { orderService, sellerOrderStatusLabel } from '@/lib/services/order.service';
import { ORDER_FILTERS } from '@/lib/services/seller.service';
import type { SellerOrder } from '@/types/order';
import { ResiModal } from './ResiModal';

export function OrdersTab({ orders, filter, setFilter }: { orders: SellerOrder[]; filter: string; setFilter: (f: string) => void }) {
  const [resiFor, setResiFor] = useState<SellerOrder | null>(null);
  const [chatFor, setChatFor] = useState<SellerOrder | null>(null);
  const list = orders.filter((o) => filter === 'all' || o.status === filter);
  return (
    <div>
      <div className="chips" role="group" aria-label="Filter status pesanan" style={{ marginBottom: 12 }}>
        {ORDER_FILTERS.map(([k, l]) => <Chip key={k} on={filter === k} onClick={() => setFilter(k)}>{l}</Chip>)}
      </div>
      {list.map((o) => (
        <div key={o.id} className="orow">
          <div className="col gap-4"><b style={{ fontSize: 14 }}>{o.id}</b><span className="fine">{o.date}</span></div>
          <div className="col gap-4 oc"><span style={{ fontSize: 14.5 }}>{o.items}</span><span className="fine">Pembeli: {o.buyer}{o.resi ? ' · resi ' + o.resi : ''}</span></div>
          <span className="oc" style={{ fontWeight: 700 }}>{rp(o.total)}</span>
          <span><span className={'st st-' + o.status}>{sellerOrderStatusLabel(o.status)}</span></span>
          <div className="row-actions">
            {o.status === 'baru' ? (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => { void orderService.pack(o.id); toast('Pesanan diterima. Kemas dan kirim dalam 2 hari kerja'); }}>Terima dan kemas</button>
            ) : null}
            {o.status === 'dikemas' ? <button type="button" className="btn btn-primary btn-sm" onClick={() => setResiFor(o)}>Input nomor resi</button> : null}
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setChatFor(o)}>Chat pembeli</button>
          </div>
        </div>
      ))}
      {list.length === 0 ? (
        <div className="empty mt-24">
          <span className="empty-ic"><Icon name="box" size="l" /></span>
          <h2 className="h3">Belum ada pesanan di sini</h2>
          <p>Pesanan dengan status ini akan muncul di sini. Kamu juga akan mendapat notifikasi.</p>
        </div>
      ) : null}
      <ResiModal
        open={!!resiFor}
        sub={resiFor ? resiFor.id + ' · ' + resiFor.items : ''}
        onSubmit={(resi) => { if (resiFor) void orderService.ship(resiFor.id, resi); setResiFor(null); toast('Pesanan ditandai dikirim. Pembeli mendapat notifikasi (simulasi)'); }}
        onClose={() => setResiFor(null)}
      />
      <ChatModal
        open={!!chatFor}
        threadKey={chatFor ? 'buyer-' + chatFor.id : ''}
        title="Chat dengan pembeli"
        sub={chatFor ? chatFor.buyer + ' · ' + chatFor.id : ''}
        onClose={() => setChatFor(null)}
      />
    </div>
  );
}
