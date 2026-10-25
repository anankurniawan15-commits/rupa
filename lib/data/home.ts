import type { CategoryKey, PlaceholderKind } from '@/types/product';

/** Konten editorial Beranda (dari prototipe). */
export const HOME = {
  hero: [
    { id: 'p3', cls: 'ha ha-1', img: '/products/kulot-patchwork.jpg', label: 'Lihat Kulot Patchwork Bintang', alt: 'Kulot lebar dari panel corduroy, flanel kotak-kotak, dan aplikasi bintang perca', no: 'No. 03', caption: 'Kulot patchwork — dari celana corduroy dan kemeja flanel bekas' },
    { id: 'p1', cls: 'ha', img: '/products/tote-saku-denim.jpg', label: 'Lihat Tote Kanvas Saku Denim', alt: 'Saku jeans bekas sedang disematkan ke tote kanvas', no: 'No. 01', caption: 'Saku jeans bekas, dijahit ulang ke kanvas sisa' },
    { id: 'p5', cls: 'ha', img: '/products/jaket-denim-belah-dua.jpg', label: 'Lihat Jaket Denim Belah Dua', alt: 'Jaket denim dua tone, separuh indigo separuh biru muda', no: 'No. 05', caption: 'Dua jaket denim, satu badan' },
  ],
  leadId: 'p3',
  leadStory: 'Nadya dari Studio Tambal membongkar celana corduroy dan kemeja flanel bekas per panel, lalu menyusunnya ulang. Bintang di kakinya dijahit tangan dari perca sisa penjahit langganannya. Hanya ada satu.',
  featuredIds: ['p1', 'p6', 'p5'],
  interests: [
    { key: 'fashion', label: 'Gaya sehari-hari', uses: ['fashion', 'sehari-hari'] },
    { key: 'rumah', label: 'Kamar dan rumah', uses: ['rumah'] },
    { key: 'hadiah', label: 'Hadiah', uses: ['hadiah'] },
    { key: 'kerja', label: 'Kerja dan kuliah', uses: ['kerja', 'kuliah'] },
  ],
  matTiles: [
    { cat: 'tekstil', label: 'Tekstil dan Pakaian', desc: 'Denim, perca, pakaian rekonstruksi', ph: null, img: '/products/kulot-patchwork-detail.jpg' },
    { cat: 'kayu', label: 'Kayu dan Furnitur', desc: 'Kusen, palet, furnitur lama', ph: 'wood', img: null },
    { cat: 'plastik', label: 'Plastik dan Kemasan', desc: 'Tutup botol, wadah, kemasan', ph: 'plastic', img: null },
    { cat: 'aksesori', label: 'Aksesori dan Dekorasi', desc: 'Pot, panel dinding, pernak-pernik', ph: 'metal', img: null },
    { cat: 'lainnya', label: 'Material Lainnya', desc: 'Karet, ban dalam, campuran', ph: 'rubber', img: null },
  ] as { cat: CategoryKey; label: string; desc: string; ph: PlaceholderKind | null; img: string | null }[],
  stories: ([
    { pid: 'p3', ph: 'textile', before: 'Celana corduroy, kemeja flanel, dan perca motif yang tak terpakai', afterLabel: 'Sesudah', img: '/products/kulot-patchwork.jpg', alt: 'Kulot patchwork bintang', seller: 'Studio Tambal · Jakarta Selatan', title: 'Tiga pakaian, satu kulot', text: 'Nadya membongkar pakaian per panel lalu menyusunnya ulang. Bintang di kaki dijahit tangan dari perca sisa penjahit langganannya.' },
    { pid: 'p5', ph: 'textile', before: 'Dua jaket denim bekas — salah satunya sobek di punggung', afterLabel: 'Sesudah', img: '/products/jaket-denim-belah-dua.jpg', alt: 'Jaket denim dua tone', seller: 'Benang Kedua · Bandung', title: 'Dua jaket yang tak lagi utuh', text: 'Daripada menambal sobekan besar, Arief membelah kedua jaket di garis tengah dan menyatukan sisi yang masih kuat.' },
    { pid: 'p1', ph: 'textile', before: 'Celana jeans bekas donasi pelanggan, robek di lutut', afterLabel: 'Proses', img: '/products/tote-saku-denim.jpg', alt: 'Saku jeans disematkan ke tote kanvas', seller: 'Rumah Jahit Laras · Yogyakarta', title: 'Saku yang pindah rumah', text: 'Bu Laras memakai saku jeans yang masih bagus sebagai saku luar tote dari kanvas sisa konveksi tetangganya.' },
  ] as { pid: string; ph: PlaceholderKind; before: string; afterLabel: string; img: string; alt: string; seller: string; title: string; text: string }[]),
};
