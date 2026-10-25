'use client';
import Link from 'next/link';
import { useToast } from '@/lib/store/toast';
import { Icon } from './Icon';

/** Toast global di region aria-live, dengan aksi opsional (Lihat / Urungkan). */
export function Toaster() {
  const t = useToast((s) => s.toast);
  const clear = useToast((s) => s.clear);
  return (
    <div className="toast-wrap" aria-live="polite">
      {t ? (
        <div key={t.id} className={'toast t-' + t.kind} role="status">
          <Icon name={t.kind === 'warn' ? 'warn' : t.kind === 'info' ? 'info' : 'check'} className="t-ic" />
          <span>{t.msg}</span>
          {t.actionLabel && t.href ? (
            <Link href={t.href} className="t-act" onClick={clear} style={{ display: 'inline-flex', alignItems: 'center' }}>{t.actionLabel}</Link>
          ) : t.actionLabel && t.action ? (
            <button type="button" className="t-act" onClick={() => { const a = t.action; clear(); a?.(); }}>{t.actionLabel}</button>
          ) : null}
          <button type="button" className="iconbtn" onClick={clear} aria-label="Tutup notifikasi"><Icon name="close" size="s" /></button>
        </div>
      ) : null}
    </div>
  );
}
