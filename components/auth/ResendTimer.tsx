'use client';
import { useEffect, useState } from 'react';

/**
 * Tombol "Kirim ulang kode" dengan hitung mundur (default 30 detik).
 * Untuk memulai ulang hitungan, ganti `key` komponen ini setelah kode dikirim ulang.
 */
export function ResendTimer({ onResend, seconds = 30 }: { onResend: () => void; seconds?: number }) {
  const [left, setLeft] = useState(seconds);

  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  const waiting = left > 0;
  return (
    <button type="button" className="btn btn-ghost btn-sm" onClick={onResend} disabled={waiting}>
      <span role="timer" aria-live="off">{waiting ? 'Kirim ulang dalam ' + left + ' dtk' : 'Kirim ulang kode'}</span>
    </button>
  );
}
