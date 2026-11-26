import type { ReactNode } from 'react';
import { cx } from '@/lib/format';
import { Icon, type IconName } from './Icon';

export function Notice({ icon = 'info', children, className }: { icon?: IconName | null; children: ReactNode; className?: string }) {
  return (
    <div className={cx('notice', className)}>
      {icon ? <Icon name={icon} /> : null}
      <div>{children}</div>
    </div>
  );
}

export function WarnBox({ children, className, title }: { children: ReactNode; className?: string; title?: ReactNode }) {
  return (
    <div className={cx('warn-box', className)} role="note">
      <Icon name="warn" />
      <div>
        {title ? <b>{title}</b> : null}
        {children}
      </div>
    </div>
  );
}

export function ErrBox({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx('err-box', className)} role="alert">
      <Icon name="warn" />
      {children}
    </div>
  );
}

export function OkBox({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx('ok-box', className)} role="status">
      <Icon name="check" />
      <div>{children}</div>
    </div>
  );
}

export function EmptyState({ icon = 'box', title, children, actions }: { icon?: IconName; title: ReactNode; children?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="empty">
      <span className="empty-ic"><Icon name={icon} size="l" /></span>
      <h2 className="h3">{title}</h2>
      {children ? <p>{children}</p> : null}
      {actions ? <div className="row gap-8 wrapf center" style={{ justifyContent: 'center' }}>{actions}</div> : null}
    </div>
  );
}

export function Skeleton({ w = '100%', h = 14, className }: { w?: number | string; h?: number; className?: string }) {
  return <span className={cx('skel', className)} style={{ display: 'block', width: w, height: h }} aria-hidden="true" />;
}

export function Spinner({ label }: { label?: string }) {
  return <span className="spin" role={label ? 'status' : undefined} aria-label={label} />;
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('panel', className)}>{children}</div>;
}
