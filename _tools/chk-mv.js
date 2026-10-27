'use strict';
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///' + path.resolve(__dirname, '..', 'mv', 'index.html').replace(/\\/g, '/'), { waitUntil: 'load' });
  await p.addStyleTag({ content: '#hint{display:none !important}' });
  await p.waitForTimeout(1200);
  for (const t of [150, 40, 195]) {
    await p.evaluate(s => { window.FILM.freeze(s); }, t);
    await p.waitForTimeout(250);
    const seen = await p.evaluate(() => window.__lastT);
    await p.screenshot({ path: path.resolve(__dirname, '..', 'frames', 'mv', 'chk_' + t + '.png') });
    console.log('want', t, 'rendered', seen);
  }
  console.log('errors:', errs.length ? errs.slice(0,4).join(' | ') : 'none');
  await b.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
