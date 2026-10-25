import type { ReactNode, SVGProps } from 'react';
import { cx } from '@/lib/format';

/** Ikon garis 24×24, stroke 1.7, ujung membulat — path diambil langsung dari prototipe. */
const PATHS = {
  close: <path d="M6 6l12 12M18 6L6 18" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  search: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></>,
  heart: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
  bag: <><path d="M5 8h14l-1 12H6L5 8z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></>,
  shieldCheck: <><path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z" /><path d="M9 12l2 2 4-4" /></>,
  box: <><path d="M4 7l8-4 8 4v10l-8 4-8-4z" /><path d="M4 7l8 4 8-4M12 11v10" /></>,
  store: <path d="M4 9l1-5h14l1 5M4 9v11h16V9M4 9h16" />,
  storePlus: <><path d="M4 9l1-5h14l1 5M4 9v11h16V9M4 9h16" /><path d="M12 12v5M9.5 14.5h5" /></>,
  chat: <path d="M4 5h16v11H9l-5 4z" />,
  chatLines: <><path d="M4 5h16v11H9l-5 4z" /><path d="M8 10h8M8 13h5" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>,
  logout: <path d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10" />,
  scan: <><path d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4" /><path d="M8 12h8" /></>,
  check: <path d="M5 12l5 5 9-10" />,
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  cycle: <><path d="M4 12a8 8 0 0 1 13.7-5.6M20 12a8 8 0 0 1-13.7 5.6" /><path d="M18 3v4h-4M6 21v-4h4" /></>,
  star: <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />,
  shield: <path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z" />,
  sprout: <path d="M7 20h10M12 20V9M12 9c0-3 2-5 5-5 0 3-2 5-5 5zM12 12c0-2.5-1.8-4-4.5-4 0 2.5 1.8 4 4.5 4z" />,
  filter: <path d="M4 6h16M7 12h10M10 18h4" />,
  searchMinus: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5M8 11h6" /></>,
  minus: <path d="M5 12h14" />,
  plus: <path d="M12 5v14M5 12h14" />,
  truck: <><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7" /><circle cx="7" cy="18" r="1.6" /><circle cx="17" cy="18" r="1.6" /></>,
  undo: <path d="M4 12a8 8 0 1 0 3-6.2M4 4v4h4" />,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8v.5" /></>,
  flag: <path d="M5 21V4h11l-2 4 2 4H5" />,
  upload: <><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v4h16v-4" /></>,
  camera: <><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>,
  image: <><rect x="3" y="5" width="18" height="14" rx="1" /><circle cx="9" cy="10" r="1.5" /><path d="M21 16l-5-5-8 8" /></>,
  warn: <><path d="M12 4l9 16H3z" /><path d="M12 10v4M12 17v.5" /></>,
  trash: <path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13" />,
  imageOff: <><rect x="3" y="5" width="18" height="14" rx="1" /><path d="M4 4l16 16" /></>,
  retry: <path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5" />,
  bookmark: <path d="M6 3h12v18l-6-4-6 4z" />,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c1-3.5 3.5-5 6.5-5s5.5 1.5 6.5 5M16 4.5a3.5 3.5 0 0 1 0 7M18 15c2 .6 3.2 2.2 3.5 5" /></>,
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  chevronRight: <path d="M9 6l6 6-6 6" />,
  edit: <path d="M4 20h4L19 9l-4-4L4 16z" />,
  eyeOff: <><path d="M3 3l18 18" /><path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2M6.6 6.6C3.9 8.3 2 12 2 12s3.5 7 10 7c1.8 0 3.4-.5 4.8-1.2" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  expand: <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />,
  send: <path d="M4 12l16-8-6 16-3-6z" />,
  home: <path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z" />,
  copy: <><rect x="8" y="8" width="12" height="12" rx="1" /><path d="M16 8V4H4v12h4" /></>,
  download: <><path d="M12 4v12M7 11l5 5 5-5" /><path d="M4 20h16" /></>,
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof PATHS;

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: 's' | 'm' | 'l';
  /** Isi penuh (mis. bintang rating, hati aktif). */
  filled?: boolean;
}

export function Icon({ name, size = 'm', filled, className, ...rest }: IconProps) {
  return (
    <svg
      className={cx('ic', size === 's' && 'ic-s', size === 'l' && 'ic-l', className)}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      style={filled ? { fill: 'currentColor' } : undefined}
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}
