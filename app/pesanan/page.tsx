import { Suspense } from 'react';
import { OrdersPage } from '@/components/orders/OrdersPage';

export const metadata = { title: 'Pesanan Saya' };

export default function Page() {
  return <Suspense fallback={null}><OrdersPage /></Suspense>;
}
