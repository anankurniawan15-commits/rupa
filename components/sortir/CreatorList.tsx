'use client';
import { Avatar } from '@/components/ui/Chip';
import type { Seller } from '@/types/product';

/** Kreator yang menerima material ini + tombol Hubungi. */
export function CreatorList({ creators, onContact }: { creators: Seller[]; onContact: (s: Seller) => void }) {
  return (
    <div>
      <h3 className="h3">Kreator yang menerima material ini</h3>
      <p className="fine" style={{ margin: '4px 0 8px' }}>Berdasarkan profil kreator. Hubungi dulu sebelum mengirim barang.</p>
      {creators.map((c) => (
        <div className="creator" key={c.id}>
          <Avatar initials={c.initials} size="m" />
          <div className="col" style={{ minWidth: 0 }}>
            <b style={{ fontSize: 14.5 }}>{c.name}</b>
            <span className="fine">{c.city} · menerima {c.accepts}</span>
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => onContact(c)}>Hubungi</button>
        </div>
      ))}
    </div>
  );
}
