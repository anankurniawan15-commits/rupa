import { Suspense } from 'react';
import { SortirPage } from '@/components/sortir/SortirPage';

export const metadata = { title: 'AI Sortir' };

export default function Page() {
  return <Suspense fallback={null}><SortirPage /></Suspense>;
}
