'use client';
import { useState, type InputHTMLAttributes } from 'react';
import { cx } from '@/lib/format';
import { Icon } from '@/components/ui/Icon';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'className' | 'onChange' | 'value'> & {
  id: string;
  value: string;
  onValue: (v: string) => void;
  invalid?: boolean;
};

/**
 * Kolom kata sandi dengan tombol mata (`.pw-wrap` / `.pw-input` / `.pw-eye`).
 * Tombol `type="button"` mengganti type password/text tanpa memindahkan fokus dari input.
 */
export function PasswordInput({ id, value, onValue, invalid, ...rest }: Props) {
  const [show, setShow] = useState(false);
  return (
    <div className={cx('pw-wrap', invalid && 'has-err')}>
      <input
        id={id}
        type={show ? 'text' : 'password'}
        className="pw-input"
        value={value}
        onChange={(e) => onValue(e.target.value)}
        aria-invalid={invalid || undefined}
        {...rest}
      />
      <button
        type="button"
        className="pw-eye"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setShow((s) => !s)}
        aria-label={show ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
        aria-pressed={show}
        aria-controls={id}
      >
        <Icon name={show ? 'eyeOff' : 'eye'} />
      </button>
    </div>
  );
}
