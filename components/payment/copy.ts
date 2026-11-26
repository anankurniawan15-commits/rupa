'use client';
import { toast } from '@/lib/store/toast';

/** Salin ke papan klip lalu tampilkan toast (seperti `copyText` prototipe). */
export function copyText(text: string, msg: string) {
  try {
    void navigator.clipboard?.writeText(text).catch(() => {});
  } catch {
    /* noop */
  }
  toast(msg);
}
