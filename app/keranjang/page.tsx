import { Suspense } from 'react';
import { CartPage } from '@/components/checkout/CartPage';

export const metadata = { title: 'Keranjang' };

export default function Page() {
  return <Suspense fallback={null}><CartPage /></Suspense>;
}
