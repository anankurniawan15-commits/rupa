'use client';
import Image from 'next/image';
import { useState } from 'react';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { ConfirmDialog } from '@/components/ui/Modal';
import { toast } from '@/lib/store/toast';
import { rp } from '@/lib/format';
import { productService } from '@/lib/services/product.service';
import { LISTING_FILTERS, LISTING_STATUS_LABEL } from '@/lib/services/seller.service';
import type { Listing } from '@/types/product';

export function ListingsTab({ listings, filter, setFilter, onEdit, onNew }: { listings: Listing[]; filter: string; setFilter: (f: string) => void; onEdit: (l: Listing) => void; onNew: () => void }) {
  const [pause, setPause] = useState<Listing | null>(null);
  const list = listings.filter((l) => filter === 'all' || l.status === filter);
  const toggle = (l: Listing) => {
    if (l.status === 'aktif') { setPause(l); return; }
    if (l.stock < 1) { toast('Tambah stok dulu sebelum mengaktifkan', { kind: 'warn', actionLabel: 'Edit', action: () => onEdit(l) }); return; }
    void productService.setStatus(l.id, 'aktif');
    toast('Listing aktif dan tampil di pencarian');
  };
  return (
    <div>
      <div className="chips" role="group" aria-label="Filter status listing" style={{ marginBottom: 12 }}>
        {LISTING_FILTERS.map(([k, l]) => <Chip key={k} on={filter === k} onClick={() => setFilter(k)}>{l}</Chip>)}
      </div>
      <div className="lrow lhead" aria-hidden="true"><span /><span>Produk</span><span>Status</span><span>Stok</span><span>Harga</span><span /></div>
      {list.map((l) => (
        <div key={l.id} className="lrow">
          <span className="lthumb" style={{ position: 'relative' }}>
            {l.img ? <Image className="cover" src={l.img} alt="" fill sizes="60px" unoptimized={l.img.startsWith('blob:')} /> : <span className={'ph ph-' + (l.ph || 'textile')} />}
          </span>
          <div className="col gap-4 lmeta"><b style={{ fontSize: 14.5 }}>{l.title}</b><span className="fine">{rp(l.price) + ' · stok ' + l.stock + ' · ' + l.views + ' kali dilihat'}</span></div>
          <span className="lc"><span className={'st st-' + l.status}>{LISTING_STATUS_LABEL[l.status]}</span></span>
          <span className="lc">{l.stock}</span>
          <span className="lc">{rp(l.price)}</span>
          <div className="row-actions lmeta">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => onEdit(l)}><Icon name="edit" size="s" />Edit</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => toggle(l)}>{l.status === 'aktif' ? 'Jeda' : l.status === 'draf' ? 'Terbitkan' : 'Aktifkan'}</button>
          </div>
        </div>
      ))}
      {list.length === 0 ? (
        <div className="empty mt-24">
          <span className="empty-ic"><Icon name="store" size="l" /></span>
          <h2 className="h3">Tidak ada listing dengan status ini</h2>
          <p>Coba filter lain, atau buat listing baru dengan bantuan asisten AI.</p>
          <button type="button" className="btn btn-primary" onClick={onNew}>Buat listing</button>
        </div>
      ) : null}
      <ConfirmDialog
        open={!!pause}
        title="Jeda listing ini?"
        body={pause ? '“' + pause.title + '” tidak akan tampil di pencarian sampai kamu mengaktifkannya lagi. Pesanan yang sudah masuk tetap berjalan.' : ''}
        confirmLabel="Jeda listing"
        onConfirm={() => { if (pause) void productService.setStatus(pause.id, 'dijeda'); setPause(null); toast('Listing dijeda', { kind: 'info' }); }}
        onClose={() => setPause(null)}
      />
    </div>
  );
}
