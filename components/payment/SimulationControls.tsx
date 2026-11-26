'use client';
import { Button } from '@/components/ui/Button';

/** Kotak "Kontrol simulasi" — hanya prototipe. */
export function SimulationControls({ onPaid, onExpire }: { onPaid: () => void; onExpire: () => void }) {
  return (
    <section className="demo-ctl">
      <p className="mono-label" style={{ color: '#4A00DE' }}>Kontrol simulasi (hanya prototipe)</p>
      <p className="fine">Di versi produksi, status berubah otomatis lewat notifikasi dari payment gateway.</p>
      <div className="row gap-8 wrapf">
        <Button variant="ai" size="sm" onClick={onPaid}>Simulasikan pembayaran berhasil</Button>
        <Button variant="secondary" size="sm" onClick={onExpire}>Simulasikan kedaluwarsa</Button>
      </div>
    </section>
  );
}
