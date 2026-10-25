'use client';
import { Tag } from '@/components/ui/Chip';
import type { SellerAlert } from '@/lib/services/seller.service';
import { RevenueChart } from './RevenueChart';

export function DashKpis({ kpis }: { kpis: { l: string; v: string; d: string }[] }) {
  return (
    <div className="kpis">
      {kpis.map((k) => (
        <div key={k.l} className="kpi"><span className="kpi-l">{k.l}</span><span className="kpi-v">{k.v}</span><span className="kpi-d">{k.d}</span></div>
      ))}
    </div>
  );
}

export function AttentionList({ alerts, onAct }: { alerts: SellerAlert[]; onAct: (a: SellerAlert) => void }) {
  return (
    <div className="panel col gap-12">
      <h2 className="h3">Perlu perhatian</h2>
      {alerts.map((a, i) => (
        <div key={i} className="row gap-12" style={{ alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid #E2E2E2' }}>
          <svg className="ic" viewBox="0 0 24 24" aria-hidden="true" style={{ color: '#5500FF' }}><path d="M12 4l9 16H3z" /><path d="M12 10v4M12 17v.5" /></svg>
          <div className="col gap-4 grow">
            <span style={{ fontSize: 14 }}>{a.text}</span>
            <button type="button" className="linkbtn" style={{ fontWeight: 600, color: '#0B7A43', fontSize: 13.5, minHeight: 32, alignSelf: 'flex-start' }} onClick={() => onAct(a)}>{a.cta}</button>
          </div>
        </div>
      ))}
      {alerts.length === 0 ? <p className="muted">Semua aman. Tidak ada pesanan atau stok yang perlu ditindaklanjuti.</p> : null}
    </div>
  );
}

export function OverviewTab({ kpis, weeks, alerts, onAct }: { kpis: { l: string; v: string; d: string }[]; weeks: [string, number][]; alerts: SellerAlert[]; onAct: (a: SellerAlert) => void }) {
  return (
    <div>
      <div className="row between center wrapf gap-8" style={{ marginBottom: 12 }}>
        <Tag kind="seller">Data contoh</Tag>
        <span className="fine">Diperbarui hari ini, 09.00 WIB</span>
      </div>
      <DashKpis kpis={kpis} />
      <div className="dash-2">
        <RevenueChart weeks={weeks} />
        <AttentionList alerts={alerts} onAct={onAct} />
      </div>
    </div>
  );
}
