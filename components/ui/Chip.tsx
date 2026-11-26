import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from '@/lib/format';
import { Icon } from './Icon';

/** Chip toggle (`.chip`, aktif `.is-on`) dengan aria-pressed. */
export function Chip({ on, className, type = 'button', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { on?: boolean }) {
  return <button type={type} className={cx('chip', on && 'is-on', className)} aria-pressed={on === undefined ? undefined : on} {...rest} />;
}

/** Chip filter aktif yang bisa dihapus (`.chip.chip-x`). */
export function RemovableChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button type="button" className="chip chip-x" onClick={onRemove} aria-label={'Hapus filter ' + label}>
      {label}
      <Icon name="close" size="s" />
    </button>
  );
}

export type TagKind = 'ai' | 'est' | 'warn' | 'data' | 'seller' | 'rec' | 'terra';

export function Tag({ kind, children, className }: { kind: TagKind; children: ReactNode; className?: string }) {
  return <span className={cx('tag', `tag-${kind}`, className)}>{children}</span>;
}

/** Pill status (`.st st-aktif` dst.). `status` dipetakan langsung ke kelas `st-{status}`. */
export function StatusPill({ status, className, children }: { status: string; className?: string; children: ReactNode }) {
  return <span className={cx('st', status.startsWith('st-') ? status : `st-${status}`, className)}>{children}</span>;
}

/** Pill dari pasangan kelas bawaan data, mis. SHOP_STATUS.pending = ['st st-draf', 'Menunggu verifikasi']. */
export function StatusPillCls({ cls, children }: { cls: string; children: ReactNode }) {
  return <span className={cls}>{children}</span>;
}

/** Label material mono hijau dengan ikon siklus. */
export function MatTag({ children }: { children: ReactNode }) {
  return (
    <span className="mat-tag">
      <Icon name="cycle" size="s" />
      {children}
    </span>
  );
}

export function Avatar({ initials, size, className }: { initials: string; size?: 'm' | 'l'; className?: string }) {
  return <span className={cx('av', size === 'm' && 'av-m', size === 'l' && 'av-l', className)} aria-hidden="true">{initials}</span>;
}

/** Bintang ★ (string) dengan label aksesibel. */
export function Stars({ n, small = true }: { n: number; small?: boolean }) {
  const s = Math.round(n);
  return (
    <span className={small ? 'stars-s' : 'stars'} role="img" aria-label={s + ' dari 5 bintang'}>
      {'★★★★★'.slice(0, s)}{'☆☆☆☆☆'.slice(0, 5 - s)}
    </span>
  );
}
