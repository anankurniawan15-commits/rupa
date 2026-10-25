/**
 * Skema zod untuk formulir. Dipakai ulang nanti di route handler (app/api/*).
 * Pesan galat persis seperti prototipe.
 */
import { z } from 'zod';

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const PHONE_RE = /^(\+62|62|0)8[0-9\s-]{8,14}$/;

/** Aturan kata sandi + meter kekuatan 4 segmen. */
export function pwRules(pw: string) {
  pw = pw || '';
  const rules: [string, boolean, boolean][] = [
    ['Minimal 8 karakter', pw.length >= 8, true],
    ['Mengandung huruf dan angka', /[A-Za-z]/.test(pw) && /\d/.test(pw), true],
    ['Huruf besar & kecil', /[a-z]/.test(pw) && /[A-Z]/.test(pw), false],
    ['Simbol (! ? #)', /[^A-Za-z0-9]/.test(pw), false],
  ];
  let score = rules.filter((x) => x[1]).length;
  if (pw.length < 8) score = Math.min(score, 1);
  const labels = ['Belum diisi', 'Lemah', 'Cukup', 'Kuat', 'Sangat kuat'];
  const level = pw ? Math.max(1, score) : 0;
  return {
    ok: rules[0][1] && rules[1][1],
    level,
    label: labels[level],
    rules: rules.map(([text, ok, required]) => ({ text, ok, required })),
  };
}

export const pwError = (pw: string) =>
  !pw ? 'Kata sandi wajib diisi.' : pwRules(pw).ok ? '' : 'Kata sandi minimal 8 karakter dan mengandung huruf serta angka.';

const passwordSchema = z.string().superRefine((v, ctx) => {
  const e = pwError(v);
  if (e) ctx.addIssue({ code: 'custom', message: e });
});

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email wajib diisi.').regex(EMAIL_RE, 'Format email belum benar, contoh: nama@email.com.'),
  pass: z.string().min(1, 'Kata sandi wajib diisi.'),
});

export const registerSchema = z
  .object({
    name: z.string().trim().min(3, 'Tulis nama lengkap, minimal 3 huruf.'),
    email: z.string().trim().regex(EMAIL_RE, 'Format email belum benar, contoh: nama@email.com.'),
    phone: z.string().trim().regex(PHONE_RE, 'Gunakan nomor HP Indonesia, misalnya 0812 3456 7890.'),
    pass: passwordSchema,
    pass2: z.string().min(1, 'Ulangi kata sandi.'),
    agree: z.literal(true, 'Setujui Syarat Layanan dan Kebijakan Privasi untuk melanjutkan.'),
  })
  .refine((d) => !d.pass2 || d.pass2 === d.pass, { path: ['pass2'], message: 'Kata sandi tidak sama.' });

export const otpSchema = z.string().regex(/^\d{6}$/, 'Kode terdiri dari 6 angka.');

export const resetEmailSchema = z.object({
  email: z.string().trim().regex(EMAIL_RE, 'Format email belum benar, contoh: nama@email.com.'),
});

export const resetPasswordSchema = z
  .object({ pass: passwordSchema, pass2: z.string().min(1, 'Ulangi kata sandi baru.') })
  .refine((d) => !d.pass2 || d.pass2 === d.pass, { path: ['pass2'], message: 'Kata sandi tidak sama.' });

export const addressSchema = z.object({
  name: z.string().trim().min(1, 'Nama penerima wajib diisi.'),
  phone: z.string().trim().regex(PHONE_RE, 'Gunakan format nomor HP Indonesia, misalnya 0812 3456 7890.'),
  addr: z.string().trim().min(15, 'Tulis alamat lengkap: jalan, nomor, RT/RW, kelurahan.'),
  zip: z.string().trim().regex(/^\d{5}$/, 'Kode pos terdiri dari 5 angka.'),
  city: z.string().min(1),
});

export const shopInfoSchema = z.object({
  name: z.string().trim().min(3, 'Nama toko 3–40 karakter.').max(40, 'Nama toko 3–40 karakter.'),
  city: z.string().min(1, 'Pilih kota asal pengiriman.'),
  desc: z.string().max(160),
});

export const bankSchema = z.object({
  bank: z.string().min(1, 'Pilih bank.'),
  acct: z.string().transform((v) => v.replace(/[\s-]/g, '')).pipe(z.string().regex(/^\d{8,16}$/, 'Nomor rekening terdiri dari 8–16 angka.')),
  holder: z.string().trim().min(3, 'Tulis nama pemilik rekening sesuai buku tabungan.'),
});

export const profileSchema = z.object({
  name: z.string().trim().min(1, 'Nama wajib diisi.'),
  email: z.string().trim().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Format email belum benar.'),
});

export const resiSchema = z.string().trim().regex(/^[A-Za-z0-9-]{8,}$/, 'Nomor resi minimal 8 karakter huruf, angka, atau tanda hubung.');

export const reviewSchema = z.object({
  stars: z.number().min(1, 'Pilih rating 1–5 bintang.'),
  text: z.string().trim().min(10, 'Tulis ulasan minimal 10 karakter.'),
});

/** Ubah hasil safeParse menjadi { field: pesan pertama }. */
export function fieldErrors(result: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }): Record<string, string> {
  const out: Record<string, string> = {};
  if (result.success || !result.error) return out;
  for (const i of result.error.issues) {
    const k = String(i.path[0] ?? '_');
    if (!out[k]) out[k] = i.message;
  }
  return out;
}
