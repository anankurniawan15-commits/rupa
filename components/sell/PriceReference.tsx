import { Icon } from '@/components/ui/Icon';
import type { PriceReference as Ref } from '@/types/ai';

/** Referensi harga — hanya tampil bila ada ≥3 listing pembanding; selain itu teks jujur. */
export function PriceReference({ refData, cat }: { refData: Ref; cat: string }) {
  if (refData.has) {
    return (
      <div className="ok-box">
        <Icon name="chart" />
        <div>
          <b>Referensi dari {refData.n} listing serupa di kategori {cat}</b>
          <p style={{ marginTop: 4 }}>Rentang {refData.range} · median {refData.median}. Data contoh, bukan harga wajib.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="notice">
      <Icon name="info" />
      <span>{cat ? 'Belum ada cukup listing pembanding untuk kategori ' + cat + ', jadi kami tidak menampilkan referensi harga.' : 'Pilih kategori di langkah 2 untuk melihat referensi harga — bila datanya cukup.'}</span>
    </div>
  );
}
