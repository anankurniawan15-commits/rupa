'use client';
import { useState } from 'react';
import { Stars } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { EmptyState } from '@/components/ui/Boxes';
import { TextModal } from '@/components/modals/SharedModals';
import { toast } from '@/lib/store/toast';
import { orderService } from '@/lib/services/order.service';
import type { SellerReview } from '@/types/order';

type Rev = SellerReview & { index: number };

export function ReviewsTab({ reviews }: { reviews: Rev[] }) {
  const [replyTo, setReplyTo] = useState<Rev | null>(null);
  return (
    <div style={{ maxWidth: 820 }}>
      {reviews.map((r) => (
        <article key={r.index} className="rev">
          <div className="row gap-12 center wrapf"><b>{r.n}</b><Stars n={r.s} /><span className="fine">untuk {r.p}</span></div>
          <p>{r.t}</p>
          {r.reply ? <div className="notice"><Icon name="chat" /><span><b>Balasanmu:</b> {r.reply}</span></div> : null}
          <div><button type="button" className="btn btn-ghost btn-sm" style={{ paddingLeft: 0 }} onClick={() => setReplyTo(r)}>{r.reply ? 'Ubah balasan' : 'Balas ulasan'}</button></div>
        </article>
      ))}
      {reviews.length === 0 ? <EmptyState icon="star" title="Belum ada ulasan">Ulasan pembeli akan muncul di sini setelah pesanan selesai.</EmptyState> : null}
      <TextModal
        open={!!replyTo}
        title={replyTo ? 'Balas ulasan ' + replyTo.n : ''}
        quote={replyTo?.t}
        label1="Balasanmu (tampil publik)"
        initial={replyTo?.reply || ''}
        submitLabel="Kirim balasan"
        validate={(t) => (t.trim() ? '' : 'Tulis balasanmu dulu.')}
        onSubmit={(t) => { if (replyTo) void orderService.replyReview(replyTo.index, t); setReplyTo(null); toast('Balasan dipublikasikan'); }}
        onClose={() => setReplyTo(null)}
      />
    </div>
  );
}
