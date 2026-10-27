'use strict';
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  for (const v of [1,2]) {
    const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
    const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0,140)); });
    await p.goto('file:///' + path.resolve(__dirname, '..', 'anime', 'index.html').replace(/\\/g, '/') + '?v=' + v, { waitUntil: 'load' });
    await p.addStyleTag({ content: '#hint{display:none !important}' });
    await p.waitForTimeout(1500);
    for (const t of [0.8, 2.4, 5.4, 8.2, 10.8]) {
      await p.evaluate(s => { window.TEST.freeze(s); }, t);
      await p.waitForTimeout(240);
      await p.screenshot({ path: path.resolve(__dirname, '..', 'frames', 'anime', 'v' + v + '_' + String(t).replace('.', '_') + '.png') });
    }
    console.log('v' + v, 'errors:', errs.length ? errs.slice(0,3).join(' | ') : 'none');
    await p.close();
  }
  await b.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
