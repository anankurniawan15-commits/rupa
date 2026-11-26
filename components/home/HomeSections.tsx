'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { ButtonLink, LinkArrow } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { Placeholder } from '@/components/ui/Placeholder';
import { ProductCard, productHref } from '@/components/product/ProductCard';
import { exploreHref, homeContent } from '@/lib/services/product.service';
import type { PlaceholderKind, Product } from '@/types/product';
import { SecHead } from './SecHead';

/** 03 AI Sortir: band ungu muda dengan kartu spesimen beranotasi. */
export function AiBand() {
  return (
    <section className="aiband" aria-labelledby="sec-ai">
      <div className="wrap aiband-in">
        <div>
          <p className="eyebrow on-dark">03 · AI Sortir Barang</p>
          <h2 id="sec-ai" className="h2">Jangan buru-buru membuangnya.</h2>
          <p>Unggah foto barang yang tak terpakai. AI Sortir memperkirakan materialnya, mencatat kondisi yang terlihat di foto, lalu menyarankan langkah berikutnya: dipakai lagi, diperbaiki, di-upcycle, dijual sebagai bahan, atau disalurkan ke jalur daur ulang.</p>
          <ol className="steps-mini">
            <li>Unggah foto, atau jelaskan barangnya dengan teks</li>
            <li>Lihat perkiraan material dan kondisi, lengkap dengan tingkat keyakinan</li>
            <li>Pilih langkah dan dapatkan tiga ide pemanfaatan</li>
            <li>Temukan kreator atau pembeli yang membutuhkan materialnya</li>
          </ol>
          <div className="row gap-12 wrapf center">
            <ButtonLink href="/sortir" variant="ai" size="lg">Coba AI Sortir</ButtonLink>
            <span className="fine on-dark">Hasilnya perkiraan dari foto — bukan uji laboratorium.</span>
          </div>
        </div>
        <figure className="specimen" style={{ margin: 0 }}>
          <Image src="/products/tote-saku-denim-detail.jpg" alt="Contoh foto yang dianalisis: saku jeans di atas kain kanvas" width={460} height={460} sizes="(max-width: 760px) 90vw, 460px" />
          <span className="mark d1" aria-hidden="true" /><span className="mark d2" aria-hidden="true" />
          <span className="anno a1"><b>Material</b>Tekstil — denim (perkiraan)</span>
          <span className="anno a2"><b>Kondisi terlihat</b>Jahitan utuh, warna pudar merata</span>
          <span className="anno a3"><b>Langkah disarankan</b>Upcycle sendiri atau jual sebagai bahan</span>
          <figcaption className="spec-foot"><span>Contoh hasil analisis</span><span>Keyakinan: tinggi</span></figcaption>
        </figure>
      </div>
    </section>
  );
}

/** 05 Pilihan Berdasarkan Minat: chip mengubah daftar. */
export function InterestSection({ catalog }: { catalog: Product[] }) {
  const { interests } = homeContent();
  const [key, setKey] = useState(interests[0].key);
  const uses = interests.find((i) => i.key === key)?.uses ?? [];
  const list = catalog.filter((p) => p.uses.some((u) => uses.indexOf(u) >= 0)).slice(0, 4);
  return (
    <section className="wrap sec" aria-labelledby="sec-minat" style={{ paddingTop: 8 }}>
      <SecHead n="05" id="sec-minat" title="Pilihan Berdasarkan Minat" sub="Pilih minatmu — rekomendasi di bawah menyesuaikan." />
      <div className="chips" role="group" aria-label="Minat" style={{ marginBottom: 28 }}>
        {interests.map((c) => <Chip key={c.key} on={key === c.key} onClick={() => setKey(c.key)}>{c.label}</Chip>)}
      </div>
      <div className="grid-4" aria-live="polite">
        {list.map((p) => <ProductCard key={p.id} p={p} />)}
      </div>
    </section>
  );
}

