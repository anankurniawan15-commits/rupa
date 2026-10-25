/**
 * STUB — belum dipakai. Siapkan client Supabase dari env.
 *
 * Langkah menyambung:
 *   npm i @supabase/supabase-js @supabase/ssr
 *   isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY di .env.local
 *   lalu ganti badan fungsi di bawah dengan:
 *     import { createBrowserClient } from '@supabase/ssr';
 *     return createBrowserClient(url, key);
 */
export interface SupabaseLike {
  from: (table: string) => unknown;
  auth: unknown;
  storage: unknown;
}

export function createClient(): SupabaseLike {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Supabase belum dikonfigurasi. Isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY. Fase ini memakai data mock di lib/services.');
  }
  throw new Error('Stub: pasang @supabase/ssr lalu kembalikan createBrowserClient(url, key).');
}
