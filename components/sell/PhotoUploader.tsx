'use client';
import Image from 'next/image';
import type { ChangeEvent } from 'react';
import { Icon } from '@/components/ui/Icon';
import { ErrorText } from '@/components/ui/Field';
import { MAX_PHOTOS, PHOTO_TYPES, SAMPLE_PHOTOS } from '@/lib/services/listing-assist.service';
import type { StepProps } from './types';

/** Langkah 1 — foto produk (maks. 5, foto pertama jadi sampul). */
export function PhotoUploader({ form, ui, setField }: StepProps) {
  const photos = form.photos;
  const onFile = (ev: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(ev.target.files || []).filter((f) => PHOTO_TYPES.indexOf(f.type) >= 0).slice(0, MAX_PHOTOS - photos.length);
    const add = files.map((f) => {
      let url = '';
      try { url = URL.createObjectURL(f); } catch { url = ''; }
      return { url };
    }).filter((p) => p.url);
    setField('photos', photos.concat(add));
    try { ev.target.value = ''; } catch { /* noop */ }
  };
  return (
    <div className="col gap-16">
      <div>
        <h2 className="h2">Foto produk</h2>
        <p className="muted mt-8">Maksimal 5 foto. Foto pertama jadi sampul. Sertakan foto material asal atau proses — pembeli lebih percaya bila bisa melihatnya.</p>
      </div>
      <div className="ph-grid">
        {photos.map((ph, i) => (
          <div key={ph.url + i} className="ph-slot">
            <Image className="cover" src={ph.url} alt={'Foto produk ' + (i + 1)} fill sizes="160px" unoptimized={ph.url.startsWith('blob:')} />
            <button type="button" className="iconbtn sm" onClick={() => setField('photos', photos.filter((_, j) => j !== i))} aria-label={'Hapus foto ' + (i + 1)}>
              <Icon name="close" size="s" />
            </button>
            {i === 0 ? <span className="tag tag-rec">Sampul</span> : null}
          </div>
        ))}
        {photos.length < MAX_PHOTOS ? (
          <div>
            <input id="slfile" className="sr" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={onFile} />
            <label htmlFor="slfile" className="ph-add"><Icon name="plus" />Tambah foto</label>
          </div>
        ) : null}
      </div>
      <ErrorText>{ui.errors.photos}</ErrorText>
      <div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setField('photos', photos.concat(SAMPLE_PHOTOS).slice(0, MAX_PHOTOS))}>
          <Icon name="image" size="s" />Gunakan foto contoh (prototipe)
        </button>
      </div>
    </div>
  );
}
