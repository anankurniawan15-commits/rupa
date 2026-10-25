'use client';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/ui/Modal';
import { toast } from '@/lib/store/toast';
import { NOTIF_OPTIONS, PRIVACY_OPTIONS, profileService, useProfile } from '@/lib/services/profile.service';
import { assistantService } from '@/lib/services/assistant.service';

function SwitchRow({ id, label, desc, on, onToggle }: { id: string; label: string; desc: string; on: boolean; onToggle: () => void }) {
  return (
    <div className="switch-row">
      <div className="col"><label htmlFor={id} style={{ fontWeight: 600 }}>{label}</label><span className="fine">{desc}</span></div>
      <span className="switch"><input id={id} type="checkbox" role="switch" checked={on} aria-checked={on} onChange={onToggle} /><span /></span>
    </div>
  );
}

export function NotifSettings() {
  const { notif } = useProfile();
  return (
    <div>
      <h2 className="h3">Notifikasi</h2>
      {NOTIF_OPTIONS.map(([k, l, d]) => <SwitchRow key={k} id={'n-' + k} label={l} desc={d} on={!!notif[k]} onToggle={() => void profileService.setNotif(k, !notif[k])} />)}
    </div>
  );
}

export function PrivacySettings() {
  const { privacy } = useProfile();
  const [confirm, setConfirm] = useState(false);
  return (
    <div>
      <h2 className="h3">Privasi dan data</h2>
      {PRIVACY_OPTIONS.map(([k, l, d]) => <SwitchRow key={k} id={'pv-' + k} label={l} desc={d} on={!!privacy[k]} onToggle={() => void profileService.setPrivacy(k, !privacy[k])} />)}
      <div className="row gap-8 wrapf mt-24">
        <button type="button" className="btn btn-secondary" onClick={() => setConfirm(true)}>Hapus riwayat AI Assistant</button>
        <button type="button" className="btn btn-ghost" onClick={() => toast('Permintaan unduh data dicatat. Tautan dikirim ke email (simulasi)', { kind: 'info' })}>Unduh data saya</button>
      </div>
      <ConfirmDialog
        open={confirm}
        title="Hapus riwayat AI Assistant?"
        body="Semua percakapan akan dihapus permanen dari akunmu."
        confirmLabel="Hapus riwayat"
        danger
        onConfirm={() => { assistantService.clearHistory(); setConfirm(false); toast('Riwayat percakapan dihapus', { kind: 'info' }); }}
        onClose={() => setConfirm(false)}
      />
    </div>
  );
}
