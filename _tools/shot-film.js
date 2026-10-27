'use strict';
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0,240)); });
  await page.goto('file:///' + path.resolve(__dirname, '..', 'film', 'index.html').replace(/\\/g, '/'), { waitUntil: 'load' });
  await page.addStyleTag({ content: '#hint{display:none !important}' });
  await page.waitForTimeout(1500);
  const times = [5, 20, 28, 35, 50, 70, 90, 120, 160, 200, 210];
  for (let i = 0; i < times.length; i++) {
    await page.evaluate(s => { window.FILM.freeze(s); }, times[i]);
    await page.waitForTimeout(220);
    await page.screenshot({ path: path.resolve(__dirname, '..', 'frames', 'film', 'f' + String(i).padStart(2,'0') + '_' + times[i] + '.png') });
  }
  console.log('errors:', errors.length ? errors.slice(0,6).join(' | ') : 'none');
  await browser.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
