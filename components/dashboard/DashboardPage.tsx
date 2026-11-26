'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Guard } from '@/components/auth/Guard';
import { Tabs } from '@/components/ui/Tabs';
import { Icon } from '@/components/ui/Icon';
import { toast } from '@/lib/store/toast';
import { listingAssistService } from '@/lib/services/listing-assist.service';
import { SHOP_STATUS, pendingOrderCount, sellerAlerts, sellerKpis, useSellerData, type SellerAlert } from '@/lib/services/seller.service';
import type { Account } from '@/types/user';
import type { Listing } from '@/types/product';
import { useUrlTab } from './useUrlTab';
import { OverviewTab } from './OverviewTab';
import { ListingsTab } from './ListingsTab';
import { OrdersTab } from './OrdersTab';
import { ReviewsTab } from './ReviewsTab';

const TABS = ['overview', 'listings', 'orders', 'reviews'] as const;
type TabKey = (typeof TABS)[number];
const VER_LABEL = { verified: 'Toko terverifikasi', pending: 'Menunggu verifikasi admin', rejected: 'Verifikasi ditolak' } as const;

export function DashboardPage() {
  return <Guard need="seller">{(me) => <Dashboard me={me} />}</Guard>;
}

function Dashboard({ me }: { me: Account }) {
  const router = useRouter();
  const data = useSellerData(me.id);
  const shop = me.shop;
  const [tab, setTab] = useUrlTab<TabKey>(TABS, 'overview');
  const [lf, setLf] = useState('all');
  const [of, setOf] = useState('all');

  const newListing = () => {
    listingAssistService.seedDraft(shop ? { city: shop.city } : {});
    router.push('/jual');
  };
  const editListing = (l: Listing) => {
    listingAssistService.seedFromListing(l);
    router.push('/jual');
    toast('Mode edit — perubahan tersimpan saat kamu menyimpan di langkah terakhir', { kind: 'info' });
  };
  const onAlert = (a: SellerAlert) => {
    if (a.kind === 'pending') newListing();
    else if (a.kind === 'rejected') toast('Pusat bantuan belum tersedia di prototipe', { kind: 'info' });
    else if (a.kind === 'order') { setOf('all'); setTab('orders'); }
    else if (a.kind === 'stock') editListing(a.listing);
    else { setLf('draf'); setTab('listings'); }
  };

  const meta = shop ? shop.city + ' · bergabung ' + (me.joined || 'Oktober 2026') + (data.rating ? ' · ★ ' + data.rating.value + ' dari ' + data.rating.count + ' ulasan' : ' · belum ada ulasan') : '';

  return (
    <div className="page wrap">
      <div className="row between wrapf gap-16" style={{ alignItems: 'flex-end' }}>
        <div className="col gap-8">
          <p className="eyebrow">Dashboard Penjual</p>
          <h1 className="h1">{shop?.name}</h1>
          <p className="muted row gap-8 center wrapf">
            <span>{meta}</span>
            {shop ? <span className={SHOP_STATUS[shop.status][0]}>{VER_LABEL[shop.status]}</span> : null}
          </p>
        </div>
        <div className="row gap-8 wrapf">
          <button type="button" className="btn btn-secondary" onClick={() => toast('Halaman toko publik belum tersedia di prototipe', { kind: 'info' })}>Lihat toko</button>
          <button type="button" className="btn btn-primary" onClick={newListing}><Icon name="plus" />Listing baru</button>
        </div>
      </div>
      <Tabs<TabKey>
        label="Bagian dashboard"
        value={tab}
        onChange={setTab}
        items={[
          { key: 'overview', label: 'Ringkasan' },
          { key: 'listings', label: 'Produk', count: data.listings.length },
          { key: 'orders', label: 'Pesanan', count: pendingOrderCount(data.orders) },
          { key: 'reviews', label: 'Ulasan', count: data.reviews.filter((r) => !r.reply).length },
        ]}
      />
      {tab === 'overview' ? <OverviewTab kpis={sellerKpis(data)} weeks={data.weeks} alerts={sellerAlerts(shop, data)} onAct={onAlert} /> : null}
      {tab === 'listings' ? <ListingsTab listings={data.listings} filter={lf} setFilter={setLf} onEdit={editListing} onNew={newListing} /> : null}
      {tab === 'orders' ? <OrdersTab orders={data.orders} filter={of} setFilter={setOf} /> : null}
      {tab === 'reviews' ? <ReviewsTab reviews={data.reviews} /> : null}
    </div>
  );
}
