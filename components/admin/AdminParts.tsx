'use client';
import { Tabs } from '@/components/ui/Tabs';

export type AdminTab = 'overview' | 'sellers' | 'reports' | 'disputes' | 'users';
export const ADMIN_TABS: AdminTab[] = ['overview', 'sellers', 'reports', 'disputes', 'users'];

export function AdminTabs({ value, onChange, counts }: { value: AdminTab; onChange: (k: AdminTab) => void; counts: { sellers: number; reports: number; disputes: number } }) {
  return (
    <Tabs<AdminTab>
      label="Bagian panel admin"
      value={value}
      onChange={onChange}
      items={[
        { key: 'overview', label: 'Ringkasan' },
        { key: 'sellers', label: 'Verifikasi toko', count: counts.sellers },
        { key: 'reports', label: 'Laporan listing', count: counts.reports },
        { key: 'disputes', label: 'Sengketa', count: counts.disputes },
        { key: 'users', label: 'Pengguna' },
      ]}
    />
  );
}

export function KpiTiles({ kpis }: { kpis: { l: string; v: string; d: string; go: () => void }[] }) {
  return (
    <div className="kpis">
      {kpis.map((k) => (
        <button key={k.l} type="button" className="kpi" style={{ textAlign: 'left' }} onClick={k.go}>
          <span className="kpi-l">{k.l}</span><span className="kpi-v">{k.v}</span><span className="kpi-d">{k.d}</span>
        </button>
      ))}
    </div>
  );
}

export function AdminEmpty({ title, text }: { title: string; text: string }) {
  return <div className="empty mt-24"><h2 className="h3">{title}</h2><p>{text}</p></div>;
}
