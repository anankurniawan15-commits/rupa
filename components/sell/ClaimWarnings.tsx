import type { ClaimFlag } from '@/types/ai';

/** Peringatan Claim Review Gate & Safety Gate (real-time) di langkah 3. */
export function ClaimWarnings({ flags, safetyWarnings = [] }: { flags: ClaimFlag[]; safetyWarnings?: string[] }) {
  if (!flags.length && !safetyWarnings.length) return null;
  return (
    <div className="col gap-12">
      {safetyWarnings.length ? (
        <div className="warn-box" role="status">
          <svg className="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4l9 16H3z" /><path d="M12 10v4M12 17v.5" /></svg>
          <div>
            <b>Safety Gate — Catatan keamanan material</b>
            <ul>
              {safetyWarnings.map((w) => <li key={w}>{w}</li>)}
            </ul>
          </div>
        </div>
      ) : null}
      {flags.length ? (
        <div className="warn-box" role="status">
          <svg className="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4l9 16H3z" /><path d="M12 10v4M12 17v.5" /></svg>
          <div>
            <b>Claim Review Gate — Klaim yang perlu dicek ulang</b>
            <ul>
              {flags.map((f) => <li key={f.phrase}><b>{f.phrase}</b> — {f.why}</li>)}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Ringkasan klaim & keamanan di langkah pratinjau. */
export function ClaimSummary({ count, safetyCount = 0 }: { count: number; safetyCount?: number }) {
  if (!count && !safetyCount) return null;
  return (
    <div className="warn-box">
      <svg className="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4l9 16H3z" /><path d="M12 10v4M12 17v.5" /></svg>
      <span>
        {count ? `Masih ada ${count} klaim yang sebaiknya kamu ubah di langkah 3. ` : ''}
        {safetyCount ? `Terdeteksi ${safetyCount} catatan Safety Gate untuk barang ini. ` : ''}
        Listing tetap bisa terbit, tetapi klaim yang tidak bisa dibuktikan atau risiko keselamatan yang terlewat dapat dilaporkan pembeli.
      </span>
    </div>
  );
}
