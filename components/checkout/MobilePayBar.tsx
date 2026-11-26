'use client';
import { Button } from '@/components/ui/Button';

/** Bilah total menempel di bawah layar (≤760 px) — checkout & pembayaran. */
export function MobilePayBar({ label, value, mono, actionLabel, onAction, disabled }: { label: string; value: string; mono?: boolean; actionLabel: string; onAction: () => void; disabled?: boolean }) {
  return (
    <div className="m-paybar">
      <div className="col">
        <span className="fine">{label}</span>
        <b className={mono ? 'mono' : undefined}>{value}</b>
      </div>
      <Button onClick={onAction} disabled={disabled}>{actionLabel}</Button>
    </div>
  );
}
