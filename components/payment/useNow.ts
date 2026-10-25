'use client';
import { useSyncExternalStore } from 'react';

/* Jam bersama yang berdetak tiap detik di klien (dipakai hitung mundur pembayaran). */
let now = 0;
let timer: ReturnType<typeof setInterval> | undefined;
const subs = new Set<() => void>();

function subscribe(cb: () => void) {
  subs.add(cb);
  if (!timer) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      subs.forEach((f) => f());
    }, 1000);
  }
  return () => {
    subs.delete(cb);
    if (!subs.size && timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

function getSnapshot() {
  if (!now) now = Date.now();
  return now;
}

/** Waktu sekarang (ms), diperbarui setiap detik. 0 saat render server. */
export function useNow() {
  return useSyncExternalStore(subscribe, getSnapshot, () => 0);
}
