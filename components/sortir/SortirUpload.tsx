'use client';
import Image from 'next/image';
import { useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react';
import { Icon } from '@/components/ui/Icon';
import { SAMPLE_ENTRIES } from '@/lib/services/sortir.service';
import { UPLOAD_PICKS } from '@/lib/ai/sortir-engine';
import { SourceVisual, type SourceVis } from './SourceVisual';
import type { SampleKey, ScenarioKey } from '@/types/ai';

const fileOf = (e: ChangeEvent<HTMLInputElement>) => {
  const f = e.target.files && e.target.files[0];
  try {
    e.target.value = '';
  } catch {
    /* noop */
  }
  return f || null;
};

/** Langkah 1 — keadaan idle: dropzone, tombol kamera/galeri (mobile), contoh, deskripsi manual. */
export function SortirUpload({
  fileErr, manual, manualErr, onFile, onSample, onManualChange, onManualSubmit,
}: {
  fileErr: string;
  manual: string;
  manualErr: string;
  onFile: (f: File | null) => void;
  onSample: (k: SampleKey) => void;
  onManualChange: (v: string) => void;
  onManualSubmit: () => void;
}) {
  const [drag, setDrag] = useState(false);
  const onDragOver = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    if (!drag) setDrag(true);
  };
  const onDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    onFile(f || null);
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onManualSubmit();
  };
  return (
    <div className="so-grid">
      <div>
        <input id="sofile" className="sr" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => onFile(fileOf(e))} />
        <label className={drag ? 'dz is-drag' : 'dz'} htmlFor="sofile" onDragOver={onDragOver} onDragLeave={() => setDrag(false)} onDrop={onDrop}>
          <span className="dz-icon"><Icon name="upload" size="l" /></span>
          <span className="dz-t hide-m">Tarik dan lepas foto barang di sini</span>
          <span className="dz-t only-m">Foto barangmu</span>
          <span className="dz-s">JPG, PNG, atau WebP · maks. 10 MB · satu barang per foto</span>
          <span className="btn btn-primary hide-m">Pilih foto dari komputer</span>
        </label>
        <div className="only-m row gap-8 mt-16 w100">
          <input id="socam" className="sr" type="file" accept="image/*" capture="environment" onChange={(e) => onFile(fileOf(e))} />
          <label htmlFor="socam" className="btn btn-primary grow"><Icon name="camera" />Kamera</label>
          <label htmlFor="sofile" className="btn btn-secondary grow"><Icon name="image" />Galeri</label>
        </div>
        {fileErr ? <p className="err mt-8" role="alert"><Icon name="warn" size="s" />{fileErr}</p> : null}
        <p className="privacy">
          <Icon name="shield" />
          <span>Foto hanya dipakai untuk analisis ini dan tidak tampil ke pengguna lain. Kamu bisa menyimpan hasilnya (tanpa foto) ke profil. Hindari foto yang memperlihatkan wajah, alamat, atau dokumen pribadi.</span>
        </p>
      </div>
      <div>
        <h2 className="h4">Belum punya foto? Coba contoh ini</h2>
        <p className="help">Setiap contoh menunjukkan satu kondisi hasil yang berbeda.</p>
        <div className="samples">
          {SAMPLE_ENTRIES.map(([k, m]) => (
            <button key={k} type="button" className="sample" onClick={() => onSample(k)}>
              <span className="sample-img" style={{ position: 'relative' }}>
                {m.img ? <Image src={m.img} alt="" className={'cover' + (m.blur ? ' blurimg' : '')} fill sizes="(max-width: 760px) 33vw, 160px" /> : <span className={'ph ph-' + (m.ph || 'textile')} />}
              </span>
              <span className="sample-l">{m.label}</span>
              <span className="sample-n">{m.note}</span>
            </button>
          ))}
        </div>
        <form className="manual" onSubmit={submit} noValidate>
          <label htmlFor="somanual" className="h4">Tidak bisa memotret? Jelaskan barangnya</label>
          <textarea
            id="somanual"
            className="input"
            rows={3}
            value={manual}
            onChange={(e) => onManualChange(e.target.value)}
            placeholder="Contoh: celana jeans biru ukuran 30, robek di lutut kiri, jahitan saku masih bagus"
            aria-invalid={manualErr ? true : undefined}
            aria-describedby={manualErr ? 'somanual-err' : undefined}
          />
          {manualErr ? <p className="err" id="somanual-err" role="alert">{manualErr}</p> : null}
          <div><button className="btn btn-secondary" type="submit">Analisis dari deskripsi</button></div>
        </form>
      </div>
    </div>
  );
}

