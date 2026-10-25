import { Suspense } from 'react';

export const metadata = { title: 'Pembayaran' };

export default function Page({ params }: PageProps<'/pembayaran/[id]'>) {
  return (
    <Suspense fallback={null}>
      {params.then(({ id }) => <div className="page wrap"><h1 className="h1">Pembayaran {id}</h1></div>)}
    </Suspense>
  );
}
