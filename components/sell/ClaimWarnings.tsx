import type { ClaimFlag } from '@/types/ai';

/** Peringatan klaim berisiko (real-time) di langkah 3. */
export function ClaimWarnings({ flags }: { flags: ClaimFlag[] }) {
  if (!flags.length) return null;
  return (
    <div className="warn-box" role="status">
      <svg className="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4l9 16H3z" /><path d="M12 10v4M12 17v.5" /></svg>
      <div>
        <b>Klaim yang perlu dicek ulang</b>
        <ul>
          {flags.map((f) => <li key={f.phrase}><b>{f.phrase}</b> — {f.why}</li>)}
        </ul>
      </div>
    </div>
  );
}

/** Ringkasan klaim di langkah pratinjau. */
export function ClaimSummary({ count }: { count: number }) {
  if (!count) return null;
  return (
    <div className="warn-box">
      <svg className="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4l9 16H3z" /><path d="M12 10v4M12 17v.5" /></svg>
      <span>Masih ada {count} klaim yang sebaiknya kamu ubah di langkah 3. Listing tetap bisa terbit, tetapi klaim yang tidak bisa dibuktikan dapat dilaporkan pembeli.</span>
    </div>
  );
}
