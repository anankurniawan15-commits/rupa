'use client';
import { Guard } from '@/components/auth/Guard';
import { ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { StatusPill } from '@/components/ui/Chip';
import { orderStatusLabel, useLastSuccess, useOrdersByIds } from '@/lib/services/order.service';
import { getSeller } from '@/lib/services/product.service';

export function SuccessPage() {
  return <Guard need="user">{() => <SuccessView />}</Guard>;
}

function SuccessView() {
  const last = useLastSuccess();
  const orders = useOrdersByIds(last.orderIds);
  return (
    <div className="page wrap">
      <div className="success">
        <span className="succ-ic"><Icon name="check" size="l" /></span>
        <p className="eyebrow">Simulasi berhasil</p>
        <h1 className="h1">{last.title}</h1>
        <p className="muted">{last.text}</p>
        <div className="col gap-8 w100">
          {orders.map((o) => (
            <div key={o.id} className="sum-row panel" style={{ padding: '14px 18px' }}>
              <span><b>{o.id}</b> · {getSeller(o.seller)?.name}</span>
              <StatusPill status={o.status}>{orderStatusLabel(o.status)}</StatusPill>
            </div>
          ))}
        </div>
        <div className="row gap-8 wrapf" style={{ justifyContent: 'center' }}>
          <ButtonLink href="/pesanan" size="lg">Lihat Pesanan Saya</ButtonLink>
          <ButtonLink href="/jelajahi" variant="secondary" size="lg">Lanjut belanja</ButtonLink>
        </div>
      </div>
    </div>
  );
}
