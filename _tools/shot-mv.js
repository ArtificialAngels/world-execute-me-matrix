'use strict';
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0,160)); });
  await p.goto('file:///' + path.resolve(__dirname, '..', 'mv', 'index.html').replace(/\\/g, '/'), { waitUntil: 'load' });
  await p.addStyleTag({ content: '#hint{display:none !important}' });
  await p.waitForTimeout(2000);
  const times = [2, 10, 30, 40, 50, 62, 80, 90, 110, 130, 150, 160, 180, 195, 210];
  const stats = [];
  for (const t of times) {
    await p.evaluate(s => { window.FILM.freeze(s); }, t);
    await p.waitForTimeout(160);
    const buf = await p.screenshot({ path: path.resolve(__dirname, '..', 'frames', 'mv', 'm_' + String(t) + '.png') });
    stats.push(t);
  }
  console.log('errors:', errs.length ? errs.slice(0,6).join(' | ') : 'none');
  console.log('rendered', stats.join(','));
  await b.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
