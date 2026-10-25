'use client';
/**
 * Rupa Assistant. Kontrak: <ChatShell variant="full" | "drawer" />.
 *  - "full"   : halaman /assistant dengan sidebar riwayat (role="region").
 *  - "drawer" : panel melayang dari tombol "Tanya AI" (role="dialog"); layar penuh di mobile (CSS),
 *               Esc menutup, fokus masuk ke panel saat dibuka dan kembali ke launcher saat ditutup.
 */
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { Segmented } from '@/components/ui/Tabs';
import { Skeleton } from '@/components/ui/Boxes';
import { productHref } from '@/components/product/ProductCard';
import { useChat, useHydrated } from '@/lib/store';
import { assistantService, SUGGESTIONS } from '@/lib/services/assistant.service';
import { MessageBubble } from './MessageBubble';
import { ChatInput, CHAT_INPUT_ID } from './ChatInput';
import type { ChatMode } from '@/types/ai';

/** Tujuan chip balasan cepat yang menavigasi. */
const GO_HREF: Record<string, string> = { sortir: '/sortir', sell: '/jual' };

const focusLauncher = () => setTimeout(() => document.querySelector<HTMLElement>('.launcher')?.focus(), 30);

export function ChatShell({ variant }: { variant: 'full' | 'drawer' }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const drawer = variant === 'drawer';
  const mode = useChat((s) => s.mode);
  const cur = useChat((s) => s.cur);
  const order = useChat((s) => s.order);
  const convs = useChat((s) => s.convs);
  const typing = useChat((s) => s.typing);
  const compare = useChat((s) => s.compare);
  const conv = convs[cur] || convs.new;
  const msgs = hydrated && conv ? conv.msgs : [];
  const msgRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLElement>(null);

  const close = () => {
    assistantService.openPanel(false);
    focusLauncher();
  };

  // Drawer: fokus masuk ke panel saat dibuka; Esc menutup.
  useEffect(() => {
    if (!drawer) return;
    const input = document.getElementById(CHAT_INPUT_ID);
    (input || shellRef.current)?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        assistantService.openPanel(false);
        focusLauncher();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawer]);

  // Gulir otomatis ke pesan terbaru.
  useEffect(() => {
    const el = msgRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs.length, typing, cur]);

  const openProduct = (id: string) => {
    // Di mobile panel menutupi seluruh layar, jadi ditutup agar halaman produk terlihat.
    if (drawer && window.matchMedia('(max-width: 760px)').matches) assistantService.openPanel(false);
    router.push(productHref(id));
  };
  const go = (key: string) => {
    assistantService.openPanel(false);
    router.push(GO_HREF[key] || '/');
  };

  const ids = ['new', ...order].filter((id) => convs[id]);

  return (
    <section
      ref={shellRef}
      className={drawer ? 'as-shell drawer' : 'as-shell full'}
      aria-label="Rupa Assistant"
      role={drawer ? 'dialog' : 'region'}
      tabIndex={drawer ? -1 : undefined}
    >
      <aside className="as-side">
        <div className="col gap-8">
          <p className="eyebrow">AI Assistant</p>
          <h1 className="h2">Tanya apa saja soal belanja dan upcycle</h1>
        </div>
        <button type="button" className="btn btn-primary w100" onClick={() => assistantService.newConversation()}><Icon name="plus" />Percakapan baru</button>
        <div className="col gap-8">
          <h2 className="mono-label">Riwayat</h2>
          {hydrated ? (
            <ul className="conv-list">
              {ids.map((id) => (
                <li key={id}>
                  <button type="button" className={cur === id ? 'conv is-on' : 'conv'} aria-current={cur === id ? 'true' : undefined} onClick={() => assistantService.openConversation(id)}>
                    <span className="cv-t">{convs[id].title}</span>
                    <span className="cv-s">{id === 'new' ? 'Mulai dari awal' : convs[id].sub}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="col gap-8" aria-hidden="true"><Skeleton h={44} /><Skeleton h={44} /><Skeleton h={44} /></div>
          )}
        </div>
        <div className="as-note">
          <Icon name="info" />
          <span>Teks bertanda <b>Saran AI</b> bisa keliru. Harga, stok, dan penjual di kartu bertanda <b>Data katalog</b> diambil langsung dari listing (data contoh).</span>
        </div>
      </aside>
      <div className="as-main">
        <div className="as-top">
          <div className="row gap-8 center"><span className="ai-dot" aria-hidden="true" /><b>Rupa Assistant</b></div>
          <div className="row gap-8 center wrapf">
            <Segmented<ChatMode>
              label="Mode asisten"
              value={mode}
              onChange={(m) => assistantService.setMode(m)}
              items={[{ key: 'shop', label: 'Belanja dengan AI' }, { key: 'upcycle', label: 'Konsultasi Upcycle' }]}
            />
            {drawer ? (
              <>
                <button type="button" className="iconbtn sm" onClick={() => router.push('/assistant')} aria-label="Buka layar penuh"><Icon name="expand" size="s" /></button>
                <button type="button" className="iconbtn sm" onClick={close} aria-label="Tutup asisten"><Icon name="close" size="s" /></button>
              </>
            ) : null}
          </div>
        </div>
        <div className="as-msgs" ref={msgRef} aria-live="polite">
          {!hydrated ? (
            <div className="col gap-12" aria-hidden="true"><Skeleton w="60%" h={18} /><Skeleton w="85%" /><Skeleton w="45%" /></div>
          ) : msgs.length === 0 ? (
            <div className="welcome">
              <h2>{mode === 'shop' ? 'Mau cari apa hari ini?' : 'Punya barang yang mau diolah lagi?'}</h2>
              <p className="muted">{mode === 'shop' ? 'Sebutkan budget, fungsi, gaya, atau material. Rekomendasiku diambil dari katalog Rupa, lengkap dengan alasannya.' : 'Tanyakan ide, bahan, cara aman mengerjakannya, sampai cara menentukan harga jual.'}</p>
              <div className="sugg">
                {SUGGESTIONS[mode].map((s) => (
                  <button key={s} type="button" onClick={() => void assistantService.send(s)}><span>{s}</span><Icon name="arrowRight" size="s" /></button>
                ))}
              </div>
            </div>
          ) : null}
          {msgs.map((m, i) => (
            <MessageBubble key={cur + '-' + i} m={m} index={i} compare={compare} onOpenProduct={openProduct} onGo={go} />
          ))}
          {typing ? <div className="typing" role="status" aria-label="Asisten sedang menulis"><span /><span /><span /></div> : null}
        </div>
        {compare.length > 0 ? (
          <div className="cmp-tray">
            <span className="grow">{compare.length} produk dipilih untuk dibandingkan</span>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => void assistantService.send('Bandingkan produk yang kupilih.')} disabled={compare.length < 2}>Bandingkan</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => assistantService.clearCompare()}>Kosongkan</button>
          </div>
        ) : null}
        <ChatInput mode={mode} />
        <p className="fine as-fine">Saran AI bisa keliru — cek detail produk sebelum membeli.</p>
      </div>
    </section>
  );
}
