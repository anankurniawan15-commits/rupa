'use client';
/**
 * PLACEHOLDER — diganti penuh di fase AI Assistant.
 * Kontrak: <ChatShell variant="full" | "drawer" />. Variant "drawer" = panel melayang (role="dialog"),
 * "full" = halaman /assistant dengan sidebar riwayat.
 */
import { assistantService } from '@/lib/services/assistant.service';

export function ChatShell({ variant }: { variant: 'full' | 'drawer' }) {
  return (
    <div className={variant === 'full' ? 'as-shell full' : 'as-shell drawer'} role={variant === 'full' ? 'region' : 'dialog'} aria-label="Rupa Assistant">
      <div className="as-main">
        <div className="as-top">
          <b>Rupa Assistant</b>
          {variant === 'drawer' ? <button type="button" className="btn btn-ghost btn-sm" onClick={() => assistantService.openPanel(false)}>Tutup</button> : null}
        </div>
      </div>
    </div>
  );
}
