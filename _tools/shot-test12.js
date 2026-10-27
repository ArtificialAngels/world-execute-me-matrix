'use strict';
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0,200)); });
  await page.goto('file:///' + path.resolve(__dirname, '..', 'test12', 'index.html').replace(/\\/g, '/'), { waitUntil: 'load' });
  await page.addStyleTag({ content: '#hint{display:none !important}' });
  await page.waitForTimeout(1200);
  const times = [0.95, 2.65, 4.75, 6.45, 8.45, 11.85];
  for (let i = 0; i < times.length; i++) {
    await page.evaluate(s => { window.TEST.freeze(s); }, times[i]);
    await page.waitForTimeout(160);
    await page.locator('#gl').screenshot({ path: path.resolve(__dirname, '..', 'frames', 'test12', 'm' + String(i).padStart(2,'0') + '_' + times[i] + '.png') });
  }
  console.log('errors:', errors.length ? errors.slice(0,5).join(' | ') : 'none');
  await browser.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
