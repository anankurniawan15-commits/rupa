'use client';
import Link from 'next/link';
import { LinkArrow, ButtonLink } from '@/components/ui/Button';
import { Avatar, MatTag } from '@/components/ui/Chip';
import { FavButton, ProductCard, ProductThumb, productHref } from '@/components/product/ProductCard';
import { getSeller } from '@/lib/services/product.service';
import { rp } from '@/lib/format';
import type { Product } from '@/types/product';
import { SecHead } from './SecHead';

/** 01 Produk Pilihan: kartu editorial besar (`.lead`) + 3 kartu. */
export function FeaturedSection({ lead, story, rest }: { lead?: Product; story: string; rest: Product[] }) {
  const s = lead ? getSeller(lead.seller) : null;
  return (
    <section className="wrap sec" aria-labelledby="sec-pilihan">
      <SecHead n="01" id="sec-pilihan" title="Produk Pilihan" sub="Dipilih karena cerita bahannya jelas dan pengerjaannya rapi." action={<LinkArrow href="/jelajahi">Lihat semua produk</LinkArrow>} />
      <div className="feat">
        {lead && s ? (
          <article className="lead">
            <div className="pc-media">
              <Link className="pc-open" href={productHref(lead.id)} aria-label={'Lihat detail ' + lead.title}>
                <ProductThumb p={lead} sizes="(max-width: 760px) 100vw, 40vw" />
              </Link>
              <FavButton p={lead} />
            </div>
            <div className="col gap-12">
              <MatTag>Pilihan minggu ini · {lead.matShort}</MatTag>
              <h3 className="lead-t"><Link className="linkbtn" href={productHref(lead.id)}>{lead.title}</Link></h3>
              <p className="story">{story}</p>
              <div className="row between center wrapf gap-12">
                <p className="pc-price">{rp(lead.price)}</p>
                <p className="pc-seller"><Avatar initials={s.initials} /><span className="t">{s.name} · {s.city}</span></p>
              </div>
              <ButtonLink href={productHref(lead.id)} variant="secondary">Baca cerita lengkapnya</ButtonLink>
            </div>
          </article>
        ) : null}
        <div className="grid-3">
          {rest.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      </div>
    </section>
  );
}
