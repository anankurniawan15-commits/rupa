'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Avatar, MatTag } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/Boxes';
import { QtyStepper } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { ChatModal, ReasonModal } from '@/components/modals/SharedModals';
import { ProductCard, productHref, useWishToggle } from '@/components/product/ProductCard';
import { categoryLabel, conditionLabel, exploreHref, getProduct, getSeller, relatedProducts, useCatalog, useIsHidden } from '@/lib/services/product.service';
import { cartService, useCartItems } from '@/lib/services/cart.service';
import { moderationService, REPORT_REASONS } from '@/lib/services/moderation.service';
import { useCurrentUser } from '@/lib/services/auth.service';
import { toast } from '@/lib/store/toast';
import { cx, r1, rp } from '@/lib/format';
import { ProductGallery } from './ProductGallery';
import { MaterialStory } from './MaterialStory';
import { ReviewList } from './ReviewList';

/** Detail produk `/produk/[id]`. */
export function ProductDetail({ id }: { id: string }) {
  const p = getProduct(id)!;
  const s = getSeller(p.seller);
  const router = useRouter();
  const me = useCurrentUser();
  const hidden = useIsHidden(id);
  const catalog = useCatalog();
  const cart = useCartItems();
  const { wished, toggle } = useWishToggle(id);
  const [qty, setQty] = useState(1);
  const [chat, setChat] = useState(false);
  const [report, setReport] = useState(false);

  const soldOut = p.stock <= 0;
  const here = productHref(id);
  const crumbs = (
    <nav className="crumbs" aria-label="Breadcrumb">
      <Link href="/">Beranda</Link><span aria-hidden="true">/</span>
      <Link href="/jelajahi">Jelajahi</Link><span aria-hidden="true">/</span>
      <Link href={exploreHref({ cat: p.cat })}>{categoryLabel(p.cat)}</Link><span aria-hidden="true">/</span>
      <span aria-current="page">{p.title}</span>
    </nav>
  );

  if (hidden) {
    return (
      <div className="page wrap">
        {crumbs}
        <EmptyState icon="flag" title="Listing ini sedang tidak tersedia" actions={<ButtonLink href="/jelajahi">Jelajahi Produk</ButtonLink>}>
          Listing “{p.title}” diturunkan dari katalog setelah ditinjau tim moderasi, jadi tidak bisa dibeli untuk saat ini.
        </EmptyState>
      </div>
    );
  }

  const add = () => void cartService.add(id, qty);
  const buyNow = async () => {
    if (cart.some((c) => c.id === id) || (await cartService.add(id, qty, { silent: true }))) router.push('/keranjang');
  };
  const toReviews = () => document.getElementById('ulasan')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const openReport = () => {
    if (!me) {
      router.push('/masuk?next=' + encodeURIComponent(here) + '&note=' + encodeURIComponent('Masuk dulu untuk melaporkan listing.'));
      return;
    }
    setReport(true);
  };
  const submitReport = async (reason: string) => {
    await moderationService.createReport(id, reason, me?.name || '');
    setReport(false);
    toast('Laporan terkirim untuk ditinjau (simulasi)');
  };
  const stockTxt = soldOut ? 'Stok habis' : p.stock === 1 ? 'Satu-satunya — tidak ada yang sama' : 'Stok ' + p.stock;

  return (
    <div className="page wrap">
      {crumbs}
      <div className="pd">
        <ProductGallery p={p} />
        <div className="pd-info">
          <MatTag>{p.matShort} · {conditionLabel(p.cond)}</MatTag>
          <h1 className="h1">{p.title}</h1>
          <div className="row gap-12 center wrapf">
            <span className="rating"><Icon name="star" size="s" className="ic-fill" />{r1(p.rating)}</span>
            <button type="button" className="linkbtn muted" onClick={toReviews}>{p.nrev} ulasan</button>
            <span className="muted">· {p.sold} terjual</span>
          </div>
          <p className="price-xl">{rp(p.price)}</p>
          <div className="seller-card">
            <Avatar initials={s.initials} size="l" />
            <div className="col"><b>{s.name}</b><span className="fine">{s.city + ' · ★ ' + r1(s.rating) + ' (' + s.nrev + ' ulasan) · biasanya membalas ' + s.resp}</span></div>
            <div className="sc-act">
              <Button variant="secondary" size="sm" onClick={() => setChat(true)}><Icon name="chat" size="s" />Chat penjual</Button>
              <ButtonLink variant="ghost" size="sm" href={exploreHref({ seller: p.seller })}>Produk lain dari penjual ini</ButtonLink>
            </div>
          </div>
          <div className="row gap-16 center wrapf">
            <span className="lbl" aria-hidden="true">Jumlah</span>
            <QtyStepper value={qty} max={Math.max(1, p.stock)} onChange={(v) => setQty(Math.min(Math.max(1, p.stock), Math.max(1, v)))} />
            <span className="muted" style={{ fontSize: 14 }}>{stockTxt}</span>
          </div>
          <div className="row gap-8 wrapf">
            <Button size="lg" className="grow" onClick={add} disabled={soldOut}><Icon name="bag" />Tambah ke keranjang</Button>
            <Button size="lg" variant="secondary" onClick={buyNow} disabled={soldOut}>Beli sekarang</Button>
            <button
              type="button"
              className={cx('fav', wished && 'is-on')}
              onClick={toggle}
              aria-pressed={wished}
              aria-label={(wished ? 'Hapus ' : 'Simpan ') + p.title + (wished ? ' dari wishlist' : ' ke wishlist')}
              style={{ position: 'static', border: '1.5px solid #E2E2E2', width: 52, height: 52 }}
            >
              <Icon name="heart" />
            </button>
          </div>
          <div className="info-list">
            <div className="info-row"><Icon name="truck" /><span><b>Dikirim dari {s.city}</b>Kurir dan ongkir dipilih saat checkout. Penjual mengemas dalam 1–2 hari kerja.</span></div>
            <div className="info-row"><Icon name="shield" /><span><b>Dana diteruskan setelah pesanan diterima*</b>Bila barang tidak sesuai deskripsi, ajukan bantuan dari halaman Pesanan Saya.</span></div>
            <div className="info-row"><Icon name="undo" /><span><b>Pembatalan</b>Bisa diajukan sebelum penjual mengirim paket.</span></div>
          </div>
          <p className="fine">*Simulasi pada prototipe — belum ada penyedia pembayaran yang terhubung.</p>
        </div>
      </div>

      <MaterialStory p={p} onReport={openReport} />
      <ReviewList p={p} />

      <section className="pd-story" aria-labelledby="pd-terkait">
        <h2 id="pd-terkait" className="h2" style={{ marginBottom: 24 }}>Mungkin kamu suka</h2>
        <div className="grid-4">
          {relatedProducts(p, catalog).map((x) => <ProductCard key={x.id} p={x} />)}
        </div>
      </section>

      <ChatModal open={chat} threadKey={p.seller} title={'Chat dengan ' + s.name} sub={'Tentang: ' + p.title} onClose={() => setChat(false)} />
      <ReasonModal
        open={report}
        title="Laporkan listing"
        sub={p.title}
        legend="Apa masalahnya?"
        reasons={REPORT_REASONS}
        note="Identitasmu tidak ditampilkan ke penjual. Tim moderasi meninjau setiap laporan (simulasi)."
        submitLabel="Kirim laporan"
        onSubmit={(reason) => void submitReport(reason)}
        onClose={() => setReport(false)}
      />
    </div>
  );
}
