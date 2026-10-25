import { fmtTs, hms } from '@/lib/format';

/** Kartu hitung mundur batas pembayaran (`role="timer"`). */
export function Countdown({ left, deadline }: { left: number; deadline: number }) {
  return (
    <section className="panel col gap-12 pay-deadline">
      <p className="mono-label">Selesaikan pembayaran dalam</p>
      <p className="countdown" role="timer" aria-live="off">{hms(left)}</p>
      <p className="muted">Batas waktu: {fmtTs(deadline)}</p>
    </section>
  );
}
