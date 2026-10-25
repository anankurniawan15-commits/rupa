'use client';
import { Icon } from '@/components/ui/Icon';
import { LOW_PICKS } from '@/lib/ai/sortir-engine';
import { SourceVisual, type SourceVis } from './SourceVisual';
import type { ScenarioKey } from '@/types/ai';

/** Keyakinan < 60 atau deskripsi tidak dikenali → minta pengguna memilih material. */
export function LowConfidencePanel({ vis, manual, onPick, onRetake, onManual }: { vis: SourceVis; manual: boolean; onPick: (k: ScenarioKey) => void; onRetake: () => void; onManual: () => void }) {
  const reason = manual ? 'Deskripsinya belum menyebut bahan yang bisa kami kenali.' : 'Foto buram dan sebagian barang terpotong, jadi tekstur dan bentuknya sulit dikenali.';
  return (
    <div className="res">
      <div className="res-img"><div className="frame"><SourceVisual vis={vis} /></div></div>
      <div className="res-main">
        <div className="col gap-8">
          <span className="tag tag-warn" style={{ alignSelf: 'flex-start' }}>Keyakinan rendah</span>
          <h2 className="h2">Kami belum yakin ini material apa</h2>
        </div>
        <div className="conf">
          <div className="conf-l"><span>Keyakinan</span><b>Rendah · sekitar 30%</b></div>
          <div className="meter" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={30} aria-label="Tingkat keyakinan"><span className="cf-lo" style={{ width: '30%' }} /></div>
          <p className="fine">{reason}</p>
        </div>
        <div className="col gap-12">
          <h3 className="h4">Bantu kami: barang ini paling mirip apa?</h3>
          <div className="chips">
            {LOW_PICKS.map(([k, l]) => <button key={k} type="button" className="chip" onClick={() => onPick(k)}>{l}</button>)}
          </div>
        </div>
        <div className="notice"><Icon name="camera" /><span>Tips foto ulang: letakkan barang di permukaan polos, foto dari jarak 30–50 cm, dan pastikan seluruh barang masuk bingkai.</span></div>
        <div className="row gap-8 wrapf">
          <button type="button" className="btn btn-secondary" onClick={onRetake}>Foto ulang</button>
          <button type="button" className="btn btn-ghost" onClick={onManual}>Jelaskan dengan teks</button>
        </div>
      </div>
    </div>
  );
}
