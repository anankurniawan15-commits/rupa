import { Suspense } from 'react';
import { CheckoutPage } from '@/components/checkout/CheckoutPage';

export const metadata = { title: 'Checkout' };

export default function Page() {
  return <Suspense fallback={null}><CheckoutPage /></Suspense>;
}
