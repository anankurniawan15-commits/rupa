'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Guard } from '@/components/auth/Guard';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Boxes';
import { ConfirmDialog } from '@/components/ui/Modal';
import { ChatModal, ReasonModal, ReviewModal } from '@/components/modals/SharedModals';
import { ORDER_TABS, inOrderTab, orderService, orderTotal, useMyOrders } from '@/lib/services/order.service';
import { paymentService } from '@/lib/services/payment.service';
import { cartService } from '@/lib/services/cart.service';
import { DISPUTE_REASONS, moderationService } from '@/lib/services/moderation.service';
import { getProduct, getSeller } from '@/lib/services/product.service';
import { toast } from '@/lib/store/toast';
import { cx } from '@/lib/format';
import type { Account } from '@/types/user';
import type { Order } from '@/types/order';
import { OrderCard, type OrderAction } from './OrderCard';

type TabKey = (typeof ORDER_TABS)[number][0];

export function OrdersPage() {
  return <Guard need="user">{(me) => <OrdersView me={me} />}</Guard>;
}

function OrdersView({ me }: { me: Account }) {
  const router = useRouter();
  const orders = useMyOrders();
  const [tab, setTab] = useState<TabKey>('all');
  const [openTl, setOpenTl] = useState<Record<string, boolean>>({ 'UPL-2610-0388': true });
  const [confirm, setConfirm] = useState<{ kind: 'cancel' | 'receive'; o: Order } | null>(null);
  const [review, setReview] = useState<{ oid: string; sub: string } | null>(null);
  const [dispute, setDispute] = useState<Order | null>(null);
  const [chat, setChat] = useState<Order | null>(null);

  // Tagihan yang lewat batas waktu → pesanan dibatalkan otomatis.
  useEffect(() => { void paymentService.expireOverdue(); }, []);

  const sellerName = (o: Order) => getSeller(o.seller)?.name || '';
  const list = orders.filter((o) => inOrderTab(o, tab));

  const act = async (o: Order, a: OrderAction) => {
    if (a === 'chat') setChat(o);
    else if (a === 'dispute') setDispute(o);
    else if (a === 'cancel' || a === 'receive') setConfirm({ kind: a, o });
    else if (a === 'review') setReview({ oid: o.id, sub: o.items.map((it) => getProduct(it.id)?.title || '').join(', ') });
    else if (a === 'pay') {
      const pid = await paymentService.openFor(o.id);
      if (pid) router.push('/pembayaran/' + pid);
    } else if (a === 'rebuy') {
      for (const it of o.items) await cartService.add(it.id, 1, { silent: true });
      router.push('/keranjang');
    }
  };

  const onConfirm = async () => {
    if (!confirm) return;
    const { kind, o } = confirm;
    setConfirm(null);
    if (kind === 'cancel') {
      await orderService.cancel(o.id);
      toast('Pesanan dibatalkan', { kind: 'info' });
    } else {
      await orderService.confirm(o.id);
      toast('Terima kasih! Jangan lupa beri ulasan', { actionLabel: 'Beri ulasan', action: () => setReview({ oid: o.id, sub: sellerName(o) }) });
    }
  };

  return (
    <div className="page wrap" style={{ maxWidth: 980 }}>
      <h1 className="h1">Pesanan Saya</h1>
      <div className="tabs" role="tablist" aria-label="Status pesanan">
        {ORDER_TABS.map(([k, l]) => (
          <button key={k} type="button" className={cx('tab', tab === k && 'is-on')} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>
            {l}<span className="count">{orders.filter((o) => inOrderTab(o, k)).length}</span>
          </button>
        ))}
      </div>
      {list.map((o) => (
        <OrderCard
          key={o.id}
          o={o}
          showTl={!!openTl[o.id]}
          onToggleTl={() => setOpenTl((x) => ({ ...x, [o.id]: !x[o.id] }))}
          onAction={(a) => void act(o, a)}
        />
      ))}
      {list.length === 0 ? (
        <EmptyState icon="box" title="Belum ada pesanan di sini" actions={<ButtonLink href="/jelajahi">Jelajahi Produk</ButtonLink>}>
          Pesanan dengan status ini akan muncul di sini.
        </EmptyState>
      ) : null}

      <ConfirmDialog
        open={confirm?.kind === 'cancel'}
        title={'Batalkan pesanan ' + (confirm?.o.id || '') + '?'}
        body="Pembatalan hanya bisa dilakukan sebelum penjual mengirim paket. Dana akan dikembalikan ke metode pembayaranmu (simulasi). Paket dari penjual lain tidak terpengaruh."
        confirmLabel="Ya, batalkan"
        danger
        onConfirm={() => void onConfirm()}
        onClose={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm?.kind === 'receive'}
        title="Pesanan sudah diterima?"
        body="Pastikan barang sudah kamu periksa. Setelah dikonfirmasi, dana diteruskan ke penjual (simulasi) dan kamu bisa memberi ulasan."
        confirmLabel="Ya, sudah diterima"
        onConfirm={() => void onConfirm()}
        onClose={() => setConfirm(null)}
      />
      <ReviewModal
        open={!!review}
        sub={review?.sub}
        onClose={() => setReview(null)}
        onSubmit={(stars, text) => {
          if (!review) return;
          void orderService.review(review.oid, stars, text);
          setReview(null);
          toast('Terima kasih! Ulasanmu tampil dengan tanda pembelian terverifikasi');
        }}
      />
      <ReasonModal
        open={!!dispute}
        title="Ajukan bantuan"
        sub={dispute ? dispute.id + ' · ' + sellerName(dispute) : undefined}
        legend="Apa yang terjadi?"
        reasons={DISPUTE_REASONS}
        note="Tim bantuan akan menengahi antara kamu dan penjual. Simpan foto kemasan dan barangnya (simulasi)."
        submitLabel="Ajukan bantuan"
        onClose={() => setDispute(null)}
        onSubmit={(reason) => {
          if (!dispute) return;
          void moderationService.createDispute(dispute.id, sellerName(dispute), orderTotal(dispute), reason, me.name);
          setDispute(null);
          toast('Permintaan bantuan dibuat. Tim akan menghubungimu (simulasi)');
        }}
      />
      <ChatModal
        open={!!chat}
        threadKey={chat?.seller || ''}
        title={'Chat dengan ' + (chat ? sellerName(chat) : '')}
        sub={chat ? 'Pesanan ' + chat.id : undefined}
        onClose={() => setChat(null)}
      />
    </div>
  );
}
