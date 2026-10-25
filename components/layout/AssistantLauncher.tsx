'use client';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { NO_LAUNCHER, startsWithAny } from './nav';
import { useChat } from '@/lib/store/chat';
import { assistantService } from '@/lib/services/assistant.service';
import { ChatShell } from '@/components/assistant/ChatShell';

/**
 * Tombol "Tanya AI" + panel melayang AI Assistant.
 * Disembunyikan di /assistant, checkout, pembayaran, dan halaman akun.
 */
export function AssistantLauncher() {
  const pathname = usePathname();
  const panel = useChat((s) => s.panel);
  const onAssistant = pathname === '/assistant';
  const hidden = startsWithAny(pathname, NO_LAUNCHER);

  // Panel ditutup saat pindah ke halaman penuh atau halaman tanpa launcher.
  useEffect(() => {
    if (hidden && panel) assistantService.openPanel(false);
  }, [hidden, panel]);

  if (onAssistant) return null;
  if (panel && !hidden) return <ChatShell variant="drawer" />;
  if (hidden) return null;
  return (
    <button type="button" className="launcher" onClick={() => assistantService.openPanel(true)} aria-label="Buka Rupa Assistant">
      <Icon name="chatLines" />
      <span className="hide-m">Tanya AI</span>
    </button>
  );
}
