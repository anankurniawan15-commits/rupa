'use client';
import { compareRows } from '@/lib/services/assistant.service';

/** Perbandingan produk berkolom (data dari listing). */
export function CompareColumns({ ids, onOpen }: { ids: string[]; onOpen: (id: string) => void }) {
  return (
    <div className="cmp">
      {ids.map((id) => {
        const c = compareRows(id);
        return (
          <div className="cmp-col" key={id}>
            <span className="tag tag-data" style={{ alignSelf: 'flex-start' }}>Data katalog</span>
            <button type="button" className="linkbtn" style={{ fontWeight: 700 }} onClick={() => onOpen(id)}>{c.title}</button>
            <dl>
              {c.rows.map((r) => (
                <div key={r.k}><dt>{r.k}</dt><dd>{r.v}</dd></div>
              ))}
            </dl>
          </div>
        );
      })}
    </div>
  );
}
