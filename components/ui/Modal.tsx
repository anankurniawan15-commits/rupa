'use client';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import { Button } from './Button';

interface ModalProps {
  open: boolean;
  title: ReactNode;
  sub?: ReactNode;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Modal dialog. Fokus pertama otomatis (input/textarea pertama, atau tombol Tutup),
 * Esc menutup, Tab dikunci di dalam, fokus kembali ke pemicu. Menjadi bottom sheet ≤760 px (CSS).
 */
export function Modal({ open, title, sub, onClose, children }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const trigger = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const f = el.querySelector<HTMLElement>('input:not([type=radio]):not([type=checkbox]):not([type=hidden]), textarea') || el.querySelector<HTMLElement>('.modal-x');
      f?.focus();
    }, 40);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); closeRef.current(); }
      if (e.key === 'Tab' && ref.current) {
        const items = Array.from(ref.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'));
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      setTimeout(() => { if (trigger && document.body.contains(trigger)) trigger.focus(); }, 40);
    };
  }, [open]);

  if (!open || typeof document === 'undefined') return null;
  return createPortal(
    <div className="app" style={{ minHeight: 0, position: 'static' }}>
      <div className="ov" onClick={onClose} />
      <div ref={ref} className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="modal-h">
          <div className="col gap-4">
            <h2 id={titleId} className="h3">{title}</h2>
            {sub ? <p className="fine">{sub}</p> : null}
          </div>
          <button type="button" className="iconbtn sm modal-x" onClick={onClose} aria-label="Tutup"><Icon name="close" /></button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

/** Dialog konfirmasi (Batal / aksi). `danger` → tombol merah. */
export function ConfirmDialog({ open, title, body, confirmLabel = 'Ya', danger, onConfirm, onClose }: { open: boolean; title: ReactNode; body: ReactNode; confirmLabel?: string; danger?: boolean; onConfirm: () => void; onClose: () => void }) {
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <div className="col gap-16">
        <p className="muted">{body}</p>
        <div className="modal-f">
          <Button variant="secondary" onClick={onClose}>Batal</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </Modal>
  );
}
