import { Suspense } from 'react';
import { AdminPage } from '@/components/admin/AdminPage';

export const metadata = { title: 'Panel Admin' };

export default function Page() {
  return <Suspense fallback={null}><AdminPage /></Suspense>;
}
