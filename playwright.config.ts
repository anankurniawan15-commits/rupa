import { defineConfig } from '@playwright/test';

/**
 * Uji otomatis AI Assistant (tanpa browser).
 *  - unit : fungsi murni + LLM palsu; tidak butuh server dan tidak memanggil Groq.
 *  - api  : POST /api/assistant lewat fixture `request` ke server dev (BASE_URL).
 */
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
// `npm run test:unit` tidak butuh server, jadi `next dev` tidak dinyalakan.
const needsServer = !process.argv.includes('--project=unit');

export default defineConfig({
  testDir: 'tests',
  reporter: 'list',
  projects: [
    { name: 'unit', testMatch: /assistant[\\/]unit[\\/].*\.spec\.ts$/ },
    { name: 'api', testMatch: /assistant[\\/]api[\\/].*\.spec\.ts$/, use: { baseURL: BASE_URL } },
  ],
  webServer: needsServer ? { command: 'npm run dev', url: BASE_URL, reuseExistingServer: true, timeout: 120_000 } : undefined,
});
