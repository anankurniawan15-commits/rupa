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
