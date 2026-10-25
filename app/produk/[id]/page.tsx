import { Suspense } from 'react';

export const metadata = { title: 'Detail produk' };

export default function Page({ params }: PageProps<'/produk/[id]'>) {
  return (
    <Suspense fallback={null}>
      {params.then(({ id }) => <div className="page wrap"><h1 className="h1">Detail produk {id}</h1></div>)}
    </Suspense>
  );
}
