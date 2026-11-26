'use client';
import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { ConfirmDialog } from '@/components/ui/Modal';
import { toast } from '@/lib/store/toast';
import { initialsOf } from '@/lib/format';
import { moderationService } from '@/lib/services/moderation.service';
import type { Account } from '@/types/user';
import { AdminEmpty } from './AdminParts';

export function UserTable({ accounts, meId }: { accounts: Account[]; meId: string }) {
  const [q, setQ] = useState('');
  const [block, setBlock] = useState<Account | null>(null);
  const aq = q.trim().toLowerCase();
  const users = accounts.filter((a) => !aq || (a.name + ' ' + a.email).toLowerCase().indexOf(aq) >= 0);
  return (
    <div>
      <form className="ex-search" role="search" onSubmit={(e) => e.preventDefault()} style={{ marginBottom: 12 }}>
        <div className="field-inline">
          <Icon name="search" />
          <label htmlFor="ad-q" className="sr">Cari pengguna</label>
          <input id="ad-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama atau email" />
        </div>
      </form>
      {users.map((a) => {
        const act = a.status === 'aktif';
        return (
          <div key={a.id} className="arow">
            <span className="av av-m" aria-hidden="true">{initialsOf(a.name)}</span>
            <div className="col gap-4"><b>{a.name + (a.id === meId ? ' (kamu)' : '')}</b><span className="fine">{a.email}</span></div>
            <span className="ac">{a.role === 'admin' ? 'Admin' : a.shop ? 'Pembeli & penjual' : 'Pembeli'}</span>
            <span><span className={act ? 'st st-aktif' : 'st st-habis'}>{act ? 'Aktif' : 'Diblokir'}</span></span>
            <div className="row-actions">
              {a.role !== 'admin' ? (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    if (!act) { void moderationService.setAccountStatus(a.id, 'aktif'); toast('Akun ' + a.name + ' dipulihkan'); return; }
                    setBlock(a);
                  }}
                >
                  {act ? 'Blokir' : 'Pulihkan'}
                </button>
              ) : null}
            </div>
          </div>
        );
      })}
      {users.length === 0 ? <AdminEmpty title="Pengguna tidak ditemukan" text="Coba kata kunci lain." /> : null}
      <ConfirmDialog
        open={!!block}
        title={block ? 'Blokir ' + block.name + '?' : ''}
        body="Pengguna tidak bisa masuk, dan listing tokonya (jika ada) disembunyikan. Kamu bisa memulihkan akun ini kapan saja."
        confirmLabel="Blokir akun"
        danger
        onConfirm={() => { if (block) { void moderationService.setAccountStatus(block.id, 'diblokir'); toast('Akun ' + block.name + ' diblokir', { kind: 'info' }); } setBlock(null); }}
        onClose={() => setBlock(null)}
      />
    </div>
  );
}
