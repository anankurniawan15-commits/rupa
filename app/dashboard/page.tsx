import { Suspense } from 'react';
import { DashboardPage } from '@/components/dashboard/DashboardPage';

export const metadata = { title: 'Dashboard Penjual' };

export default function Page() {
  return <Suspense fallback={null}><DashboardPage /></Suspense>;
}
