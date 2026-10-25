'use client';
import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Tag } from '@/components/ui/Chip';
import { ConfirmDialog } from '@/components/ui/Modal';
import { TextModal } from '@/components/modals/SharedModals';
import { toast } from '@/lib/store/toast';
import { profileService, useProfile } from '@/lib/services/profile.service';
import type { Address } from '@/types/user';

export function AddressList() {
  const { addresses } = useProfile();
  const [adding, setAdding] = useState(false);
  const [del, setDel] = useState<Address | null>(null);
  return (
    <div className="col gap-8">
      <div className="row between center wrapf gap-8">
        <h2 className="h3">Alamat tersimpan</h2>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAdding(true)}><Icon name="plus" size="s" />Tambah alamat</button>
      </div>
      {addresses.map((a) => (
        <div key={a.id} className="addr">
          <div className="col gap-4">
            <div className="row gap-8 center"><b>{a.label}</b>{a.main ? <Tag kind="data">Utama</Tag> : null}</div>
            <span className="muted" style={{ fontSize: 14 }}>{a.text}</span>
          </div>
          <div className="row gap-8">
            {!a.main ? (
              <>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => { void profileService.setMainAddress(a.id); toast('Alamat utama diperbarui'); }}>Jadikan utama</button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDel(a)}>Hapus</button>
              </>
            ) : null}
          </div>
        </div>
      ))}
      <TextModal
        open={adding}
        title="Tambah alamat"
        label2="Label (misalnya Rumah atau Kos)"
        label1="Alamat lengkap"
        submitLabel="Simpan alamat"
        validate={(text, label) => (!label.trim() || text.trim().length < 10 ? 'Isi label dan alamat lengkap (minimal 10 karakter).' : '')}
        onSubmit={(text, label) => { void profileService.addAddress(label, text); setAdding(false); toast('Alamat ditambahkan'); }}
        onClose={() => setAdding(false)}
      />
      <ConfirmDialog
        open={!!del}
        title={del ? 'Hapus alamat “' + del.label + '”?' : ''}
        body={del?.text || ''}
        confirmLabel="Hapus alamat"
        danger
        onConfirm={() => { if (del) void profileService.removeAddress(del.id); setDel(null); toast('Alamat dihapus', { kind: 'info' }); }}
        onClose={() => setDel(null)}
      />
    </div>
  );
}
