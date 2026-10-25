'use client';
import Link from 'next/link';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/ui/Modal';
import { toast } from '@/lib/store/toast';
import { getProduct } from '@/lib/services/product.service';
import { REPORT_STATUS, moderationService } from '@/lib/services/moderation.service';
import type { Report } from '@/types/social';
import { AdminEmpty } from './AdminParts';

export function ReportList({ reports }: { reports: Report[] }) {
  const [down, setDown] = useState<Report | null>(null);
  const titleOf = (pid: string) => getProduct(pid)?.title || pid;
  return (
    <div>
      {reports.map((r) => {
        const st = REPORT_STATUS[r.status];
        return (
          <div key={r.id} className="arow">
            <span className="av av-m" aria-hidden="true">!</span>
            <div className="col gap-4">
              <Link href={'/produk/' + r.pid} className="linkbtn" style={{ fontWeight: 700, alignSelf: 'flex-start' }}>{titleOf(r.pid)}</Link>
              <span className="fine">{r.reason} · {r.reporter} · {r.date}</span>
              <span style={{ fontSize: 14 }}>{r.detail}</span>
            </div>
            <span className="ac" />
            <span><span className={st[0]}>{st[1]}</span></span>
            <div className="row-actions">
              {r.status === 'open' ? (
                <>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => setDown(r)}>Turunkan listing</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => { void moderationService.dismiss(r.id); toast('Laporan diabaikan', { kind: 'info', actionLabel: 'Urungkan', action: () => void moderationService.reopen(r.id) }); }}>Abaikan</button>
                </>
              ) : null}
            </div>
          </div>
        );
      })}
      {reports.length === 0 ? <AdminEmpty title="Belum ada laporan" text="Laporan listing dari pengguna akan muncul di sini." /> : null}
      <ConfirmDialog
        open={!!down}
        title="Turunkan listing ini?"
        body={down ? '“' + titleOf(down.pid) + '” akan disembunyikan dari pencarian dan katalog. Penjual mendapat notifikasi beserta alasannya: ' + down.reason.toLowerCase() + '.' : ''}
        confirmLabel="Turunkan listing"
        danger
        onConfirm={() => { if (down) void moderationService.takedown(down.id); setDown(null); toast('Listing diturunkan dari katalog'); }}
        onClose={() => setDown(null)}
      />
    </div>
  );
}
