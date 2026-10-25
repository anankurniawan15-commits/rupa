'use client';
import { SELL_STEPS } from '@/lib/services/listing-assist.service';

/** Stepper vertikal kiri (`.vsteps`) dengan status Lengkap / Belum lengkap per langkah. */
export function ListingStepper({ step, missing, onGo }: { step: number; missing: number[]; onGo: (n: number) => void }) {
  return (
    <ol className="vsteps" aria-label="Langkah listing">
      {SELL_STEPS.map((label, i) => {
        const n = i + 1;
        const miss = n < 6 && missing.indexOf(n) >= 0;
        const cur = n === step;
        const cls = cur ? 'is-cur' : !miss && n < 6 ? 'is-done' : miss && n < step ? 'is-miss' : '';
        return (
          <li key={label} className={cls}>
            <button type="button" onClick={() => onGo(n)} aria-current={cur ? 'step' : undefined}>
              <span className="vs-n">{n}</span>
              <span className="vs-l">
                {label}
                <span className="vs-s">{n === 6 ? 'Periksa sebelum terbit' : miss ? 'Belum lengkap' : 'Lengkap'}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
