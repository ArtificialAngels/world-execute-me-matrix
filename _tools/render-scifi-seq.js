'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
(async () => {
  const dir = path.resolve(__dirname, '..', 'frames', 'scifi', 'seq');
  fs.mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('file:///' + path.resolve(__dirname, '..', 'scifi', 'index.html').replace(/\\/g, '/'), { waitUntil: 'load' });
  await page.addStyleTag({ content: '#hint{display:none !important}' });
  await page.waitForTimeout(1200);
  const FPS = 24, LEN = 12;
  for (let i = 0; i < FPS * LEN; i++) {
    const t = i / FPS;
    await page.evaluate(s => { window.TEST.freeze(s); }, t);
    await page.waitForTimeout(28);
    await page.screenshot({ path: path.join(dir, 'f' + String(i).padStart(4, '0') + '.png') });
  }
  console.log('frames', FPS * LEN, 'errors', errors.length ? errors.slice(0,3).join(' | ') : 'none');
  await browser.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
