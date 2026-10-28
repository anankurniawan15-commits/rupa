import { defineConfig } from '@playwright/test';

/**
 * Uji otomatis AI Assistant (tanpa browser).
 *  - unit : fungsi murni + LLM palsu; tidak butuh server dan tidak memanggil Groq.
 *  - api  : POST /api/assistant lewat fixture `request` ke server dev (BASE_URL).
 * Port sendiri (3200) supaya tidak tertukar dengan aplikasi lain di 3000; server yang sudah jalan
 * bisa dipakai dengan BASE_URL=http://localhost:<port>.
 */
const PORT = 3200;
const BASE_URL = process.env.BASE_URL || 'http://localhost:' + PORT;
// `npm run test:unit` tidak butuh server, jadi `next dev` tidak dinyalakan.
const needsServer = !process.argv.includes('--project=unit');

export default defineConfig({
  testDir: 'tests',
  reporter: 'list',
  projects: [
    { name: 'unit', testMatch: /assistant[\\/]unit[\\/].*\.spec\.ts$/ },
    { name: 'api', testMatch: /assistant[\\/]api[\\/].*\.spec\.ts$/, use: { baseURL: BASE_URL } },
  ],
  webServer: needsServer && !process.env.BASE_URL ? { command: 'npm run dev -- -p ' + PORT, url: BASE_URL, reuseExistingServer: true, timeout: 120_000 } : undefined,
});
