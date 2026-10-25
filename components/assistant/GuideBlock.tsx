import { Icon } from '@/components/ui/Icon';
import type { GuideIdea } from '@/types/ai';

/** Blok panduan upcycle + catatan keamanan. */
export function GuideBlock({ title, ideas, safety }: { title?: string; ideas?: GuideIdea[]; safety?: string }) {
  return (
    <div className="guide">
      <h3>{title || ''}</h3>
      {(ideas || []).map((g) => (
        <div className="g-idea" key={g.name}>
          <b>{g.name}</b>
          <span className="fine">{g.meta}</span>
          <ol>{g.steps.map((s) => <li key={s}>{s}</li>)}</ol>
        </div>
      ))}
      {safety ? (
        <div className="warn-box">
          <Icon name="warn" />
          <span><b>Keamanan:</b> {safety}</span>
        </div>
      ) : null}
    </div>
  );
}
