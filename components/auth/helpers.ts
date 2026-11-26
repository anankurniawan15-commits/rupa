'use client';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useHydrated } from '@/lib/store';
import { useCurrentUser } from '@/lib/services/auth.service';

/** Hanya terima rute internal ("/..."), tolak "//host" dan "/\host" (open redirect). */
export function safeNext(next: string | null | undefined): string | null {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return null;
  return next;
}

/** Fokuskan elemen setelah render berikutnya. */
export function focusId(id: string) {
  setTimeout(() => document.getElementById(id)?.focus(), 0);
}

/** Fokus ke field pertama yang galat sesuai urutan. */
export function focusFirst(prefix: string, errs: Record<string, string>, order: string[]) {
  const f = order.find((k) => errs[k]);
  if (f) focusId(prefix + '-' + f);
}

export function toTop() {
  if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
}

/**
 * Pengguna yang sudah masuk dialihkan ke beranda (setelah store terhidrasi).
 * Kembalikan ref; set `.current = true` sebelum proses masuk/daftar agar halaman ini sendiri yang menavigasi.
 */
export function useRedirectIfSignedIn() {
  const hydrated = useHydrated();
  const me = useCurrentUser();
  const router = useRouter();
  const busyRef = useRef(false);
  useEffect(() => {
    if (hydrated && me && !busyRef.current) router.replace('/');
  }, [hydrated, me, router]);
  return busyRef;
}
