import { TIMELINE } from '@/lib/services/order.service';

/** Linimasa 5 tahap (Dibuat → Diterima). `idx` = tahap terakhir yang selesai. */
export function OrderTimeline({ idx, resi }: { idx: number; resi?: string }) {
  return (
    <ol className="tl" aria-label="Status pengiriman">
      {TIMELINE.map((l, i) => (
        <li key={l} className={i <= idx ? 'is-done' : ''}>
          <b>{l}</b>
          <span>{i <= idx ? (i === 3 && resi ? resi : 'Selesai') : 'Menunggu'}</span>
        </li>
      ))}
    </ol>
  );
}
