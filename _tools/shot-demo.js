'use strict';
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0,200)); });
  await page.goto('file:///' + path.resolve(__dirname, '..', 'demo', 'index.html').replace(/\\/g, '/'), { waitUntil: 'load' });
  await page.addStyleTag({ content: '#hint{display:none !important}' });
  await page.waitForTimeout(1400);
  const times = [3.2, 6.8, 9.6, 14.2, 19.8, 22.6, 26.4, 29.2];
  for (let i = 0; i < times.length; i++) {
    await page.evaluate(s => { window.DEMO.freeze(s); }, times[i]);
    await page.waitForTimeout(120);
    await page.locator('#view').screenshot({ path: path.resolve(__dirname, '..', 'frames', 'demo', 't' + String(i).padStart(2,'0') + '_' + times[i] + '.png') });
  }
  console.log('errors:', errors.length ? errors.slice(0,5).join(' | ') : 'none');
  await browser.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
