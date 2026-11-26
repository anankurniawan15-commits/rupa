'use client';
import { Icon } from '@/components/ui/Icon';
import { Tag } from '@/components/ui/Chip';
import type { ListingAiMeta } from '@/types/ai';

/** Skeleton saat AI menyusun saran. */
export function AiSkeleton({ widths }: { widths: string[] }) {
  return (
    <div className="col gap-8" aria-busy="true">
      {widths.map((w, i) => <div key={i} className="skel" style={{ width: w }} />)}
    </div>
  );
}

/** Daftar saran judul AI + output Gate CRISP-DM (`listing.py` terbaru). */
export function TitleSuggestions({
  primaryTitle,
  titles,
  recCat,
  tagSugs = [],
  aiMeta,
  onPick,
}: {
  primaryTitle?: string;
  titles: string[];
  recCat?: string;
  tagSugs?: string[];
  aiMeta?: ListingAiMeta | null;
  onPick: (t: string) => void;
}) {
  if (!titles.length && !primaryTitle) return null;
  const safetyWarnings = aiMeta?.safety_warnings || [];
  const claimWarnings = aiMeta?.claim_warnings || [];
  const needsClaimReview = Boolean(aiMeta?.needs_claim_review ?? (safetyWarnings.length || claimWarnings.length));
  const priceStatus = aiMeta?.price_reference_status || 'Membutuhkan minimal 3 listing pembanding valid.';

  return (
    <div className="conf col gap-12" aria-label="Hasil AI Listing">
      <div className="row gap-8 wrapf center">
        <Tag kind="ai">{aiMeta?.text_provider ? `AI Listing · ${aiMeta.text_provider}` : 'Saran AI Listing'}</Tag>
        {aiMeta?.text_model ? <span className="tag tag-est">{aiMeta.text_model}</span> : null}
        {aiMeta?.crisp_dm_version ? <span className="tag tag-est">{aiMeta.crisp_dm_version}</span> : null}
        <span className={needsClaimReview ? 'tag tag-warn' : 'tag tag-data'}>
          {needsClaimReview ? 'Perlu tinjau klaim/keamanan' : 'Lolos Claim & Safety Gate'}
        </span>
      </div>

      {primaryTitle ? (
        <div className="col gap-8">
          <span className="fine"><b>Judul utama disarankan</b></span>
          <button type="button" className="sugg-item" onClick={() => onPick(primaryTitle)}>
            <span><b>{primaryTitle}</b></span><span className="use">Pakai</span>
          </button>
        </div>
      ) : null}

      {titles.length ? (
        <div className="col gap-8">
          <span className="fine">Alternatif judul ({titles.length}): klik untuk memakai lalu sesuaikan.</span>
          <div className="sugg-list">
            {titles.map((t) => (
              <button key={t} type="button" className="sugg-item" onClick={() => onPick(t)}>
                <span>{t}</span><span className="use">Pakai</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {recCat || tagSugs.length ? (
        <div className="row gap-8 wrapf center">
          {recCat ? <span className="fine">Kategori: <b>{recCat}</b></span> : null}
          {tagSugs.length ? (
            <span className="fine">Tag material: <b>{tagSugs.join(', ')}</b></span>
          ) : null}
        </div>
      ) : null}

      {safetyWarnings.length ? (
        <div className="warn-box" role="status">
          <Icon name="warn" />
          <div>
            <b>Safety Gate</b>
            <ul>{safetyWarnings.map((w) => <li key={w}>{w}</li>)}</ul>
          </div>
        </div>
      ) : null}

      {claimWarnings.length ? (
        <div className="warn-box" role="status">
          <Icon name="warn" />
          <div>
            <b>Claim Review Gate</b>
            <ul>{claimWarnings.map((c) => <li key={c.phrase}><b>{c.phrase}</b> — {c.why}</li>)}</ul>
          </div>
        </div>
      ) : null}

      <p className="fine">
        <b>Price Comparables Gate:</b> {priceStatus}
      </p>
    </div>
  );
}

/** Saran kategori AI bila berbeda dari pilihan saat ini. */
export function CategorySuggestion({ recCat, onUse }: { recCat: string; onUse: () => void }) {
  return (
    <div className="row gap-8 center wrapf">
      <Tag kind="ai">Saran AI</Tag>
      <span className="fine">Kategori yang cocok: <b>{recCat}</b></span>
      <button type="button" className="btn btn-ghost btn-sm" onClick={onUse}>Pakai</button>
    </div>
  );
}

/** Panel kanan "Asisten listing" (ungu muda). */
export function AssistantPanel({ head, items }: { head: string; items: string[] }) {
  return (
    <aside className="sell-ai" aria-label="Asisten listing">
      <p className="eyebrow on-dark">Asisten listing</p>
      <h2 className="h4">{head}</h2>
      <ul className="ai-list">
        {items.map((a) => (
          <li key={a}>
            <svg className="ic ic-s" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
            <span>{a}</span>
          </li>
        ))}
      </ul>
      <p className="fine" style={{ color: '#3A3A3A' }}>AI hanya memberi saran. Kamu bertanggung jawab atas kebenaran isi listing.</p>
    </aside>
  );
}
