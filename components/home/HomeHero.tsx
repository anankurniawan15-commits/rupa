'use client';
import Image from 'next/image';
import Link from 'next/link';
import { ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { productHref } from '@/components/product/ProductCard';
import { homeContent } from '@/lib/services/product.service';

/** Hero Beranda: judul, 2 CTA, fakta singkat, dan kolase 3 foto berkapsul. */
export function HomeHero() {
  const { hero } = homeContent();
  return (
    <section className="hero wrap" aria-labelledby="hero-t">
      <div className="hero-copy">
        <p className="eyebrow">Marketplace upcycle · Indonesia</p>
        <h1 id="hero-t" className="display">Barang Lama.<br /><em>Cerita Baru.</em></h1>
        <p className="lede">Temukan karya upcycle unik atau ubah barang tak terpakai menjadi sesuatu yang bernilai.</p>
        <div className="row gap-12 wrapf">
          <ButtonLink href="/jelajahi" size="lg">Jelajahi Produk</ButtonLink>
          <ButtonLink href="/sortir" variant="secondary" size="lg"><Icon name="scan" />Sortir Barang dengan AI</ButtonLink>
        </div>
        <ul className="hero-facts">
          <li><Icon name="check" size="s" />Material asal dan proses pembuatan tercantum di setiap listing</li>
          <li><Icon name="check" size="s" />Dijual langsung oleh pembuatnya — dari Jepara sampai Surabaya</li>
          <li><Icon name="check" size="s" />Ulasan hanya dari pembeli yang pesanannya selesai</li>
        </ul>
      </div>
      <div className="hero-art">
        {hero.map((h, i) => (
          <figure key={h.id} className={h.cls}>
            <Link href={productHref(h.id)} aria-label={h.label} style={{ display: 'block', width: '100%', height: '100%' }}>
              <Image src={h.img} alt={h.alt} fill priority sizes={i === 0 ? '(max-width: 760px) 55vw, 30vw' : '(max-width: 760px) 45vw, 25vw'} />
            </Link>
            <figcaption><span className="mono">{h.no}</span><span>{h.caption}</span></figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
