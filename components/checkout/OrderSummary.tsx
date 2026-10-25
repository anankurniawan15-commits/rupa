import { rp } from '@/lib/format';

/** Ringkasan pesanan di kolom kanan checkout (menempel di desktop lewat `.summary`). */
export function OrderSummary({ count, pkgs, subtotal, shipping }: { count: number; pkgs: number; subtotal: number; shipping: number }) {
  return (
    <aside className="summary" aria-label="Ringkasan pesanan">
      <h2 className="h3">Ringkasan pesanan</h2>
      <div className="sum-row"><span>Produk ({count} barang)</span><span>{rp(subtotal)}</span></div>
      <div className="sum-row"><span>Ongkir ({pkgs} paket)</span><span>{rp(shipping)}</span></div>
      <div className="sum-row sum-total"><span>Total</span><span>{rp(subtotal + shipping)}</span></div>
      <p className="fine">Total dibayar sekali. Dana untuk tiap penjual diteruskan setelah paketnya kamu konfirmasi diterima (simulasi).</p>
    </aside>
  );
}
