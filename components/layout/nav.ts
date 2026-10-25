/** Pemetaan menu → rute aktif (seperti tabsOf di prototipe). */
export const NAV_GROUPS = {
  home: ['/'],
  explore: ['/jelajahi', '/produk'],
  sortir: ['/sortir'],
  sell: ['/jual', '/dashboard', '/buka-toko'],
  profile: ['/profil', '/pesanan', '/wishlist'],
} as const;

export type NavKey = keyof typeof NAV_GROUPS;

export function isNavOn(key: NavKey, pathname: string) {
  return NAV_GROUPS[key].some((p) => (p === '/' ? pathname === '/' : pathname === p || pathname.startsWith(p + '/')));
}

/** aria-current="page" hanya untuk halaman persis. */
export const isCurrent = (href: string, pathname: string) => pathname === href;

/** Rute tanpa tombol "Tanya AI". */
export const NO_LAUNCHER = ['/assistant', '/checkout', '/pembayaran', '/masuk', '/daftar', '/lupa-sandi'];
/** Rute tanpa bottom nav mobile. */
export const NO_BNAV = ['/checkout', '/pembayaran'];

export const startsWithAny = (pathname: string, list: string[]) => list.some((p) => pathname === p || pathname.startsWith(p + '/'));
