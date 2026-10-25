import Link from 'next/link';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from '@/lib/format';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'ai' | 'light' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const cls = (v: ButtonVariant, s: Size, w?: boolean, extra?: string) =>
  cx('btn', `btn-${v}`, s === 'sm' && 'btn-sm', s === 'lg' && 'btn-lg', w && 'w100', extra);

interface Common { variant?: ButtonVariant; size?: Size; block?: boolean; children?: ReactNode }

/** Tombol `.btn` dari prototipe. Hijau = belanja/aksi utama, ungu (`ai`) = khusus AI. */
export function Button({ variant = 'primary', size = 'md', block, className, type = 'button', ...rest }: Common & ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={cls(variant, size, block, className)} {...rest} />;
}

/** Tautan bergaya tombol (navigasi). */
export function ButtonLink({ variant = 'primary', size = 'md', block, className, href, ...rest }: Common & AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  return <Link href={href} className={cls(variant, size, block, className)} {...rest} />;
}

/** Tombol AI kecil berlatar ungu muda (`.ai-btn`). */
export function AiButton({ className, type = 'button', ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={cx('ai-btn', className)} {...rest} />;
}

export function IconButton({ label, className, sm, badge, type = 'button', children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; sm?: boolean; badge?: number }) {
  return (
    <button type={type} className={cx('iconbtn', sm && 'sm', className)} aria-label={label} {...rest}>
      {children}
      {badge ? <span className="badge" aria-hidden="true">{badge}</span> : null}
    </button>
  );
}

export function IconLink({ label, className, badge, href, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { label: string; href: string; badge?: number }) {
  return (
    <Link href={href} className={cx('iconbtn', className)} aria-label={label} {...rest}>
      {children}
      {badge ? <span className="badge" aria-hidden="true">{badge}</span> : null}
    </Link>
  );
}

/** Tautan hijau dengan panah (`.link-arrow`). */
export function LinkArrow({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link href={href} className={cx('link-arrow', className)}>
      {children}
      <svg className="ic ic-s" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
    </Link>
  );
}
