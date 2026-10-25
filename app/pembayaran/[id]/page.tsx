import { Suspense } from 'react';
import { PaymentPage } from '@/components/payment/PaymentPage';

export const metadata = { title: 'Pembayaran' };

export default function Page({ params }: PageProps<'/pembayaran/[id]'>) {
  return (
    <Suspense fallback={null}>
      {params.then(({ id }) => <PaymentPage id={id} />)}
    </Suspense>
  );
}
