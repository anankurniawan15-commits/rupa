'use client';
import { cx } from '@/lib/format';

/** Kolom kode verifikasi 6 angka (`.input.otp`). Hanya angka yang diterima. */
export function OtpInput({ id, value, onValue, invalid, describedBy }: { id: string; value: string; onValue: (v: string) => void; invalid?: boolean; describedBy?: string }) {
  return (
    <input
      id={id}
      className={cx('input otp', invalid && 'has-err')}
      inputMode="numeric"
      pattern="[0-9]*"
      maxLength={6}
      value={value}
      onChange={(e) => onValue(e.target.value.replace(/\D/g, '').slice(0, 6))}
      autoComplete="one-time-code"
      placeholder="••••••"
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
    />
  );
}
