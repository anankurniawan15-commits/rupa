'use client';
import { Guard } from '@/components/auth/Guard';
import { Button, ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Boxes';
import { ProductCard } from '@/components/product/ProductCard';
import { getProduct } from '@/lib/services/product.service';
import { cartService, useWishIds } from '@/lib/services/cart.service';
import type { Product } from '@/types/product';

function WishlistBody() {
  const ids = useWishIds();
  const list = ids.map((id) => getProduct(id)).filter((p): p is Product => !!p);
  return (
    <div className="page wrap">
      <h1 className="h1" style={{ marginBottom: 8 }}>Wishlist</h1>
      <p className="muted" style={{ marginBottom: 28 }}>Barang yang kamu simpan. Stok barang upcycle sering hanya satu — jangan terlalu lama.</p>
      {list.length ? (
        <div className="grid-prod">
          {list.map((p) => (
            <ProductCard
              key={p.id}
              p={p}
              showSoldOut
              footer={<Button variant="secondary" size="sm" className="mt-8" onClick={() => void cartService.add(p.id)} disabled={p.stock <= 0}>Tambah ke keranjang</Button>}
            />
          ))}
        </div>
      ) : (
        <EmptyState icon="heart" title="Wishlist masih kosong" actions={<ButtonLink href="/jelajahi">Jelajahi Produk</ButtonLink>}>
          Tekan ikon hati di produk mana pun untuk menyimpannya di sini.
        </EmptyState>
      )}
    </div>
  );
}

/** Wishlist (khusus pengguna masuk). */
export function WishlistPage() {
  return <Guard need="user">{() => <WishlistBody />}</Guard>;
}
