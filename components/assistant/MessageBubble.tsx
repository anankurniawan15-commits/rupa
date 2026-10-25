'use client';
import { Icon } from '@/components/ui/Icon';
import { assistantService } from '@/lib/services/assistant.service';
import { RecommendationCard } from './RecommendationCard';
import { CompareColumns } from './CompareColumns';
import { GuideBlock } from './GuideBlock';
import type { ChatChip, ChatMessage } from '@/types/ai';

/** Satu pesan percakapan. Pesan AI selalu berlabel "Saran AI". */
export function MessageBubble({ m, index, compare, onOpenProduct, onGo }: { m: ChatMessage; index: number; compare: string[]; onOpenProduct: (id: string) => void; onGo: (go: string) => void }) {
  if (m.role === 'user') {
    return <div className="msg msg-u"><p>{m.text}</p></div>;
  }
  const chips = (m.chips || []).map((x: ChatChip) => (typeof x === 'string' ? { label: x, go: '' } : x));
  return (
    <div className="msg msg-ai">
      <div className="col gap-10" style={{ gap: 10 }}>
        <div className="ai-meta"><span className="ai-dot" aria-hidden="true" />Saran AI</div>
        {(m.paras || []).map((t, i) => <p key={i}>{t}</p>)}
        {m.kind === 'products' && m.ids ? (
          <div className="rec-list">
            {m.ids.map((id) => (
              <RecommendationCard key={id} id={id} reasons={(m.reasons && m.reasons[id]) || []} inCompare={compare.indexOf(id) >= 0} onOpen={onOpenProduct} />
            ))}
          </div>
        ) : null}
        {m.kind === 'compare' && m.ids ? <CompareColumns ids={m.ids} onOpen={onOpenProduct} /> : null}
        {m.kind === 'guide' ? <GuideBlock title={m.title} ideas={m.ideas} safety={m.safety} /> : null}
        {m.kind === 'error' ? (
          <div className="err-box" role="alert">
            <Icon name="warn" />
            <span className="grow">{m.errText || ''}</span>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => void assistantService.retry(index)}><Icon name="retry" size="s" />Coba lagi</button>
          </div>
        ) : null}
        {chips.length ? (
          <div className="chips">
            {chips.map((c) => (
              <button key={c.label} type="button" className="chip" onClick={() => (c.go ? onGo(c.go) : void assistantService.send(c.label))}>{c.label}</button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
