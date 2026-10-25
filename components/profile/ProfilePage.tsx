'use client';
import { Guard } from '@/components/auth/Guard';
import { cx } from '@/lib/format';
import { PROFILE_TABS } from '@/lib/services/profile.service';
import { useUrlTab } from '@/components/dashboard/useUrlTab';
import { ProfileForm } from './ProfileForm';
import { AddressList } from './AddressList';
import { NotifSettings, PrivacySettings } from './Settings';
import { SavedAnalyses } from './SavedAnalyses';

type TabKey = 'profil' | 'alamat' | 'notif' | 'saved' | 'privasi';
const KEYS = PROFILE_TABS.map(([k]) => k) as TabKey[];

export function ProfilePage() {
  return <Guard need="user">{() => <Profile />}</Guard>;
}

function Profile() {
  const [tab, setTab] = useUrlTab<TabKey>(KEYS, 'profil');
  return (
    <div className="page wrap">
      <h1 className="h1" style={{ marginBottom: 28 }}>Profil dan Pengaturan</h1>
      <div className="pf">
        <nav className="pf-nav" aria-label="Bagian profil">
          {PROFILE_TABS.map(([k, l]) => (
            <button key={k} type="button" className={cx(tab === k && 'is-on')} aria-current={tab === k ? 'page' : undefined} onClick={() => setTab(k as TabKey)}>{l}</button>
          ))}
        </nav>
        <div className="panel" style={{ padding: 32 }}>
          {tab === 'profil' ? <ProfileForm /> : null}
          {tab === 'alamat' ? <AddressList /> : null}
          {tab === 'notif' ? <NotifSettings /> : null}
          {tab === 'saved' ? <SavedAnalyses /> : null}
          {tab === 'privasi' ? <PrivacySettings /> : null}
        </div>
      </div>
    </div>
  );
}
