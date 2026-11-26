'use client';
import { Button } from '@/components/ui/Button';
import { toast } from '@/lib/store/toast';

/** E-wallet: tombol buka aplikasi (simulasi). */
export function WalletBox({ wallet }: { wallet: string }) {
  return (
    <div className="col gap-12">
      <p>Kami akan mengarahkanmu ke aplikasi <b>{wallet}</b> untuk menyetujui pembayaran.</p>
      <Button size="lg" style={{ alignSelf: 'flex-start' }} onClick={() => toast('Di perangkat asli, aplikasi ' + wallet + ' terbuka untuk konfirmasi. Pakai kontrol simulasi di bawah.', { kind: 'info', ms: 6000 })}>
        Buka aplikasi {wallet}
      </Button>
      <p className="fine">Setelah pembayaran disetujui di aplikasi, kembali ke halaman ini. Status diperbarui otomatis.</p>
    </div>
  );
}
