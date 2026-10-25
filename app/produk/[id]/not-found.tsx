import { EmptyState } from '@/components/ui/Boxes';
import { ButtonLink } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="page wrap">
      <EmptyState
        icon="searchMinus"
        title="Produk tidak ditemukan"
        actions={<ButtonLink href="/jelajahi">Jelajahi Produk</ButtonLink>}
      >
        Listing ini mungkin sudah dihapus penjual atau tautannya salah.
      </EmptyState>
    </div>
  );
}
