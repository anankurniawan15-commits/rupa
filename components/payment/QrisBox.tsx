'use client';
import { Button } from '@/components/ui/Button';
import { QR_CELLS } from '@/lib/services/payment.service';
import { toast } from '@/lib/store/toast';

/** Kode QRIS contoh 25×25 — tidak dapat dipindai. */
export function QrisBox() {
  return (
    <div className="row gap-24 wrapf" style={{ alignItems: 'center' }}>
      <div className="qr" role="img" aria-label="Kode QRIS contoh, tidak dapat dipindai">
        {QR_CELLS.map((on, i) => <i key={i} className={on ? 'on' : undefined} />)}
      </div>
      <div className="col gap-8" style={{ flex: 1, minWidth: 200 }}>
        <b>Pindai dengan aplikasi apa pun yang mendukung QRIS</b>
        <p className="muted" style={{ fontSize: 14 }}>Aplikasi m-banking dan e-wallet yang mendukung QRIS bisa dipakai. Pastikan nama merchant &quot;Rupa&quot; sebelum membayar.</p>
        <span className="tag tag-warn" style={{ alignSelf: 'flex-start' }}>QR contoh — tidak dapat dipindai</span>
        <Button variant="secondary" size="sm" style={{ alignSelf: 'flex-start' }} onClick={() => toast('QR contoh tidak bisa diunduh di prototipe', { kind: 'info' })}>Unduh QR</Button>
      </div>
    </div>
  );
}
