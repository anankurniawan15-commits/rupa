'use client';
import { Button } from '@/components/ui/Button';
import { copyText } from './copy';

/** Nomor virtual account contoh, dikelompokkan per 4 digit. */
export function VaBox({ bank, va }: { bank: string; va: string }) {
  return (
    <div className="va-box">
      <span className="mono-label">Nomor virtual account {bank}</span>
      <div className="row between center wrapf gap-8">
        <span className="va">{va.replace(/(\d{4})(?=\d)/g, '$1 ')}</span>
        <Button size="sm" onClick={() => copyText(va, 'Nomor virtual account disalin')}>Salin nomor</Button>
      </div>
      <span className="fine">Nomor contoh untuk prototipe — jangan ditransfer.</span>
    </div>
  );
}
