'use client';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState, Notice, Skeleton } from '@/components/ui/Boxes';
import { useCartCount, useCartGroups } from '@/lib/services/cart.service';
import { useHydrated } from '@/lib/store';
import { rp } from '@/lib/format';
import { CartGroup } from './CartGroup';

export function CartPage() {
  const hydrated = useHydrated();
  const groups = useCartGroups();
  const count = useCartCount();

  if (!hydrated) {
    return (
      <div className="page wrap col gap-16" aria-busy="true" aria-label="Memuat keranjang">
        <h1 className="h1">Keranjang</h1>
        <Skeleton w="50%" />
        <Skeleton h={220} />
      </div>
    );
  }

  const pkgs = groups.length;
  const subtotal = groups.reduce((a, g) => a + g.subtotal, 0);

  return (
    <div className="page wrap">
      <h1 className="h1" style={{ marginBottom: 8 }}>Keranjang</h1>
      {pkgs === 0 ? (
        <div className="mt-24">
          <EmptyState
            icon="bag"
            title="Keranjangmu masih kosong"
            actions={<>
              <ButtonLink href="/jelajahi">Jelajahi Produk</ButtonLink>
              <ButtonLink href="/assistant" variant="secondary">Tanya AI Assistant</ButtonLink>
            </>}
          >
            Mulai dari produk pilihan, atau tanya AI Assistant untuk rekomendasi sesuai budget.
          </EmptyState>
        </div>
      ) : (
        <>
          <p className="muted" style={{ marginBottom: 28 }}>{count} barang dari {pkgs} penjual. Setiap penjual mengirim paketnya sendiri.</p>
          <div className="cart">
            <div>
              {groups.map((g, i) => <CartGroup key={g.sid} g={g} n={i + 1} />)}
            </div>
            <aside className="summary" aria-label="Ringkasan belanja">
              <h2 className="h3">Ringkasan</h2>
              <div className="sum-row"><span>Subtotal ({count} barang)</span><b>{rp(subtotal)}</b></div>
              <div className="sum-row"><span>Ongkir</span><span className="muted">Dihitung di langkah berikutnya</span></div>
              {pkgs > 1 ? (
                <Notice icon="box">
                  Pesananmu akan dibagi menjadi {pkgs} paket karena berasal dari {pkgs} penjual berbeda. Ongkir dihitung per paket.
                </Notice>
              ) : null}
              <div className="sum-row sum-total"><span>Total sementara</span><span>{rp(subtotal)}</span></div>
              <ButtonLink href="/checkout" size="lg" block>Lanjut ke pengiriman</ButtonLink>
              <ButtonLink href="/jelajahi" variant="ghost" block>Lanjut belanja</ButtonLink>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
