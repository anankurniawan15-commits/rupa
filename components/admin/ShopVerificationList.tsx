'use client';
import { useState } from 'react';
import { TextModal } from '@/components/modals/SharedModals';
import { toast } from '@/lib/store/toast';
import { initialsOf } from '@/lib/format';
import { SHOP_STATUS, moderationService } from '@/lib/services/moderation.service';
import type { Account, SellerProfile } from '@/types/user';
import { AdminEmpty } from './AdminParts';

type Seller = Account & { shop: SellerProfile };

export function ShopVerificationList({ accounts }: { accounts: Account[] }) {
  const [reject, setReject] = useState<Seller | null>(null);
  const sellers = (accounts.filter((a) => a.shop) as Seller[]).slice().sort((a, b) => Number(b.shop.status === 'pending') - Number(a.shop.status === 'pending'));
  return (
    <div>
      {sellers.map((a) => {
        const sp = a.shop;
        const mism = sp.holder.toLowerCase() !== a.name.toLowerCase();
        const note = sp.status === 'rejected' ? 'Alasan: ' + sp.note : sp.status === 'pending' && mism ? 'Nama rekening (' + sp.holder + ') berbeda dari nama akun' : '';
        return (
          <div key={a.id} className="arow">
            <span className="av av-m" aria-hidden="true">{initialsOf(sp.name)}</span>
            <div className="col gap-4">
              <b>{sp.name}</b>
              <span className="fine">{a.name} · {a.email} · {sp.city}</span>
              {note ? <span className="fine" style={{ color: '#6B4600' }}>{note}</span> : null}
            </div>
            <div className="col gap-4 ac"><span className="fine">Rekening</span><span>{sp.bank + ' •••• ' + sp.acct.slice(-4)}</span></div>
            <span><span className={SHOP_STATUS[sp.status][0]}>{SHOP_STATUS[sp.status][1]}</span></span>
            <div className="row-actions">
              {sp.status === 'pending' ? (
                <>
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => { void moderationService.verifyShop(a.id, true); toast(sp.name + ' terverifikasi. Penjual mendapat notifikasi (simulasi)'); }}>Setujui</button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setReject(a)}>Tolak</button>
                </>
              ) : null}
            </div>
          </div>
        );
      })}
      {sellers.length === 0 ? <AdminEmpty title="Tidak ada pengajuan toko" text="Pengajuan toko baru akan muncul di sini." /> : null}
      <TextModal
        open={!!reject}
        title={reject ? 'Tolak pengajuan ' + reject.shop.name + '?' : ''}
        sub={reject ? reject.name + ' · ' + reject.email : ''}
        label1="Alasan penolakan (dikirim ke penjual)"
        submitLabel="Tolak pengajuan"
        validate={(t) => (t.trim().length < 10 ? 'Tulis alasan minimal 10 karakter supaya penjual tahu apa yang perlu diperbaiki.' : '')}
        onSubmit={(t) => { if (reject) void moderationService.verifyShop(reject.id, false, t); setReject(null); toast('Pengajuan ditolak. Penjual mendapat notifikasi beserta alasannya (simulasi)', { kind: 'info' }); }}
        onClose={() => setReject(null)}
      />
    </div>
  );
}
