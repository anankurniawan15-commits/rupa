import { Suspense } from 'react';
import { HomePage } from '@/components/home/HomePage';

export const metadata = { title: 'Beranda' };

export default function Page() {
  return <Suspense fallback={null}><HomePage /></Suspense>;
}
