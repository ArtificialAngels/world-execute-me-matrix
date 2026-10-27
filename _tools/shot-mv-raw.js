'use strict';
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///' + path.resolve(__dirname, '..', 'mv', 'index.html').replace(/\\/g, '/'), { waitUntil: 'load' });
  await p.addStyleTag({ content: '#hint{display:none !important}' });
  await p.waitForTimeout(1500);
  await p.evaluate(() => { window.POST = null; });
  for (const t of [150, 160, 30]) {
    await p.evaluate(s => { window.FILM.freeze(s); }, t);
    await p.waitForTimeout(200);
    await p.screenshot({ path: path.resolve(__dirname, '..', 'frames', 'mv', 'raw_' + t + '.png') });
  }
  console.log('errors:', errs.length ? errs.slice(0,3).join(' | ') : 'none');
  await b.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
