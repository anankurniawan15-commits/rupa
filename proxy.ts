import { NextResponse, type NextRequest } from 'next/server';

/**
 * Proxy (Next.js 16: pengganti middleware.ts).
 * Pemeriksaan optimistis berbasis cookie sesi mock (rupa_uid / rupa_role) yang ditulis lib/store/session.ts:
 *  - tamu yang membuka halaman berakun → /masuk?next=<tujuan>
 *  - non-admin yang membuka /admin → beranda (?ditolak=admin memunculkan toast)
 * Pemeriksaan lengkap (punya toko, admin tidak boleh berjualan, dst.) ada di components/auth/Guard.tsx.
 * TODO(Supabase): baca sesi dengan @supabase/ssr (createServerClient + getUser) di sini.
 */

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const uid = request.cookies.get('rupa_uid')?.value;
  const role = request.cookies.get('rupa_role')?.value;

  if (!uid) {
    const url = request.nextUrl.clone();
    url.pathname = '/masuk';
    url.search = '?next=' + encodeURIComponent(pathname + search);
    return NextResponse.redirect(url);
  }
  if ((pathname === '/admin' || pathname.startsWith('/admin/')) && role !== 'admin') {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.search = '?ditolak=admin';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Halaman yang butuh akun (harus literal statis).
  matcher: ['/checkout/:path*', '/pesanan/:path*', '/profil/:path*', '/wishlist/:path*', '/jual/:path*', '/dashboard/:path*', '/buka-toko/:path*', '/pembayaran/:path*', '/admin/:path*'],
};
