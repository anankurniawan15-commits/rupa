'use client';
import { useState, type FormEvent } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { ErrorText } from '@/components/ui/Field';
import { resiSchema } from '@/lib/validation';
import { COURIERS } from '@/lib/services/seller.service';

/** Modal "Input nomor resi": kurir + nomor resi (≥8 huruf/angka/tanda hubung). */
export function ResiModal({ open, sub, onSubmit, onClose }: { open: boolean; sub: string; onSubmit: (resi: string, courier: string) => void; onClose: () => void }) {
  return (
    <Modal open={open} title="Input nomor resi" sub={sub} onClose={onClose}>
      <ResiBody onSubmit={onSubmit} onClose={onClose} />
    </Modal>
  );
}

function ResiBody({ onSubmit, onClose }: { onSubmit: (resi: string, courier: string) => void; onClose: () => void }) {
  const [courier, setCourier] = useState('Reguler');
  const [resi, setResi] = useState('');
  const [err, setErr] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const r = resiSchema.safeParse(resi);
    if (!r.success) { setErr(r.error.issues[0]?.message || ''); return; }
    onSubmit(r.data, courier);
  };
  return (
    <form className="col gap-12" onSubmit={submit}>
      <div className="field">
        <label className="lbl" htmlFor="m-cour">Kurir</label>
        <select id="m-cour" className="input" value={courier} onChange={(e) => setCourier(e.target.value)}>
          {COURIERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      <div className="field">
        <label className="lbl" htmlFor="m-resi">Nomor resi</label>
        <input id="m-resi" className={err ? 'input has-err' : 'input'} aria-invalid={!!err || undefined} value={resi} onChange={(e) => { setResi(e.target.value); setErr(''); }} placeholder="Minimal 8 karakter huruf atau angka" />
        <ErrorText>{err}</ErrorText>
      </div>
      <div className="modal-f">
        <Button variant="secondary" onClick={onClose}>Batal</Button>
        <Button type="submit">Tandai dikirim</Button>
      </div>
    </form>
  );
}
