'use client';
import Link from 'next/link';
import { BrandMark } from './Brand';
import { toast } from '@/lib/store/toast';

const soon = (label: string) => () => toast(label + ' — halaman ini belum tersedia di prototipe', { kind: 'info' });

function FootBtn({ label, toastLabel }: { label: string; toastLabel?: string }) {
  return <li><button type="button" onClick={soon(toastLabel || label)}>{label}</button></li>;
}

export function Footer() {
  return (
    <footer className="ftr">
      <div className="wrap">
        <div className="ftr-grid">
          <div className="col gap-12">
            <span className="row gap-8 center"><BrandMark /></span>
            <p style={{ maxWidth: '34ch', fontSize: 14 }}>Marketplace antarpengguna untuk karya upcycle dari Indonesia. Barang lama, cerita baru.</p>
            <p className="fine" style={{ color: '#A6A6A6' }}>Kontak: [email dukungan] · [nomor WhatsApp layanan]</p>
          </div>
          <div>
            <h2>Bantuan</h2>
            <ul>
              <FootBtn label="Pusat bantuan" />
              <FootBtn label="Cara berbelanja" />
              <FootBtn label="Pembatalan dan pengembalian" />
              <li><Link href="/pesanan">Lacak pesanan</Link></li>
            </ul>
          </div>
          <div>
            <h2>Marketplace</h2>
            <ul>
              <FootBtn label="Kebijakan marketplace" />
              <FootBtn label="Panduan penjual" />
              <FootBtn label="Aturan klaim material" />
              <FootBtn label="Barang yang dilarang" toastLabel="Daftar barang terlarang" />
            </ul>
          </div>
          <div>
            <h2>Ikuti kami</h2>
            <ul>
              <FootBtn label="Instagram" toastLabel="Tautan media sosial" />
              <FootBtn label="TikTok" toastLabel="Tautan media sosial" />
              <FootBtn label="YouTube" toastLabel="Tautan media sosial" />
              <FootBtn label="Hubungi kami" toastLabel="Formulir kontak" />
            </ul>
          </div>
        </div>
        <div className="ftr-bottom">
          <span>© 2026 Rupa · Prototipe desain</span>
          <span>Semua produk, penjual, harga, dan ulasan adalah data contoh.</span>
        </div>
      </div>
    </footer>
  );
}
