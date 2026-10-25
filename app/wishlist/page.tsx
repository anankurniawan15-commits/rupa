import { Suspense } from 'react';
import { WishlistPage } from '@/components/wishlist/WishlistPage';

export const metadata = { title: 'Wishlist' };

export default function Page() {
  return <Suspense fallback={null}><WishlistPage /></Suspense>;
}