/** 06 Belanja per Material: 5 tile ke Jelajahi dengan kategori. */
export function MaterialSection({ catalog }: { catalog: Product[] }) {
  const { matTiles } = homeContent();
  return (
    <section className="wrap sec" aria-labelledby="sec-mat">
      <SecHead n="06" id="sec-mat" title="Belanja per Material" sub="Mulai dari bahan yang kamu suka." />
      <div className="mat-grid">
        {matTiles.map((m) => (
          <Link key={m.cat} className="mat-tile" href={exploreHref({ cat: m.cat })}>
            <span className="mat-sw" style={{ position: 'relative' }}>
              {m.img ? <Image className="cover" src={m.img} alt="" fill sizes="(max-width: 760px) 50vw, 20vw" /> : <Placeholder kind={m.ph} noLabel label={m.label} />}
            </span>
            <span className="mat-l">{m.label}</span>
            <span className="mat-d">{m.desc}</span>
            <span className="mat-c">{catalog.filter((p) => p.cat === m.cat).length} produk →</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/** 07 Cerita Transformasi: sebelum (placeholder jujur) → sesudah (foto). */
export function StoriesSection() {
  const { stories } = homeContent();
  return (
    <section className="wrap sec" aria-labelledby="sec-cerita">
      <SecHead n="07" id="sec-cerita" title="Cerita Transformasi" sub="Dari barang yang hampir dibuang, menjadi barang yang dipakai lagi." />
      <div className="stories">
        {stories.map((s) => (
          <article key={s.pid} className="story">
            <div className="ba">
              <div><span className="ba-l">Sebelum</span><Placeholder kind={s.ph as PlaceholderKind} label={s.before} /></div>
              <div><span className="ba-l">{s.afterLabel}</span><Image src={s.img} alt={s.alt} fill sizes="(max-width: 1100px) 50vw, 16vw" /></div>
              <span className="ba-arrow" aria-hidden="true"><Icon name="arrowRight" size="s" /></span>
            </div>
            <p className="mono-label">{s.seller}</p>
            <h3>{s.title}</h3>
            <p>{s.text}</p>
            <LinkArrow href={productHref(s.pid)}>Lihat produknya</LinkArrow>
          </article>
        ))}
      </div>
      <p className="fine mt-16">Foto “sebelum” ditampilkan sebagai keterangan sampai penjual mengunggah foto aslinya.</p>
    </section>
  );
}

/** 08 Ajakan untuk pembuat. */
export function SellerInvite() {
  return (
    <section className="invite" aria-labelledby="sec-jual">
      <div className="wrap invite-in">
        <div className="col gap-24">
          <p className="eyebrow">08 · Untuk pembuat</p>
          <h2 id="sec-jual" className="display" style={{ fontSize: 'clamp(40px, 4.6vw, 64px)' }}>Karyamu layak punya panggung.</h2>
          <p className="lede">Jual hasil jahitan, rakitan, dan eksperimenmu ke pembeli yang menghargai prosesnya.</p>
          <div className="row gap-12 wrapf">
            <ButtonLink href="/jual" size="lg">Mulai Jualan</ButtonLink>
            <ButtonLink href="/dashboard" variant="secondary" size="lg">Lihat dashboard contoh</ButtonLink>
          </div>
        </div>
        <ol className="invite-list">
          <li><span className="num">1</span><div><b>Ceritakan bahan dan prosesnya</b><p className="muted">Formulir listing memisahkan material asal dan produk jadi, jadi pembeli paham apa yang mereka beli.</p></div></li>
          <li><span className="num">2</span><div><b>Asisten AI membantu, kamu yang memutuskan</b><p className="muted">Saran judul, deskripsi, tag, dan kata kunci — semuanya bisa diedit sebelum terbit.</p></div></li>
          <li><span className="num">3</span><div><b>Referensi harga dari listing serupa</b><p className="muted">Ditampilkan hanya jika ada cukup data pembanding. Kalau belum ada, kami bilang belum ada.</p></div></li>
          <li><span className="num">4</span><div><b>Satu dashboard untuk pesanan dan ulasan</b><p className="muted">Kemas, kirim, balas ulasan, dan jeda listing dari satu tempat.</p></div></li>
        </ol>
      </div>
    </section>
  );
}

/** 09 Belanja dengan tenang. */
export function TrustSection() {
  return (
    <section className="wrap sec" aria-labelledby="sec-trust">
      <SecHead n="09" id="sec-trust" title="Belanja dengan tenang" sub="Kepercayaan dibangun dari informasi yang jelas, bukan slogan." />
      <div className="trust">
        <div className="trust-i"><span className="trust-ic"><Icon name="cycle" /></span><h3>Transparansi material</h3><p>Setiap listing memisahkan material asal, proses, dan produk jadi. Klaim material ditulis penjual dan ditandai sebagai informasi dari penjual.</p></div>
        <div className="trust-i"><span className="trust-ic"><Icon name="star" /></span><h3>Ulasan terverifikasi</h3><p>Hanya pembeli dengan pesanan selesai yang bisa memberi ulasan, lengkap dengan penanda pembelian terverifikasi.</p></div>
        <div className="trust-i"><span className="trust-ic"><Icon name="shield" /></span><h3>Perlindungan transaksi*</h3><p>Dana diteruskan ke penjual setelah kamu mengonfirmasi pesanan diterima. Ada jalur bantuan bila barang tidak sesuai.</p></div>
        <div className="trust-i"><span className="trust-ic"><Icon name="sprout" /></span><h3>Pemakaian ulang yang bertanggung jawab</h3><p>Kami tidak menampilkan angka dampak lingkungan yang tidak bisa dibuktikan. Produk berbahan berisiko diberi catatan keamanan.</p></div>
      </div>
      <p className="fine mt-24">*Di prototipe ini alur pembayaran, penahanan dana, dan pengiriman adalah simulasi — belum terhubung ke penyedia pembayaran atau kurir mana pun.</p>
    </section>
  );
}
