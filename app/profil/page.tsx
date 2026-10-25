import { Suspense } from 'react';
import { ProfilePage } from '@/components/profile/ProfilePage';

export const metadata = { title: 'Profil' };

export default function Page() {
  return <Suspense fallback={null}><ProfilePage /></Suspense>;
}
