import { Suspense } from 'react';
import { OpenShopPage } from '@/components/shop/OpenShopPage';

export const metadata = { title: 'Buka Toko' };

export default function Page() {
  return <Suspense fallback={null}><OpenShopPage /></Suspense>;
}
