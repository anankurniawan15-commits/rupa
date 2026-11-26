import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import { IBM_Plex_Mono, Newsreader, Plus_Jakarta_Sans, Poppins } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/layout/Header';
import { DemoBanner } from '@/components/layout/DemoBanner';
import { Footer } from '@/components/layout/Footer';
import { BottomNav } from '@/components/layout/BottomNav';
import { AssistantLauncher } from '@/components/layout/AssistantLauncher';
import { StoreHydrator } from '@/components/layout/StoreHydrator';
import { RouteNotice } from '@/components/layout/RouteNotice';
import { Toaster } from '@/components/ui/Toast';

const newsreader = Newsreader({ subsets: ['latin'], style: ['normal', 'italic'], weight: ['400', '500'], variable: '--font-newsreader', display: 'swap' });
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-jakarta', display: 'swap' });
const plexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-plex-mono', display: 'swap' });
const poppins = Poppins({ subsets: ['latin'], weight: ['700'], variable: '--font-poppins', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Rupa — Barang Lama. Cerita Baru.', template: '%s · Rupa' },
  description: 'Marketplace upcycle antarpengguna di Indonesia. Temukan karya upcycle unik atau ubah barang tak terpakai menjadi sesuatu yang bernilai.',
  icons: { icon: '/brand/rupa-mark.png' },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#FAFAFA' };

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="id" className={`${newsreader.variable} ${jakarta.variable} ${plexMono.variable} ${poppins.variable}`}>
      <body>
        <div className="app">
          <a className="skip" href="#main">Lewati ke konten utama</a>
          <StoreHydrator />
          <DemoBanner />
          <Suspense fallback={<header className="hdr"><div className="hdr-in" /></header>}>
            <Header />
          </Suspense>
          <main id="main" className="main">{children}</main>
          <Footer />
          <Suspense fallback={null}>
            <BottomNav />
            <AssistantLauncher />
            <RouteNotice />
          </Suspense>
          <Toaster />
        </div>
      </body>
    </html>
  );
}
