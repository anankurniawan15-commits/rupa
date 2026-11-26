'use client';
import { LinkArrow } from '@/components/ui/Button';
import { ProductRail } from '@/components/product/ProductCard';
import { exploreHref, homeContent, useCatalog } from '@/lib/services/product.service';
import type { Product } from '@/types/product';
import { HomeHero } from './HomeHero';
import { FeaturedSection } from './FeaturedSection';
import { AiBand, InterestSection, MaterialSection, SellerInvite, StoriesSection, TrustSection } from './HomeSections';
import { SecHead } from './SecHead';

/** Beranda — semua seksi sesuai urutan prototipe. Katalog tanpa listing yang diturunkan admin. */
export function HomePage() {
  const catalog = useCatalog();
  const home = homeContent();
  const byId = (id: string) => catalog.find((p) => p.id === id);
  const lead = byId(home.leadId);
  const rest = home.featuredIds.map(byId).filter((p): p is Product => !!p);
  const newest = catalog.slice().sort((a, b) => b.date - a.date).slice(0, 6);
  const under = catalog.filter((p) => p.price < 100000);

  return (
    <div>
      <HomeHero />
      <FeaturedSection lead={lead} story={home.leadStory} rest={rest} />

      <section className="wrap sec" aria-labelledby="sec-baru" style={{ paddingTop: 8 }}>
        <SecHead n="02" id="sec-baru" title="Baru di Rupa" sub="Listing terbaru dari para pembuat." action={<LinkArrow href={exploreHref({ sort: 'new' })}>Urutkan dari terbaru</LinkArrow>} />
        <ProductRail products={newest} />
      </section>

      <AiBand />

      <section className="wrap sec" aria-labelledby="sec-murah">
        <SecHead n="04" id="sec-murah" title="Temuan Unik di Bawah Rp100.000" sub="Kecil, berguna, dan cocok untuk hadiah pertama dari barang bekas." action={<LinkArrow href={exploreHref({ price: 'lt100' })}>Lihat semua di bawah Rp100.000</LinkArrow>} />
        <ProductRail products={under} />
      </section>

      <InterestSection catalog={catalog} />
      <MaterialSection catalog={catalog} />
      <StoriesSection />
      <SellerInvite />
      <TrustSection />
    </div>
  );
}
