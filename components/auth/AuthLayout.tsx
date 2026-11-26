import Image from 'next/image';
import type { ReactNode } from 'react';

/** Foto + kutipan kolom kanan per halaman akun (persis prototipe). Disembunyikan ≤900 px lewat CSS `.auth-art`. */
const ART = {
  login: { src: '/products/kulot-patchwork.jpg', place: 'Studio Tambal · Jakarta Selatan', quote: 'Tiga pakaian lama, satu kulot baru.' },
  register: { src: '/products/jaket-denim-belah-dua.jpg', place: 'Benang Kedua · Bandung', quote: 'Dua jaket yang tak lagi utuh, jadi satu.' },
  forgot: { src: '/products/tote-saku-denim.jpg', place: 'Rumah Jahit Laras · Yogyakarta', quote: 'Saku yang pindah rumah.' },
} as const;

export type AuthArt = keyof typeof ART;

/** Tata letak dua kolom `.auth`: formulir (`.auth-main` > `.auth-card`) + foto (`.auth-art`). */
export function AuthLayout({ art, children }: { art: AuthArt; children: ReactNode }) {
  const a = ART[art];
  return (
    <div className="auth">
      <section className="auth-main">
        <div className="auth-card">{children}</div>
      </section>
      <aside className="auth-art" aria-hidden="true">
        <Image src={a.src} alt="" fill sizes="50vw" priority={art === 'login'} />
        <div className="auth-quote">
          <p className="mono-label">{a.place}</p>
          <p className="serif" style={{ fontSize: 26, lineHeight: 1.2 }}>{a.quote}</p>
        </div>
      </aside>
    </div>
  );
}
