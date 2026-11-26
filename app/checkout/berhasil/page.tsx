import { Suspense } from 'react';
import { SuccessPage } from '@/components/checkout/SuccessPage';

export const metadata = { title: 'Pesanan dibuat' };

export default function Page() {
  return <Suspense fallback={null}><SuccessPage /></Suspense>;
}
