'use client';
import type { ReactNode } from 'react';
import { cx } from '@/lib/format';

export interface TabItem<K extends string> { key: K; label: ReactNode; count?: number }

/** Tab bergaris bawah (`.tabs`/`.tab`) dengan badge jumlah. */
export function Tabs<K extends string>({ items, value, onChange, label }: { items: TabItem<K>[]; value: K; onChange: (k: K) => void; label: string }) {
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {items.map((t) => (
        <button
          key={t.key}
          type="button"
          role="tab"
          aria-selected={value === t.key}
          className={cx('tab', value === t.key && 'is-on')}
          onClick={() => onChange(t.key)}
        >
          {t.label}
          {t.count ? <span className="count">{t.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

/** Segmented control (`.seg`), mis. mode AI Assistant. */
export function Segmented<K extends string>({ items, value, onChange, label }: { items: { key: K; label: ReactNode }[]; value: K; onChange: (k: K) => void; label: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {items.map((t) => (
        <button key={t.key} type="button" className={value === t.key ? 'is-on' : ''} aria-pressed={value === t.key} onClick={() => onChange(t.key)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}
