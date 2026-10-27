'use strict';
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('file:///' + path.resolve(__dirname, '..', 'film', 'index.html').replace(/\\/g, '/'), { waitUntil: 'load' });
  await page.addStyleTag({ content: '#hint{display:none !important}' });
  await page.waitForTimeout(1500);
  const times = [0, 15, 29.7, 30.2, 45, 59.4, 60.2, 74, 90, 103.5, 120, 147.5, 147.95, 160, 177.3, 177.6, 190, 200, 211];
  for (const t of times) {
    await page.evaluate(s => { window.FILM.freeze(s); }, t);
    await page.waitForTimeout(160);
    await page.screenshot({ path: path.resolve(__dirname, '..', 'frames', 'film', 'scan_' + String(t).replace('.', '_') + '.png') });
  }
  console.log('errors:', errors.length ? errors.slice(0,5).join(' | ') : 'none');
  await browser.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
