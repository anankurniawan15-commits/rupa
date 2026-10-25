'use client';
import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';

export function DemoBanner() {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <div className="demo-bar" role="note">
      <div className="wrap">
        <span>Prototipe desain — semua produk, penjual, ulasan, dan transaksi di sini adalah data contoh.</span>
        <button type="button" className="iconbtn" onClick={() => setOpen(false)} aria-label="Tutup pemberitahuan prototipe">
          <Icon name="close" size="s" />
        </button>
      </div>
    </div>
  );
}
