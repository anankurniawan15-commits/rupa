'use client';
import { Guard } from '@/components/auth/Guard';
import { useAdminData } from '@/lib/services/moderation.service';
import type { Account } from '@/types/user';
import { useUrlTab } from '@/components/dashboard/useUrlTab';
import { ADMIN_TABS, AdminTabs, KpiTiles, type AdminTab } from './AdminParts';
import { ShopVerificationList } from './ShopVerificationList';
import { ReportList } from './ReportList';
import { DisputeList } from './DisputeList';
import { UserTable } from './UserTable';

export function AdminPage() {
  return <Guard need="admin">{(me) => <Admin me={me} />}</Guard>;
}

function Admin({ me }: { me: Account }) {
  const { accounts, reports, disputes } = useAdminData();
  const [tab, setTab] = useUrlTab<AdminTab>(ADMIN_TABS, 'overview');
  const pendShops = accounts.filter((a) => a.shop && a.shop.status === 'pending').length;
  const openRep = reports.filter((r) => r.status === 'open').length;
  const openDsp = disputes.filter((d) => d.status === 'open').length;
  const kpis = [
    { l: 'Toko menunggu verifikasi', v: String(pendShops), d: pendShops ? 'Target ditinjau dalam 1×24 jam' : 'Tidak ada antrean', go: () => setTab('sellers') },
    { l: 'Laporan listing terbuka', v: String(openRep), d: openRep ? 'Termasuk klaim material' : 'Semua laporan sudah ditinjau', go: () => setTab('reports') },
    { l: 'Sengketa aktif', v: String(openDsp), d: 'Dana ditahan sampai diputuskan', go: () => setTab('disputes') },
    { l: 'Pengguna terdaftar', v: String(accounts.length), d: accounts.filter((a) => a.shop).length + ' di antaranya punya toko', go: () => setTab('users') },
  ];
  return (
    <div className="page wrap">
      <div className="row between wrapf gap-16" style={{ alignItems: 'flex-end' }}>
        <div className="col gap-8">
          <p className="eyebrow">Panel Admin</p>
          <h1 className="h1">Moderasi dan verifikasi</h1>
          <p className="muted">Masuk sebagai {me.name} · data contoh</p>
        </div>
      </div>
      <AdminTabs value={tab} onChange={setTab} counts={{ sellers: pendShops, reports: openRep, disputes: openDsp }} />
      {tab === 'overview' ? <KpiTiles kpis={kpis} /> : null}
      {tab === 'sellers' ? <ShopVerificationList accounts={accounts} /> : null}
      {tab === 'reports' ? <ReportList reports={reports} /> : null}
      {tab === 'disputes' ? <DisputeList disputes={disputes} /> : null}
      {tab === 'users' ? <UserTable accounts={accounts} meId={me.id} /> : null}
    </div>
  );
}
