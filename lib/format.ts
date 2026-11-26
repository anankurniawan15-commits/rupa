/** Format Rupiah: rp(85000) => "Rp85.000" (pemisah titik). */
export const rp = (n: number) => 'Rp' + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/** Satu desimal dengan koma: r1(4.9) => "4,9". */
export const r1 = (n: number) => n.toFixed(1).replace('.', ',');

/** Ambil angka dari teks bebas: num("Rp85.000") => 85000. */
export const num = (v: unknown) => parseInt(String(v ?? '').replace(/\D/g, ''), 10) || 0;

export const initialsOf = (n: string) =>
  String(n || '').trim().split(/\s+/).slice(0, 2).map((w) => w[0] || '').join('').toUpperCase();

export const maskEmail = (e: string) => {
  const [u = '', d] = String(e || '').split('@');
  if (!d || !u) return e;
  return (u.length <= 2 ? u[0] + '•' : u[0] + '•'.repeat(Math.min(5, u.length - 2)) + u[u.length - 1]) + '@' + d;
};

/** 00:00:00 dari milidetik tersisa. */
export const hms = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const p = (n: number) => String(n).padStart(2, '0');
  return p(Math.floor(s / 3600)) + ':' + p(Math.floor((s % 3600) / 60)) + ':' + p(s % 60);
};

const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
/** "19 Okt 2026, 14.05" */
export const fmtTs = (ts: number) => {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, '0');
  return d.getDate() + ' ' + BLN[d.getMonth()] + ' ' + d.getFullYear() + ', ' + p(d.getHours()) + '.' + p(d.getMinutes());
};

/** Jumlah bintang penuh dari 5. */
export const starCount = (n: number) => Math.max(0, Math.min(5, Math.round(n)));

export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ');
