import type { ReactNode } from 'react';

/** Kepala seksi bernomor (`.sec-head`) seperti di prototipe. */
export function SecHead({ n, id, title, sub, action }: { n: string; id: string; title: string; sub: string; action?: ReactNode }) {
  return (
    <div className="sec-head">
      <div>
        <div className="sec-t"><span className="sec-n">{n}</span><h2 id={id} className="h2">{title}</h2></div>
        <p className="sec-sub">{sub}</p>
      </div>
      {action}
    </div>
  );
}
