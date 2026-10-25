'use client';
import type { FormEvent } from 'react';
import { Icon } from '@/components/ui/Icon';
import { ErrorText } from '@/components/ui/Field';
import { toast } from '@/lib/store/toast';
import { cx } from '@/lib/format';
import { CITIES, PROC_TIMES, SELL_CATEGORIES, SELL_CONDS, SELL_SHIPS, listingAssistService } from '@/lib/services/listing-assist.service';
import type { ClaimFlag, PriceReference as Ref } from '@/types/ai';
import type { ListingDraft } from '@/types/product';
import { AiSkeleton, CategorySuggestion, TitleSuggestions } from './AiSuggestions';
import { ClaimWarnings } from './ClaimWarnings';
import { PriceReference } from './PriceReference';
import { PriceCalculator } from './PriceCalculator';
import type { StepProps } from './types';

const inputCls = (err?: string) => cx('input', !!err && 'has-err');
const ChatIc = () => <Icon name="chat" size="s" />;

/* ---------- Langkah 2: judul dan kategori ---------- */
export function StepTitle({ form, ui, setUi, setField }: StepProps) {
  const e = ui.errors;
  const suggest = async () => {
    if (form.draft.trim().length < 15) { setUi((u) => ({ errors: { ...u.errors, draft: 'Tulis cerita produk minimal 15 karakter supaya AI punya bahan.' } })); return; }
    setUi((u) => ({ titleLoading: true, titleSugs: [], errors: { ...u.errors, draft: '' } }));
    const r = await listingAssistService.suggestTitles(form.draft, form.matOrigin, form.tags);
    setUi({ titleLoading: false, recCat: r.recCat, titleSugs: r.titles, tagSugs: r.tags });
  };
  return (
    <div className="col gap-24">
      <div><h2 className="h2">Judul dan kategori</h2><p className="muted mt-8">Ceritakan dulu produkmu dengan bahasamu sendiri. AI bisa menyarankan judul dan kategori dari cerita itu.</p></div>
      <div className="field">
        <label className="lbl" htmlFor="sl-draft">Ceritakan produkmu</label>
        <textarea id="sl-draft" className={inputCls(e.draft)} aria-invalid={!!e.draft || undefined} value={form.draft} onChange={(ev) => setField('draft', ev.target.value)} placeholder="Contoh: tote dari saku jeans bekas pelanggan dan kanvas sisa konveksi, dijahit dua lapis, muat laptop 13 inci" />
        <ErrorText>{e.draft}</ErrorText>
        <div className="row gap-8 wrapf">
          <button type="button" className="ai-btn" onClick={() => void suggest()} disabled={ui.titleLoading}><ChatIc />Sarankan judul, kategori, dan tag</button>
        </div>
      </div>
      {ui.titleLoading ? <AiSkeleton widths={['80%', '65%', '72%']} /> : null}
      <TitleSuggestions titles={ui.titleSugs} onPick={(t) => setField('title', t)} />
      <div className="field">
        <div className="row between"><label className="lbl" htmlFor="sl-title">Judul produk</label><span className="fine">{form.title.length}/70</span></div>
        <input id="sl-title" className={inputCls(e.title)} aria-invalid={!!e.title || undefined} maxLength={70} value={form.title} onChange={(ev) => setField('title', ev.target.value)} placeholder="Jenis produk + material asal, misalnya “Tote Bag Denim Bekas”" />
        <ErrorText>{e.title}</ErrorText>
      </div>
      <div className="field">
        <label className="lbl" htmlFor="sl-cat">Kategori</label>
        <select id="sl-cat" className={inputCls(e.cat)} aria-invalid={!!e.cat || undefined} value={form.cat} onChange={(ev) => setField('cat', ev.target.value)}>
          <option value="">Pilih kategori</option>
          {SELL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <ErrorText>{e.cat}</ErrorText>
        {ui.recCat && ui.recCat !== form.cat ? <CategorySuggestion recCat={ui.recCat} onUse={() => setField('cat', ui.recCat)} /> : null}
      </div>
    </div>
  );
}

/* ---------- Langkah 3: material, kondisi, detail ---------- */
export function StepMaterial({ form, ui, setForm, setUi, setField, flags }: StepProps & { flags: ClaimFlag[] }) {
  const e = ui.errors;
  const addTag = (ev: FormEvent) => {
    ev.preventDefault();
    const t = ui.tagInput.trim().toLowerCase();
    if (!t) return;
    if (form.tags.indexOf(t) < 0) setForm({ tags: form.tags.concat([t]) });
    setUi({ tagInput: '' });
  };
  const genDesc = async () => {
    setUi({ descLoading: true });
    const d = await listingAssistService.generateDescription(form);
    setForm({ desc: d });
    setUi({ descLoading: false });
    toast('Draf deskripsi dibuat — periksa dan sesuaikan', { kind: 'info' });
  };
  const tagSugs = ui.tagSugs.filter((t) => form.tags.indexOf(t) < 0);
  return (
    <div className="col gap-24">
      <div><h2 className="h2">Material, kondisi, dan detail</h2><p className="muted mt-8">Bagian ini yang membedakan listing upcycle: pisahkan bahan asal dari produk jadi.</p></div>
      <div className="field">
        <label className="lbl" htmlFor="sl-mat">Material asal</label>
        <input id="sl-mat" className={inputCls(e.matOrigin)} aria-invalid={!!e.matOrigin || undefined} value={form.matOrigin} onChange={(ev) => setField('matOrigin', ev.target.value)} placeholder="Dari apa dan dari mana? Contoh: saku jeans bekas + kanvas sisa konveksi" />
        <ErrorText>{e.matOrigin}</ErrorText>
      </div>
      <div className="field">
        <span className="lbl">Tag material</span>
        <div className="chips">
          {form.tags.map((t) => (
            <button key={t} type="button" className="chip chip-x" onClick={() => setForm({ tags: form.tags.filter((x) => x !== t) })} aria-label={'Hapus tag ' + t}>{t}<Icon name="close" size="s" /></button>
          ))}
          {tagSugs.map((t) => (
            <button key={'s-' + t} type="button" className="chip" onClick={() => setForm({ tags: form.tags.concat([t]) })} aria-label={'Tambah tag saran AI ' + t}><Icon name="plus" size="s" />{t}</button>
          ))}
        </div>
        <form className="row gap-8" onSubmit={addTag}>
          <label htmlFor="sl-tag" className="sr">Tambah tag sendiri</label>
          <input id="sl-tag" className="input" style={{ maxWidth: 280 }} value={ui.tagInput} onChange={(ev) => setUi({ tagInput: ev.target.value })} placeholder="Tambah tag sendiri" />
          <button className="btn btn-secondary" type="submit">Tambah</button>
        </form>
        <span className="help">Tag dengan tanda + adalah saran AI dari ceritamu. Klik untuk menambahkan.</span>
      </div>
      <fieldset className="field">
        <legend className="lbl">Kondisi</legend>
        <div className="radio-cards">
          {SELL_CONDS.map(([k, l, d]) => (
            <label key={k} className={cx('rc', form.cond === k && 'is-on')}>
              <input type="radio" name="sl-cond" checked={form.cond === k} onChange={() => setField('cond', k)} />
              <span><span className="rc-t">{l}</span><span className="rc-d">{d}</span></span>
            </label>
          ))}
        </div>
        {e.cond ? <div className="mt-8"><ErrorText>{e.cond}</ErrorText></div> : null}
      </fieldset>
      <div className="form-grid">
        <div className="field"><label className="lbl" htmlFor="sl-dim">Ukuran <span className="opt">(disarankan)</span></label><input id="sl-dim" className="input" value={form.dims} onChange={(ev) => setField('dims', ev.target.value)} placeholder="Contoh: 35 × 40 cm, tali 60 cm" /></div>
        <div className="field"><label className="lbl" htmlFor="sl-w">Berat kemasan (gram)</label><input id="sl-w" className="input" inputMode="numeric" value={form.weight} onChange={(ev) => setField('weight', ev.target.value)} placeholder="Contoh: 350" /></div>
        <div className="field span2"><label className="lbl" htmlFor="sl-proc">Proses pembuatan <span className="opt">(disarankan)</span></label><textarea id="sl-proc" className="input" value={form.process} onChange={(ev) => setField('process', ev.target.value)} placeholder="Apa yang kamu ubah? Dicuci, dipotong, dijahit ulang, diampelas…" /></div>
      </div>
      <div className="field">
        <div className="row between center wrapf gap-8">
          <label className="lbl" htmlFor="sl-desc">Deskripsi produk</label>
          <button type="button" className="ai-btn" onClick={() => void genDesc()} disabled={ui.descLoading}><ChatIc />{form.desc.trim() ? 'Buat ulang draf deskripsi' : 'Buat draf deskripsi'}</button>
        </div>
        {ui.descLoading ? <AiSkeleton widths={['100%', '85%', '60%']} /> : null}
        <textarea id="sl-desc" className="input" style={{ minHeight: 150 }} value={form.desc} onChange={(ev) => setField('desc', ev.target.value)} placeholder="Tulis sendiri, atau minta AI membuat draf dari data di atas." />
        <span className="help">Draf AI dibuat dari isian di formulir ini. Tetap periksa dan sesuaikan sebelum terbit.</span>
      </div>
      <ClaimWarnings flags={flags} />
      <div className="field">
        <div className="row between center wrapf gap-8">
          <span className="lbl">Kata kunci pencarian</span>
          <button type="button" className="ai-btn" onClick={() => setForm({ keywords: listingAssistService.keywords(form) })}><ChatIc />Sarankan kata kunci</button>
        </div>
        {form.keywords.length ? (
          <div className="chips">
            {form.keywords.map((k) => (
              <button key={k} type="button" className="chip chip-x" onClick={() => setForm({ keywords: form.keywords.filter((x) => x !== k) })} aria-label={'Hapus kata kunci ' + k}>{k}<Icon name="close" size="s" /></button>
            ))}
          </div>
        ) : null}
        <span className="help">Kata yang mungkin diketik pembeli. Tidak ditampilkan di halaman produk.</span>
      </div>
    </div>
  );
}

/* ---------- Langkah 4: harga dan stok ---------- */
export function StepPrice({ form, ui, setUi, setField, refData }: StepProps & { refData: Ref }) {
  const e = ui.errors;
  return (
    <div className="col gap-24">
      <div><h2 className="h2">Harga dan stok</h2><p className="muted mt-8">Waktu dan keterampilanmu ikut dihitung. Referensi harga hanya muncul bila ada cukup listing pembanding.</p></div>
      <div className="form-grid">
        <div className="field">
          <label className="lbl" htmlFor="sl-price">Harga</label>
          <div className={cx('prefix', !!e.price && 'has-err')}><span>Rp</span><input id="sl-price" inputMode="numeric" aria-invalid={!!e.price || undefined} value={form.price} onChange={(ev) => setField('price', ev.target.value)} placeholder="85000" /></div>
          <ErrorText>{e.price}</ErrorText>
        </div>
        <div className="field">
          <label className="lbl" htmlFor="sl-stock">Stok</label>
          <input id="sl-stock" className={inputCls(e.stock)} aria-invalid={!!e.stock || undefined} inputMode="numeric" value={form.stock} onChange={(ev) => setField('stock', ev.target.value)} />
          <span className="help">Barang satu-satunya? Isi 1.</span>
          <ErrorText>{e.stock}</ErrorText>
        </div>
      </div>
      <PriceReference refData={refData} cat={form.cat} />
      <PriceCalculator ui={ui} onChange={(k, v) => setUi({ [k]: v })} onUse={(p) => setField('price', String(p))} />
    </div>
  );
}

/* ---------- Langkah 5: pengiriman ---------- */
export function StepShipping({ form, ui, setField }: StepProps) {
  const e = ui.errors;
  return (
    <div className="col gap-24">
      <div><h2 className="h2">Pengiriman dan lokasi</h2><p className="muted mt-8">Ongkir dihitung saat pembeli checkout. Di prototipe ini angkanya simulasi.</p></div>
      <div className="form-grid">
        <div className="field">
          <label className="lbl" htmlFor="sl-city">Dikirim dari</label>
          <select id="sl-city" className={inputCls(e.city)} aria-invalid={!!e.city || undefined} value={form.city} onChange={(ev) => setField('city', ev.target.value)}>
            <option value="">Pilih kota</option>
            {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <ErrorText>{e.city}</ErrorText>
        </div>
        <div className="field">
          <label className="lbl" htmlFor="sl-proct">Waktu pengemasan</label>
          <select id="sl-proct" className="input" value={form.procTime} onChange={(ev) => setField('procTime', ev.target.value)}>
            {PROC_TIMES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>
      <fieldset className="field">
        <legend className="lbl">Opsi pengiriman</legend>
        <div className="radio-cards">
          {SELL_SHIPS.map(([k, l, d]) => {
            const key = k as keyof ListingDraft['ships'];
            const on = !!form.ships[key];
            return (
              <label key={k} className={cx('rc', on && 'is-on')}>
                <input type="checkbox" checked={on} onChange={() => setField('ships', { ...form.ships, [key]: !on })} />
                <span><span className="rc-t">{l}</span><span className="rc-d">{d}</span></span>
              </label>
            );
          })}
        </div>
        {e.ships ? <div className="mt-8"><ErrorText>{e.ships}</ErrorText></div> : null}
      </fieldset>
    </div>
  );
}
