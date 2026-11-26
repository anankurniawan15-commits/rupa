'use client';
/**
 * CartService + wishlist. Sekarang store Zustand (persisted).
 * TODO(Supabase): tabel cart_items & wishlists per userId.
 */
import { useMemo } from 'react';
import { useCart } from '@/lib/store/cart';
import { useWishlist } from '@/lib/store/wishlist';
import { toast } from '@/lib/store/toast';
import { currentUser } from './auth.service';
import { getProduct, getSeller } from './product.service';
import type { CartItem } from '@/types/order';
import type { Product, Seller } from '@/types/product';

export interface CartGroup {
  sid: string;
  seller: Seller;
  items: { p: Product; qty: number }[];
  subtotal: number;
}

export function groupBySeller(items: CartItem[]): CartGroup[] {
  const groups: CartGroup[] = [];
  items.forEach((c) => {
    const p = getProduct(c.id);
    if (!p) return;
    let g = groups.find((x) => x.sid === p.seller);
    if (!g) {
      g = { sid: p.seller, seller: getSeller(p.seller), items: [], subtotal: 0 };
      groups.push(g);
    }
    g.items.push({ p, qty: c.qty });
    g.subtotal += p.price * c.qty;
  });
  return groups;
}

const items = () => useCart.getState().items;
const setItems = (v: CartItem[]) => useCart.getState().setItems(v);

export const cartService = {
  /** Tambah ke keranjang dengan batas stok. Mengembalikan false bila gagal. */
  async add(productId: string, qty = 1, opts: { silent?: boolean } = {}): Promise<boolean> {
    const p = getProduct(productId);
    if (!p) return false;
    if (p.stock <= 0) {
      toast('Stok produk ini sedang habis', { kind: 'warn' });
      return false;
    }
    const ex = items().find((c) => c.id === productId);
    const want = (ex ? ex.qty : 0) + qty;
    if (want > p.stock) {
      toast(p.stock === 1 ? 'Barang ini satu-satunya dan sudah ada di keranjang' : 'Stok tersisa ' + p.stock, { kind: 'warn', actionLabel: 'Lihat keranjang', href: '/keranjang' });
      return false;
    }
    setItems(ex ? items().map((c) => (c.id === productId ? { id: productId, qty: want } : c)) : [...items(), { id: productId, qty }]);
    if (!opts.silent) toast(p.title + ' masuk keranjang', { actionLabel: 'Lihat keranjang', href: '/keranjang' });
    return true;
  },
  async setQty(productId: string, q: number): Promise<void> {
    const p = getProduct(productId);
    if (!p) return;
    if (q < 1) return cartService.remove(productId);
    if (q > p.stock) {
      toast('Stok tersisa ' + p.stock, { kind: 'warn' });
      return;
    }
    setItems(items().map((c) => (c.id === productId ? { id: productId, qty: q } : c)));
  },
  async remove(productId: string): Promise<void> {
    const prev = items();
    setItems(prev.filter((c) => c.id !== productId));
    toast('Produk dihapus dari keranjang', { kind: 'info', actionLabel: 'Urungkan', action: () => setItems(prev) });
  },
  async clear(): Promise<void> {
    setItems([]);
  },
  inCart(productId: string) {
    return items().some((c) => c.id === productId);
  },
};

export function useCartItems() {
  return useCart((s) => s.items);
}
export function useCartCount() {
  return useCart((s) => s.items.reduce((a, c) => a + c.qty, 0));
}
export function useCartGroups(): CartGroup[] {
  const list = useCart((s) => s.items);
  return useMemo(() => groupBySeller(list), [list]);
}

/* ---------- wishlist ---------- */
export const wishlistService = {
  /**
   * Simpan/hapus. Mengembalikan 'login' bila tamu — pemanggil mengarahkan ke
   * /masuk?next=... dengan catatan "Masuk untuk menyimpan produk ke wishlist."
   */
  async toggle(productId: string): Promise<'added' | 'removed' | 'login'> {
    if (!currentUser()) return 'login';
    const { ids, setIds } = useWishlist.getState();
    const on = ids.indexOf(productId) >= 0;
    if (on) {
      setIds(ids.filter((x) => x !== productId));
      toast('Dihapus dari wishlist', { kind: 'info', actionLabel: 'Urungkan', action: () => setIds([...useWishlist.getState().ids, productId]) });
      return 'removed';
    }
    setIds([...ids, productId]);
    toast('Disimpan ke wishlist', { actionLabel: 'Lihat wishlist', href: '/wishlist' });
    return 'added';
  },
};

export const WISH_LOGIN_NOTE = 'Masuk untuk menyimpan produk ke wishlist.';

export function useWishIds() {
  return useWishlist((s) => s.ids);
}
export function useIsWished(id: string) {
  return useWishlist((s) => s.ids.indexOf(id) >= 0);
}
