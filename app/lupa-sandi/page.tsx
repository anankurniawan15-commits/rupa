import { Suspense } from 'react';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';

export const metadata = { title: 'Lupa kata sandi' };

export default function Page() {
  return <Suspense fallback={null}><ForgotPasswordForm /></Suspense>;
}
