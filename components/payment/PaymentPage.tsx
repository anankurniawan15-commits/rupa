'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Guard } from '@/components/auth/Guard';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Boxes';
import { MobilePayBar } from '@/components/checkout/MobilePayBar';
import { payLabelOf, paymentService, usePayment } from '@/lib/services/payment.service';
import { orderTotal, useOrdersByIds } from '@/lib/services/order.service';
import { getSeller } from '@/lib/services/product.service';
import { hms, rp } from '@/lib/format';
import type { Payment } from '@/types/payment';
import { useNow } from './useNow';
import { copyText } from './copy';
import { Countdown } from './Countdown';
import { VaBox } from './VaBox';
import { PaymentGuideTabs } from './PaymentGuideTabs';
import { QrisBox } from './QrisBox';
import { WalletBox } from './WalletBox';
import { SimulationControls } from './SimulationControls';

export function PaymentPage({ id }: { id: string }) {
  return <Guard need="user">{() => <PaymentView id={id} />}</Guard>;
}

function PaymentView({ id }: { id: string }) {
  const p = usePayment(id);
  const [leaving, setLeaving] = useState(false);
  return (
    <div className="page wrap co-pad">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/pesanan">Pesanan Saya</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Pembayaran</span>
      </nav>
      <h1 className="h1" style={{ marginBottom: 24 }}>Pembayaran</h1>
      {leaving ? (
        <div className="col gap-16" aria-busy="true"><Skeleton w="40%" h={36} /><Skeleton h={200} /></div>
      ) : !p ? (
        <div className="empty">
          <h2 className="h3">Tagihan tidak ditemukan</h2>
          <p>Tagihan ini tidak ada atau sudah tidak berlaku. Cek status pesananmu di Pesanan Saya.</p>
          <ButtonLink href="/pesanan">Lihat Pesanan Saya</ButtonLink>
        </div>
      ) : p.status === 'paid' ? (
        <div className="empty">
          <h2 className="h3">Tidak ada tagihan aktif</h2>
          <p>Semua pesananmu sudah dibayar atau dibatalkan.</p>
          <ButtonLink href="/pesanan">Lihat Pesanan Saya</ButtonLink>
        </div>
      ) : (
        <Bill p={p} onLeave={() => setLeaving(true)} />
      )}
    </div>
  );
}


function Bill({ p, onLeave }: { p: Payment; onLeave: () => void }) {
  const router = useRouter();
  const now = useNow();
  const orders = useOrdersByIds(p.orderIds);
  const [checking, setChecking] = useState(false);
  const [checkMsg, setCheckMsg] = useState('');

  const left = p.deadline - now;
  const timeUp = p.status === 'pending' && now > 0 && left <= 0;
  const expired = p.status === 'expired' || timeUp;

  // Hitung mundur habis → tagihan kedaluwarsa, pesanan dibatalkan otomatis.
  useEffect(() => {
    if (timeUp) void paymentService.expire(p.id);
  }, [timeUp, p.id]);

  const simPaid = async () => {
    onLeave();
    await paymentService.simulatePaid(p.id);
    router.push('/checkout/berhasil');
  };
  const check = async () => {
    setChecking(true);
    setCheckMsg('');
    const r = await paymentService.check(p.id);
    if (r.paid) { onLeave(); router.push('/checkout/berhasil'); return; }
    setCheckMsg(r.msg);
    setChecking(false);
  };
  const checkLabel = checking ? 'Memeriksa…' : 'Saya sudah bayar, cek status';

  if (expired) {
    return (
      <div className="state-card" role="alert">
        <span className="state-ic err"><Icon name="clock" size="l" /></span>
        <h2 className="h2">Batas waktu pembayaran habis</h2>
        <p className="muted">Pesanan {p.orderIds.join(', ')} dibatalkan otomatis dan stok dikembalikan ke penjual. Kamu bisa memesan ulang kapan saja.</p>
        <div className="row gap-8 wrapf">
          <ButtonLink href="/jelajahi">Belanja lagi</ButtonLink>
          <ButtonLink href="/pesanan" variant="secondary">Lihat pesanan</ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="pay-grid">
        <div className="col gap-16">
          <Countdown left={left} deadline={p.deadline} />
          <section className="panel col gap-16">
            <div className="row between center wrapf gap-8">
              <div className="col"><span className="mono-label">Total tagihan</span><span className="price-xl">{rp(p.amount)}</span></div>
              <Button variant="secondary" size="sm" onClick={() => copyText(String(p.amount), 'Jumlah tagihan disalin')}>Salin jumlah</Button>
            </div>
            <div className="row between center wrapf gap-8" style={{ paddingTop: 12, borderTop: '1px solid #E2E2E2' }}>
              <span className="muted">Metode</span><b>{payLabelOf(p)}</b>
            </div>
            {p.method === 'va' ? (
              <div className="col gap-12">
                <VaBox bank={p.bank} va={p.va} />
                <PaymentGuideTabs bank={p.bank} />
              </div>
            ) : null}
            {p.method === 'qris' ? <QrisBox /> : null}
            {p.method === 'ewallet' ? <WalletBox wallet={p.wallet} /> : null}
          </section>
          <SimulationControls onPaid={() => void simPaid()} onExpire={() => void paymentService.expire(p.id)} />
        </div>
        <aside className="summary" aria-label="Ringkasan tagihan">
          <h2 className="h3">Ringkasan tagihan</h2>
          {p.orderIds.map((oid) => {
            const o = orders.find((x) => x.id === oid);
            return (
              <div className="sum-row" key={oid}>
                <span><b>{oid}</b><span className="fine" style={{ display: 'block' }}>{o ? getSeller(o.seller)?.name : ''}</span></span>
                <span>{o ? rp(orderTotal(o)) : ''}</span>
              </div>
            );
          })}
          <div className="sum-row sum-total"><span>Total</span><span>{rp(p.amount)}</span></div>
          {checkMsg ? (
            <div className="notice" role="status"><Icon name="clock" /><span>{checkMsg}</span></div>
          ) : null}
          <Button size="lg" block onClick={() => void check()} disabled={checking}>{checkLabel}</Button>
          <ButtonLink href="/pesanan" variant="ghost" block>Bayar nanti</ButtonLink>
          <p className="fine">Satu tagihan untuk semua paket. Dana tiap penjual ditahan sampai paketnya kamu konfirmasi diterima.</p>
        </aside>
      </div>
      <MobilePayBar label="Sisa waktu" value={hms(left)} mono actionLabel={checkLabel} onAction={() => void check()} disabled={checking} />
    </>
  );
}
