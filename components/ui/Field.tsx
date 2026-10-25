'use client';
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cx } from '@/lib/format';
import { Icon } from './Icon';

/** Pesan galat inline (role="alert"). */
export function ErrorText({ id, children }: { id?: string; children?: ReactNode }) {
  if (!children) return null;
  return (
    <p className="err" role="alert" id={id}>
      <Icon name="warn" size="s" />
      {children}
    </p>
  );
}

interface FieldProps {
  id: string;
  label: ReactNode;
  /** Ditampilkan sebagai "(opsional)". */
  optional?: boolean;
  help?: ReactNode;
  error?: string;
  className?: string;
  children: ReactNode;
}

/** Pembungkus label + kontrol + bantuan + galat (`.field`). */
export function Field({ id, label, optional, help, error, className, children }: FieldProps) {
  return (
    <div className={cx('field', className)}>
      <label className="lbl" htmlFor={id}>
        {label}
        {optional ? <span className="opt"> (opsional)</span> : null}
      </label>
      {children}
      {help ? <p className="help" id={id + '-help'}>{help}</p> : null}
      <ErrorText id={id + '-err'}>{error}</ErrorText>
    </div>
  );
}

const describedBy = (id?: string, error?: boolean, help?: boolean) =>
  [error && id ? id + '-err' : '', help && id ? id + '-help' : ''].filter(Boolean).join(' ') || undefined;

export function Input({ invalid, hasHelp, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean; hasHelp?: boolean }) {
  return <input className={cx('input', invalid && 'has-err', className)} aria-invalid={invalid || undefined} aria-describedby={describedBy(rest.id, invalid, hasHelp)} {...rest} />;
}

export function Textarea({ invalid, hasHelp, className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean; hasHelp?: boolean }) {
  return <textarea className={cx('input', invalid && 'has-err', className)} aria-invalid={invalid || undefined} aria-describedby={describedBy(rest.id, invalid, hasHelp)} {...rest} />;
}

export function Select({ invalid, className, options, placeholder, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean; options: (string | [string, string])[]; placeholder?: string }) {
  return (
    <select className={cx('input', invalid && 'has-err', className)} aria-invalid={invalid || undefined} aria-describedby={describedBy(rest.id, invalid)} {...rest}>
      {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
      {options.map((o) => {
        const [v, l] = typeof o === 'string' ? [o, o] : o;
        return <option key={v} value={v}>{l}</option>;
      })}
    </select>
  );
}

/** Kotak centang `.check`. */
export function Checkbox({ label, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) {
  return (
    <label className={cx('check', className)}>
      <input type="checkbox" {...rest} />
      <span>{label}</span>
    </label>
  );
}

/** Radio card `.rc` (pilihan kondisi, kurir, pembayaran). */
export function RadioCard({ name, title, desc, checked, disabled, onSelect, type = 'radio', extra }: { name: string; title: ReactNode; desc?: ReactNode; checked: boolean; disabled?: boolean; onSelect: () => void; type?: 'radio' | 'checkbox'; extra?: ReactNode }) {
  return (
    <label className={cx('rc', checked && 'is-on', disabled && 'is-dis')}>
      <input type={type} name={name} checked={checked} disabled={disabled} onChange={onSelect} />
      <span className="grow">
        <span className="rc-t">{title}</span>
        {desc ? <span className="rc-d">{desc}</span> : null}
      </span>
      {extra}
    </label>
  );
}

/** Switch on/off (`.switch`) dengan label & deskripsi dalam baris (`.switch-row`). */
export function Switch({ id, label, desc, checked, onChange }: { id: string; label: ReactNode; desc?: ReactNode; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="switch-row">
      <label htmlFor={id} className="col gap-4" style={{ cursor: 'pointer' }}>
        <b>{label}</b>
        {desc ? <span className="fine">{desc}</span> : null}
      </label>
      <span className="switch">
        <input id={id} type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-checked={checked} />
        <span />
      </span>
    </div>
  );
}

/** Stepper jumlah (− n +). */
export function QtyStepper({ value, min = 1, max, onChange, label = 'Jumlah' }: { value: number; min?: number; max: number; onChange: (v: number) => void; label?: string }) {
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(value - 1)} disabled={value <= min} aria-label="Kurangi jumlah"><Icon name="minus" size="s" /></button>
      <output aria-live="polite">{value}</output>
      <button type="button" onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Tambah jumlah"><Icon name="plus" size="s" /></button>
    </div>
  );
}
