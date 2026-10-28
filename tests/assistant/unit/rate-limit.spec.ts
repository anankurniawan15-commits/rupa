import { expect, test } from '@playwright/test';
import { createRateLimiter } from '@/lib/rate-limit';

test('rate limit: batas per kunci, Retry-After, dan jendela baru', () => {
  const take = createRateLimiter(2, 60_000);
  expect(take('a', 0).ok).toBe(true);
  expect(take('a', 1_000).ok).toBe(true);
  expect(take('a', 2_000)).toEqual({ ok: false, retryAfterSec: 58 });
  expect(take('b', 2_000).ok).toBe(true);
  expect(take('a', 60_000).ok).toBe(true);
});

test('rate limit: banjir kunci baru tidak mereset hitungan kunci yang masih aktif', () => {
  const take = createRateLimiter(1, 60_000);
  for (let i = 0; i < 10_000; i++) take('flood-' + i, 0);
  take('victim', 1);
  expect(take('victim', 2).ok).toBe(false);
  for (let i = 0; i < 100; i++) take('flood2-' + i, 3);
  expect(take('victim', 4).ok).toBe(false);
});
