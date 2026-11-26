/** Jeda simulasi jaringan. Bisa dibatalkan lewat AbortSignal. */
export function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'));
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(t);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });
}

export const isAbort = (e: unknown) => e instanceof DOMException && e.name === 'AbortError';
