'use strict';
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0,240)); });
  await page.goto('file:///' + path.resolve(__dirname, '..', 'scifi', 'index.html').replace(/\\/g, '/'), { waitUntil: 'load' });
  await page.addStyleTag({ content: '#hint{display:none !important}' });
  await page.waitForTimeout(1500);
  const times = [0.4, 1.2, 2.6, 4.4, 5.6, 7.6, 9.4, 11.4];
  for (let i = 0; i < times.length; i++) {
    await page.evaluate(s => { window.TEST.freeze(s); }, times[i]);
    await page.waitForTimeout(220);
    await page.screenshot({ path: path.resolve(__dirname, '..', 'frames', 'scifi', 's' + String(i).padStart(2,'0') + '_' + times[i] + '.png') });
  }
  console.log('errors:', errors.length ? errors.slice(0,6).join(' | ') : 'none');
  await browser.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