/** Langkah 1 — pratinjau sebelum analisis (Ganti foto / Hapus). */
export function SortirPreview({ vis, onAnalyze, onFile, onRemove }: { vis: SourceVis; onAnalyze: () => void; onFile: (f: File | null) => void; onRemove: () => void }) {
  return (
    <div className="preview">
      <div className="frame"><SourceVisual vis={vis} /></div>
      <div className="col gap-16">
        <h2 className="h2">Siap dianalisis</h2>
        <p className="muted">{vis.label}</p>
        <ul className="checks">
          <li><Icon name="check" className="ok-ic" />Satu barang per foto, terlihat utuh</li>
          <li><Icon name="check" className="ok-ic" />Cahaya cukup, tidak buram</li>
          <li><Icon name="check" className="ok-ic" />Bagian yang rusak ikut terlihat</li>
        </ul>
        <div className="row gap-8 wrapf">
          <button type="button" className="btn btn-ai btn-lg" onClick={onAnalyze}><Icon name="scan" />Mulai analisis</button>
          <input id="soreplace" className="sr" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => onFile(fileOf(e))} />
          <label htmlFor="soreplace" className="btn btn-secondary btn-lg">Ganti foto</label>
          <button type="button" className="btn btn-ghost btn-lg" onClick={onRemove}><Icon name="trash" />Hapus</button>
        </div>
      </div>
    </div>
  );
}

/** Tangkapan layar / bukan foto barang fisik. */
export function SortirUnsupported({ onRemove, onManual }: { onRemove: () => void; onManual: () => void }) {
  return (
    <div className="state-card" role="alert">
      <span className="state-ic"><Icon name="imageOff" size="l" /></span>
      <h2 className="h2">Foto ini belum bisa kami analisis</h2>
      <p className="muted">Sepertinya ini tangkapan layar atau bukan foto barang fisik. AI Sortir bekerja paling baik dengan satu barang nyata yang difoto utuh dengan cahaya cukup.</p>
      <div className="row gap-8 wrapf">
        <button type="button" className="btn btn-primary" onClick={onRemove}>Unggah foto lain</button>
        <button type="button" className="btn btn-secondary" onClick={onManual}>Jelaskan dengan teks</button>
      </div>
    </div>
  );
}

/** Koneksi ke layanan analisis terputus (simulasi). */
export function SortirError({ onRetry, onManual, onRemove }: { onRetry: () => void; onManual: () => void; onRemove: () => void }) {
  return (
    <div className="state-card" role="alert">
      <span className="state-ic err"><Icon name="warn" size="l" /></span>
      <h2 className="h2">Analisis gagal dimuat</h2>
      <p className="muted">Koneksi ke layanan analisis terputus sebelum hasilnya selesai. Fotomu belum disimpan di mana pun. Coba lagi dalam beberapa saat.</p>
      <div className="row gap-8 wrapf">
        <button type="button" className="btn btn-primary" onClick={onRetry}><Icon name="retry" />Coba lagi</button>
        <button type="button" className="btn btn-secondary" onClick={onManual}>Jelaskan dengan teks</button>
        <button type="button" className="btn btn-ghost" onClick={onRemove}>Kembali</button>
      </div>
    </div>
  );
}

/** Foto unggahan sungguhan tidak dianalisis — pengguna memilih jenis barang (hasil berlabel "contoh"). */
export function SortirUploadChoice({ vis, onPick, onRemove }: { vis: SourceVis; onPick: (k: ScenarioKey) => void; onRemove: () => void }) {
  return (
    <div className="preview">
      <div className="frame">{vis.kind === 'img' ? <SourceVisual vis={vis} /> : null}</div>
      <div className="col gap-16">
        <span className="tag tag-est" style={{ alignSelf: 'flex-start' }}>Mode prototipe</span>
        <h2 className="h2">Fotomu terunggah — tapi AI belum benar-benar membacanya</h2>
        <p className="muted">Prototipe ini belum terhubung ke model analisis gambar. Pilih jenis barang yang paling mirip untuk melihat bagaimana hasilnya akan ditampilkan. Hasilnya akan diberi label “contoh”.</p>
        <div className="chips">
          {UPLOAD_PICKS.map(([k, l]) => (
            <button key={k} type="button" className="chip" onClick={() => onPick(k)}>{l}</button>
          ))}
        </div>
        <div><button type="button" className="btn btn-ghost" onClick={onRemove}>Pilih foto lain</button></div>
      </div>
    </div>
  );
}
