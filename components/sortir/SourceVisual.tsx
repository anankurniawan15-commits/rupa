'use client';
import Image from 'next/image';
import { Placeholder } from '@/components/ui/Placeholder';
import { sampleOf } from '@/lib/services/sortir.service';
import type { PlaceholderKind } from '@/types/product';
import type { SortirSource } from '@/types/ai';

export type SourceVis =
  | { kind: 'img'; img: string; cls: string; alt: string; label: string; upload: boolean }
  | { kind: 'ph'; ph: PlaceholderKind; phLabel: string; label: string }
  | { kind: 'text'; text: string; label: string }
  | { kind: 'none'; label: string };

/** Cara menampilkan sumber analisis (foto unggahan, foto contoh, atau deskripsi teks). */
export function sourceVis(src: SortirSource | null): SourceVis {
  if (!src) return { kind: 'none', label: '' };
  if (src.kind === 'upload') return src.url ? { kind: 'img', img: src.url, cls: 'cover', alt: 'Foto yang kamu unggah', label: 'Fotomu: ' + src.name, upload: true } : { kind: 'none', label: 'Fotomu: ' + src.name };
  if (src.kind === 'manual') return { kind: 'text', text: src.text, label: 'Analisis dari deskripsi teks' };
  const meta = sampleOf(src.key);
  if (meta.img) return { kind: 'img', img: meta.img, cls: 'cover' + (meta.blur ? ' blurimg' : ''), alt: 'Foto contoh: ' + meta.label, label: 'Foto contoh: ' + meta.label, upload: false };
  return { kind: 'ph', ph: meta.ph || 'textile', phLabel: 'Ilustrasi — ' + meta.label, label: 'Foto contoh: ' + meta.label };
}

/** Isi `.frame`: gambar, placeholder material, atau kutipan deskripsi. */
export function SourceVisual({ vis }: { vis: SourceVis }) {
  if (vis.kind === 'img') {
    return <Image src={vis.img} alt={vis.alt} className={vis.cls} fill sizes="(max-width: 760px) 100vw, 40vw" unoptimized={vis.upload} />;
  }
  if (vis.kind === 'ph') return <Placeholder kind={vis.ph} label={vis.phLabel} />;
  if (vis.kind === 'text') {
    return (
      <div className="txt-src">
        <p className="mono-label">Deskripsimu</p>
        <p>“{vis.text}”</p>
      </div>
    );
  }
  return null;
}
