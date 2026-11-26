'use client';
/**
 * Modal yang dipakai lintas halaman (persis prototipe):
 *  - ChatModal    : chat penjual/pembeli dengan balasan otomatis berlabel prototipe
 *  - ReasonModal  : pilih alasan (laporkan listing, ajukan bantuan, putuskan sengketa)
 *  - ReviewModal  : bintang + teks
 *  - TextModal    : satu/dua isian teks (balas ulasan, tambah alamat, alasan tolak toko)
 * Isi modal dipasang ulang setiap kali dibuka, jadi state formulir selalu bersih.
 */
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { messageService, useThread } from '@/lib/services/profile.service';
import { reviewSchema, fieldErrors } from '@/lib/validation';

function Err({ msg }: { msg: string }) {
  return msg ? <p className="err" role="alert"><Icon name="warn" size="s" />{msg}</p> : null;
}

/* ---------- Chat ---------- */
type ChatProps = { open: boolean; threadKey: string; title: string; sub?: string; onClose: () => void };

export function ChatModal(props: ChatProps) {
  return <Modal open={props.open} title={props.title} sub={props.sub} onClose={props.onClose}><ChatBody threadKey={props.threadKey} /></Modal>;
}

function ChatBody({ threadKey }: { threadKey: string }) {
  const thread = useThread(threadKey);
  const [text, setText] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [thread]);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    void messageService.send(threadKey, text);
    setText('');
  };
  return (
    <div className="col gap-12">
      <div className="thread" ref={ref} aria-live="polite">
        {thread.map((t, i) => (
          <div key={i} className={t.from === 'me' ? 'tb me' : 'tb them'}>{t.text}<small>{t.time}</small></div>
        ))}
      </div>
      <form className="row gap-8" onSubmit={submit}>
        <label htmlFor="m-chat" className="sr">Tulis pesan</label>
        <input id="m-chat" className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Tanya soal ukuran, bahan, atau pengiriman" />
        <Button type="submit">Kirim</Button>
      </form>
      <p className="fine">Demi keamanan, jangan bagikan nomor rekening atau bertransaksi di luar Rupa. Balasan penjual di prototipe ini otomatis.</p>
    </div>
  );
}

/* ---------- Pilih alasan ---------- */
type ReasonProps = {
  open: boolean; title: string; sub?: string; legend: string; reasons: string[]; note?: ReactNode; submitLabel: string;
  onSubmit: (reason: string, detail: string) => void; onClose: () => void; withDetail?: boolean;
};

export function ReasonModal(props: ReasonProps) {
  return <Modal open={props.open} title={props.title} sub={props.sub} onClose={props.onClose}><ReasonBody {...props} /></Modal>;
}

function ReasonBody({ legend, reasons, note, submitLabel, onSubmit, onClose, withDetail = true }: ReasonProps) {
  const [reason, setReason] = useState('');
  const [detail, setDetail] = useState('');
  const [err, setErr] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!reason) { setErr(legend === 'Keputusan' ? 'Pilih keputusan.' : 'Pilih salah satu alasan.'); return; }
    onSubmit(reason, detail);
  };
  return (
    <form className="col gap-12" onSubmit={submit}>
      <fieldset>
        <legend className="lbl">{legend}</legend>
        <div className="col gap-4">
          {reasons.map((r) => (
            <label key={r} className="check">
              <input type="radio" name="m-reason" checked={reason === r} onChange={() => { setReason(r); setErr(''); }} />
              {r}
            </label>
          ))}
        </div>
      </fieldset>
      {withDetail ? (
        <div className="field">
          <label className="lbl" htmlFor="m-detail">Ceritakan detailnya <span className="opt">(opsional)</span></label>
          <textarea id="m-detail" className="input" value={detail} onChange={(e) => setDetail(e.target.value)} />
        </div>
      ) : null}
      <Err msg={err} />
      {note ? <p className="fine">{note}</p> : null}
      <div className="modal-f">
        <Button variant="secondary" onClick={onClose}>Batal</Button>
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}

/* ---------- Ulasan ---------- */
type ReviewProps = { open: boolean; sub?: string; onSubmit: (stars: number, text: string) => void; onClose: () => void };

export function ReviewModal(props: ReviewProps) {
  return <Modal open={props.open} title="Beri ulasan" sub={props.sub} onClose={props.onClose}><ReviewBody {...props} /></Modal>;
}

function ReviewBody({ onSubmit, onClose }: ReviewProps) {
  const [stars, setStars] = useState(0);
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const er = fieldErrors(reviewSchema.safeParse({ stars, text }));
    if (er.stars || er.text) { setErr(er.stars || er.text); return; }
    onSubmit(stars, text);
  };
  return (
    <form className="col gap-12" onSubmit={submit}>
      <fieldset>
        <legend className="lbl">Rating</legend>
        <div className="stars">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" className={'star-btn' + (stars >= n ? ' is-on' : '')} onClick={() => { setStars(n); setErr(''); }} aria-pressed={stars >= n} aria-label={n + ' bintang'}>
              <Icon name="star" filled />
            </button>
          ))}
        </div>
      </fieldset>
      <div className="field">
        <label className="lbl" htmlFor="m-rev">Ulasanmu</label>
        <textarea id="m-rev" className="input" value={text} onChange={(e) => { setText(e.target.value); setErr(''); }} placeholder="Bagaimana kualitas jahitan, kesesuaian deskripsi material, dan pengemasannya?" />
      </div>
      <Err msg={err} />
      <div className="modal-f">
        <Button variant="secondary" onClick={onClose}>Batal</Button>
        <Button type="submit">Kirim ulasan</Button>
      </div>
    </form>
  );
}

/* ---------- Teks ---------- */
type TextProps = {
  open: boolean; title: string; sub?: string; quote?: string; label1: string; label2?: string; initial?: string; submitLabel: string;
  /** Kembalikan pesan galat atau '' bila valid. */
  validate: (text: string, text2: string) => string;
  onSubmit: (text: string, text2: string) => void; onClose: () => void;
};

export function TextModal(props: TextProps) {
  return <Modal open={props.open} title={props.title} sub={props.sub} onClose={props.onClose}><TextBody {...props} /></Modal>;
}

function TextBody({ quote, label1, label2, initial = '', submitLabel, validate, onSubmit, onClose }: TextProps) {
  const [text, setText] = useState(initial);
  const [text2, setText2] = useState('');
  const [err, setErr] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const er = validate(text, text2);
    if (er) { setErr(er); return; }
    onSubmit(text, text2);
  };
  return (
    <form className="col gap-12" onSubmit={submit}>
      {quote ? <div className="notice"><span>“{quote}”</span></div> : null}
      {label2 ? (
        <div className="field">
          <label className="lbl" htmlFor="m-t2">{label2}</label>
          <input id="m-t2" className="input" value={text2} onChange={(e) => { setText2(e.target.value); setErr(''); }} />
        </div>
      ) : null}
      <div className="field">
        <label className="lbl" htmlFor="m-t1">{label1}</label>
        <textarea id="m-t1" className="input" value={text} onChange={(e) => { setText(e.target.value); setErr(''); }} />
      </div>
      <Err msg={err} />
      <div className="modal-f">
        <Button variant="secondary" onClick={onClose}>Batal</Button>
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
