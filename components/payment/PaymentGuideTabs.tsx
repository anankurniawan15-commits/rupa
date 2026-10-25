'use client';
import { useState } from 'react';
import { GUIDE_TABS, paymentGuides } from '@/lib/services/payment.service';
import type { GuideKey } from '@/types/payment';

/** Tab panduan bayar VA: M-banking / ATM / Internet banking. */
export function PaymentGuideTabs({ bank }: { bank: string }) {
  const [tab, setTab] = useState<GuideKey>('mbank');
  const steps = paymentGuides(bank)[tab];
  return (
    <>
      <div className="seg" role="tablist" aria-label="Cara membayar">
        {GUIDE_TABS.map(([k, l]) => (
          <button key={k} type="button" className={tab === k ? 'is-on' : ''} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      <ol className="steps">
        {steps.map((s) => <li key={s}>{s}</li>)}
      </ol>
    </>
  );
}
