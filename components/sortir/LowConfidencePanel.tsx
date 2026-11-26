'use client';
import { Icon } from '@/components/ui/Icon';
import { LOW_PICKS } from '@/lib/ai/sortir-engine';
import { SourceVisual, type SourceVis } from './SourceVisual';
import type { SortirMaterialCategory } from '@/types/ai';

/** Keyakinan < 60, material unknown, atau deskripsi teks tanpa gambar → jalankan Safety Gate & minta pilih material manual. */
export function LowConfidencePanel({
  vis,
  manual,
  warnings = [],
  limitations = [],
  noteText = '',
  onPick,
  onRetake,
  onManual,
}: {
  vis: SourceVis;
  manual: boolean;
  warnings?: string[];
  limitations?: string[];
  noteText?: string;
  onPick: (k: Exclude<SortirMaterialCategory, 'unknown'>) => void;
  onRetake: () => void;
  onManual: () => void;
}) {
  const reason =
    noteText ||
    (manual
      ? 'Material belum dapat dipastikan karena tidak terdapat gambar (analisis deskripsi teks meminta pemilihan material manual).'
      : 'Foto buram, terpotong, atau confidence Vision API belum cukup untuk memastikan jenis material.');
  return (
    <div className="res">
      <div className="res-img"><div className="frame"><SourceVisual vis={vis} /></div></div>
      <div className="res-main">
        <div className="col gap-8">
          <div className="row gap-8 wrapf center">
            <span className="tag tag-warn">Perlu verifikasi manual</span>
            <span className="tag tag-est">needs_manual_review</span>
          </div>
          <h2 className="h2">{manual ? 'Pilih kategori material secara manual' : 'Kami belum yakin ini material apa'}</h2>
        </div>
        <div className="conf">
          <div className="conf-l"><span>Confidence</span><b>{manual ? 'Belum dihitung (tanpa gambar)' : 'Belum cukup bukti'}</b></div>
          <p className="fine">{reason}</p>
        </div>
        {warnings.length ? (
          <div className="warn-box" role="note">
            <Icon name="warn" />
            <div>
              <b>Safety Gate — Perhatikan sebelum disentuh</b>
              <ul>{warnings.map((w) => <li key={w}>{w}</li>)}</ul>
            </div>
          </div>
        ) : null}
        <div className="col gap-12">
          <h3 className="h4">Bantu kami: barang ini berbahan apa?</h3>
          <div className="chips">
            {LOW_PICKS.map(([k, l]) => <button key={k} type="button" className="chip" onClick={() => onPick(k)}>{l}</button>)}
          </div>
        </div>
        {limitations.length ? (
          <div className="notice">
            <Icon name="info" />
            <div><b>Batasan analisis:</b> {limitations.join(' ')}</div>
          </div>
        ) : (
          <div className="notice"><Icon name="camera" /><span>Tips foto ulang: letakkan barang di permukaan polos, foto dari jarak 30–50 cm, dan pastikan seluruh barang masuk bingkai.</span></div>
        )}
        <div className="row gap-8 wrapf">
          <button type="button" className="btn btn-secondary" onClick={onRetake}>Foto ulang</button>
          <button type="button" className="btn btn-ghost" onClick={onManual}>Ubah deskripsi teks</button>
        </div>
      </div>
    </div>
  );
}
