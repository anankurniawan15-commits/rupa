import { Suspense } from 'react';
import { SellPage } from '@/components/sell/SellPage';

export const metadata = { title: 'Jual Produk' };

export default function Page() {
  return <Suspense fallback={null}><SellPage /></Suspense>;
}
