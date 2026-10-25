'use client';
import { sortirService } from '@/lib/services/sortir.service';
import type { ActionKey, ScenarioKey } from '@/types/ai';

/** Langkah 3 — lima aksi; yang disarankan di urutan pertama. */
export function ActionPicker({ scen, action, onPick }: { scen: ScenarioKey; action: ActionKey | null; onPick: (k: ActionKey) => void }) {
  return (
    <div className="act-grid" role="group" aria-label="Pilihan langkah">
      {sortirService.recommendActions(scen).map((a) => {
        const on = action === a.key;
        return (
          <button key={a.key} type="button" className={on ? 'act is-on' : 'act'} onClick={() => onPick(a.key)} aria-pressed={on}>
            <span className="act-top">
              <span className="act-t">{a.title}</span>
              {a.rec ? <span className="tag tag-rec">Disarankan</span> : null}
              {a.caution ? <span className="tag tag-warn">Perlu hati-hati</span> : null}
            </span>
            <span className="act-b">{a.body}</span>
          </button>
        );
      })}
    </div>
  );
}
