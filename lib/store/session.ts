'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { safeStorage } from './storage';

/** Nama cookie yang dibaca proxy.ts (middleware) untuk gating rute. */
export const SESSION_COOKIE = 'rupa_uid';
export const ROLE_COOKIE = 'rupa_role';

interface SessionState {
  /** Hanya id pengguna. Kata sandi tidak pernah disimpan. */
  userId: string | null;
  setUser: (userId: string | null, role?: string) => void;
}

function writeCookies(userId: string | null, role?: string) {
  if (typeof document === 'undefined') return;
  const opts = '; path=/; SameSite=Lax';
  if (userId) {
    document.cookie = `${SESSION_COOKIE}=${encodeURIComponent(userId)}${opts}; max-age=${60 * 60 * 24 * 30}`;
    document.cookie = `${ROLE_COOKIE}=${role || 'user'}${opts}; max-age=${60 * 60 * 24 * 30}`;
  } else {
    document.cookie = `${SESSION_COOKIE}=${opts}; max-age=0`;
    document.cookie = `${ROLE_COOKIE}=${opts}; max-age=0`;
  }
}

/**
 * Sesi mock. TODO(Supabase): ganti dengan supabase.auth.getSession() + cookie dari @supabase/ssr.
 */
export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      userId: null,
      setUser: (userId, role) => {
        writeCookies(userId, role);
        set({ userId });
      },
    }),
    { name: 'rupa-session', storage: safeStorage, skipHydration: true },
  ),
);
