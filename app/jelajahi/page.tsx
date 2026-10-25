import { Suspense } from 'react';
import { ExplorePage } from '@/components/product/ExplorePage';

export const metadata = { title: 'Jelajahi Produk' };

export default function Page() {
  return <Suspense fallback={<div className="page wrap"><h1 className="h1">Jelajahi Produk</h1></div>}><ExplorePage /></Suspense>;
}
