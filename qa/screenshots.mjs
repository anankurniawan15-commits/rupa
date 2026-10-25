/**
 * QA visual: simpan screenshot setiap halaman di 1440×900 dan 390×844 ke qa/output/.
 * Bandingkan dengan rupa-ui-kit/design/screenshots/.
 *
 *   npm run build && npm run start -- -p 3100   (terminal lain)
 *   node qa/screenshots.mjs [baseUrl]
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.argv[2] || 'http://localhost:3100';
const OUT = join(process.cwd(), 'qa', 'output');

/** [nama, path, akun] — akun: null (tamu), 'dinda' (pembeli+penjual), 'admin'. */
const PAGES = [
  ['01-beranda', '/', null],
  ['04-jelajahi', '/jelajahi', null],
  ['05-detail-produk', '/produk/p3', null],
  ['07-sortir-unggah', '/sortir', null],
  ['10-ai-assistant', '/assistant', null],
  ['11-jual-produk', '/jual', 'dinda'],
  ['12-dashboard-penjual', '/dashboard', 'dinda'],
  ['13-keranjang', '/keranjang', null],
  ['14-checkout', '/checkout', 'dinda'],
  ['15-pesanan-saya', '/pesanan', 'dinda'],
  ['16-masuk', '/masuk?next=%2Fcheckout', null],
  ['17-daftar', '/daftar', null],
  ['18-lupa-sandi', '/lupa-sandi', null],
  ['20-buka-toko', '/buka-toko', 'ayu'],
  ['profil', '/profil', 'dinda'],
  ['wishlist', '/wishlist', 'dinda'],
  ['24-admin-ringkasan', '/admin', 'admin'],
];

const VIEWPORTS = [
  ['desktop', { width: 1440, height: 900 }],
  ['mobile', { width: 390, height: 844 }],
];

async function signIn(context, uid) {
  const role = uid === 'admin' ? 'admin' : 'user';
  const url = new URL(BASE);
  await context.addCookies([
    { name: 'rupa_uid', value: uid, domain: url.hostname, path: '/' },
    { name: 'rupa_role', value: role, domain: url.hostname, path: '/' },
  ]);
  await context.addInitScript((id) => {
    try { localStorage.setItem('rupa-session', JSON.stringify({ state: { userId: id }, version: 0 })); } catch { /* noop */ }
  }, uid);
}

const browser = await chromium.launch();
for (const [vp, size] of VIEWPORTS) {
  mkdirSync(join(OUT, vp), { recursive: true });
  for (const [name, path, uid] of PAGES) {
    const context = await browser.newContext({ viewport: size, deviceScaleFactor: 1, isMobile: vp === 'mobile', hasTouch: vp === 'mobile' });
    if (uid) await signIn(context, uid);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(BASE + path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.screenshot({ path: join(OUT, vp, name + '.png'), fullPage: true });
    console.log(`${vp.padEnd(8)} ${name.padEnd(24)} ${page.url().replace(BASE, '')}${errors.length ? '  ERR: ' + errors.join(' | ') : ''}`);
    await context.close();
  }
}

// Pembayaran: buat tagihan dari pesanan "menunggu".
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await signIn(context, 'dinda');
  const page = await context.newPage();
  await page.goto(BASE + '/pesanan', { waitUntil: 'networkidle' });
  const pay = page.getByRole('button', { name: 'Bayar sekarang' }).first();
  if (await pay.count()) {
    await pay.click();
    await page.waitForURL(/\/pembayaran\//, { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(600);
    await page.screenshot({ path: join(OUT, 'desktop', '22-pembayaran-va.png'), fullPage: true });
    console.log('desktop  22-pembayaran-va         ' + page.url().replace(BASE, ''));
  }
  await context.close();
}

await browser.close();
console.log('Selesai → ' + OUT);
