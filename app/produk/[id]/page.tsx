import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PRODUCTS } from '@/lib/data';
import { ProductDetail } from '@/components/product/ProductDetail';

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: PageProps<'/produk/[id]'>): Promise<Metadata> {
  const { id } = await params;
  const p = PRODUCTS.find((x) => x.id === id);
  return { title: p ? p.title : 'Produk tidak ditemukan' };
}

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!PRODUCTS.some((p) => p.id === id)) notFound();
  return <ProductDetail key={id} id={id} />;
}

export default function Page({ params }: PageProps<'/produk/[id]'>) {
  return (
    <Suspense fallback={null}>
      <Detail params={params} />
    </Suspense>
  );
}
