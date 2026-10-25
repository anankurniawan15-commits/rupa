'use client';
import { useState } from 'react';
import { rp } from '@/lib/format';

/** Grafik pendapatan 8 minggu (`.chart`) dengan tooltip hover/fokus dan toggle tabel. */
export function RevenueChart({ weeks }: { weeks: [string, number][] }) {
  const [table, setTable] = useState(false);
  const maxW = Math.max(1, ...weeks.map((w) => w[1]));
  const total = weeks.reduce((a, w) => a + w[1], 0);
  const bars = weeks.map(([label, v], i) => ({ label, v, h: Math.round((v / maxW) * 100), last: i === weeks.length - 1 }));
  return (
    <div className="panel">
      <div className="row between center wrapf gap-8">
        <div><h2 className="h3">Pendapatan per minggu</h2><p className="fine">8 minggu terakhir · total {rp(total)}</p></div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setTable((t) => !t)} aria-pressed={table}>{table ? 'Tampilkan grafik' : 'Lihat sebagai tabel'}</button>
      </div>
      {table ? (
        <div className="col" style={{ marginTop: 12 }}>
          <dl className="sum-dl">
            {bars.map((b) => <div key={b.label}><dt>Minggu {b.label}</dt><dd>{rp(b.v)}</dd></div>)}
          </dl>
        </div>
      ) : (
        <div>
          <div className="chart">
            {bars.map((b) => (
              <button key={b.label} type="button" className="bar-hit" aria-label={'Minggu ' + b.label + ': ' + rp(b.v)}>
                {b.last ? <span className="bar-lbl" aria-hidden="true">{Math.round(b.v / 1000) + 'rb'}</span> : null}
                <span className="bar-tip" aria-hidden="true">{rp(b.v)}</span>
                <span className={b.last ? 'bar is-last' : 'bar'} style={{ height: b.h + '%' }} />
              </button>
            ))}
          </div>
          <div className="chart-x" aria-hidden="true">{bars.map((b) => <span key={b.label}>{b.label}</span>)}</div>
        </div>
      )}
    </div>
  );
}
