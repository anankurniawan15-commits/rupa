'use client';
import Image from 'next/image';
import { Icon } from '@/components/ui/Icon';
import { SELL_CONDS, SELL_SHIPS } from '@/lib/services/listing-assist.service';
import { initialsOf, num, rp } from '@/lib/format';
import type { ListingDraft } from '@/types/product';
import { ClaimSummary } from './ClaimWarnings';

/** Langkah 6 — pratinjau kartu, ringkasan, dan checklist sebelum terbit. */
export function ListingPreview({ form, missing, flagCount, shopName }: { form: ListingDraft; missing: number[]; flagCount: number; shopName: string }) {
  const cover = form.photos[0]?.url;
  const condSel = SELL_CONDS.find((x) => x[0] === form.cond);
  const shipSel = SELL_SHIPS.filter((x) => form.ships[x[0] as keyof ListingDraft['ships']]).map((x) => x[1]);
  const chk = (text: string, ok: boolean, req: boolean) => ({ text, ok, miss: !ok && req });
  const checks = [
    chk('Minimal satu foto', form.photos.length > 0, true),
    chk('Judul dan kategori', missing.indexOf(2) < 0, true),
    chk('Material asal dan kondisi', missing.indexOf(3) < 0, true),
    chk('Harga dan stok', missing.indexOf(4) < 0, true),
    chk('Lokasi dan opsi pengiriman', missing.indexOf(5) < 0, true),
    chk('Ukuran (disarankan)', !!form.dims.trim(), false),
    chk('Deskripsi (disarankan)', !!form.desc.trim(), false),
  ];
  return (
    <div className="col gap-24">
      <div><h2 className="h2">Pratinjau dan terbitkan</h2><p className="muted mt-8">Begini listingmu akan terlihat oleh pembeli.</p></div>
      <div className="preview-grid">
        <article className="pc">
          <div className="pc-media">
            {cover ? (
              <Image className="pc-img" src={cover} alt="Pratinjau foto sampul" fill sizes="230px" unoptimized={cover.startsWith('blob:')} />
            ) : (
              <span className="ph ph-textile"><span className="ph-tag">Belum ada foto</span></span>
            )}
          </div>
          <div className="pc-body">
            <span className="mat-tag"><Icon name="cycle" size="s" />{form.matOrigin || '[Material asal]'}</span>
            <h3 className="pc-title">{form.title || '[Judul produk]'}</h3>
            <p className="pc-price">{num(form.price) ? rp(num(form.price)) : '[Harga]'}</p>
            <p className="pc-seller"><span className="av">{shopName ? initialsOf(shopName) : 'RT'}</span><span className="t">{(shopName || '[Nama toko]') + ' · ' + (form.city || '[Kota]')}</span></p>
          </div>
        </article>
        <div className="col gap-24">
          <dl className="sum-dl">
            <div><dt>Kategori</dt><dd>{form.cat || '—'}</dd></div>
            <div><dt>Material asal</dt><dd>{form.matOrigin || '—'}</dd></div>
            <div><dt>Kondisi</dt><dd>{condSel ? condSel[1] : '—'}</dd></div>
            <div><dt>Stok</dt><dd>{form.stock || '—'}</dd></div>
            <div><dt>Pengiriman</dt><dd>{shipSel.length ? shipSel.join(', ') + ' · ' + form.procTime : '—'}</dd></div>
          </dl>
          <div className="col gap-8">
            <h3 className="h4">Pemeriksaan sebelum terbit</h3>
            <ul className="checks">
              {checks.map((c) => (
                <li key={c.text}>
                  {c.ok ? (
                    <svg className="ic ok-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l5 5 9-10" /></svg>
                  ) : c.miss ? (
                    <svg className="ic miss-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4l9 16H3z" /><path d="M12 10v4M12 17v.5" /></svg>
                  ) : (
                    <svg className="ic opt-ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8v.5" /></svg>
                  )}
                  <span>{c.text}</span>
                </li>
              ))}
            </ul>
          </div>
          <ClaimSummary count={flagCount} />
        </div>
      </div>
    </div>
  );
}
