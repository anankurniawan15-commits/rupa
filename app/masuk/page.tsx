import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';

export const metadata = { title: 'Masuk' };

export default function Page() {
  return <Suspense fallback={null}><LoginForm /></Suspense>;
}
