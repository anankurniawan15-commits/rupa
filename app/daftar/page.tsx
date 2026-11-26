import { Suspense } from 'react';
import { RegisterForm } from '@/components/auth/RegisterForm';

export const metadata = { title: 'Daftar' };

export default function Page() {
  return <Suspense fallback={null}><RegisterForm /></Suspense>;
}
