'use client';
import { cx } from '@/lib/format';

/**
 * Stepper horizontal (`.stepper-h`) — dipakai AI Sortir (5), Checkout (3), Buka Toko (3).
 * Hanya langkah yang sudah dicapai (≤ maxStep) yang bisa diklik.
 */
export function Stepper({ steps, step, maxStep, onGo, label, curLabel = true }: { steps: string[]; step: number; maxStep: number; onGo: (n: number) => void; label: string; curLabel?: boolean }) {
  return (
    <>
      <ol className={cx('stepper-h', steps.length === 3 && 'three')} aria-label={label}>
        {steps.map((l, i) => {
          const n = i + 1;
          const cur = n === step;
          return (
            <li key={l} className={cur ? 'is-cur' : n <= maxStep ? 'is-done' : ''}>
              <button type="button" onClick={() => onGo(n)} disabled={n > maxStep} aria-current={cur ? 'step' : undefined}>
                <span className="st-n">{'0' + n}</span>
                <span className="st-l">{l}</span>
              </button>
            </li>
          );
        })}
      </ol>
      {curLabel ? <p className="cur-label only-m">{'Langkah ' + step + ' dari ' + steps.length + ' — ' + steps[step - 1]}</p> : null}
    </>
  );
}
