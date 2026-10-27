'use strict';
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const logs = [];
  page.on('console', m => logs.push(m.type() + ': ' + m.text().slice(0,300)));
  page.on('pageerror', e => logs.push('pageerror: ' + e.message));
  await page.goto('file:///' + path.resolve(__dirname, '..', 'scifi', 'index.html').replace(/\\/g, '/'), { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  const info = await page.evaluate(() => ({ pts: window.POINTS && window.POINTS.count, gl: !!window.SCIFI }));
  console.log(JSON.stringify(info));
  console.log(logs.join('\n'));
  await browser.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
