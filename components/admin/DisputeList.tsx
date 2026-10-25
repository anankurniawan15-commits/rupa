'use client';
import { useState } from 'react';
import { ReasonModal } from '@/components/modals/SharedModals';
import { toast } from '@/lib/store/toast';
import { rp } from '@/lib/format';
import { DISPUTE_DECISIONS, moderationService } from '@/lib/services/moderation.service';
import type { Dispute } from '@/types/social';
import { AdminEmpty } from './AdminParts';

export function DisputeList({ disputes }: { disputes: Dispute[] }) {
  const [decide, setDecide] = useState<Dispute | null>(null);
  return (
    <div>
      {disputes.map((d) => {
        const open = d.status === 'open';
        return (
          <div key={d.id} className="arow">
            <span className="av av-m" aria-hidden="true">?</span>
            <div className="col gap-4">
              <b>{d.id} · pesanan {d.order}</b>
              <span className="fine">{d.buyer + ' ↔ ' + d.seller} · {d.date}</span>
              <span style={{ fontSize: 14 }}>{d.reason} — {d.detail}</span>
              {d.decision ? <span className="fine"><b>Keputusan:</b> {d.decision}</span> : null}
            </div>
            <span className="ac" style={{ fontWeight: 700 }}>{rp(d.amount)}</span>
            <span><span className={open ? 'st st-baru' : 'st st-selesai'}>{open ? 'Perlu keputusan' : 'Selesai'}</span></span>
            <div className="row-actions">
              {open ? <button type="button" className="btn btn-primary btn-sm" onClick={() => setDecide(d)}>Putuskan</button> : null}
            </div>
          </div>
        );
      })}
      {disputes.length === 0 ? <AdminEmpty title="Tidak ada sengketa" text="Pengajuan bantuan dari pembeli akan muncul di sini." /> : null}
      <ReasonModal
        open={!!decide}
        title={decide ? 'Putuskan sengketa ' + decide.id : ''}
        sub={decide ? 'Pesanan ' + decide.order + ' · ' + rp(decide.amount) : ''}
        legend="Keputusan"
        reasons={DISPUTE_DECISIONS}
        withDetail={false}
        note="Keputusan dikirim ke pembeli dan penjual, lalu dana dicairkan sesuai keputusan (simulasi)."
        submitLabel="Simpan keputusan"
        onSubmit={(reason) => { if (decide) void moderationService.resolveDispute(decide.id, reason); setDecide(null); toast('Keputusan disimpan dan dikirim ke kedua pihak (simulasi)'); }}
        onClose={() => setDecide(null)}
      />
    </div>
  );
}
