'use strict';
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  for (const sc of ['A','B','C']) {
    const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0,160)); });
    await p.goto('file:///' + path.resolve(__dirname, '..', 'wow', 'index.html').replace(/\\/g, '/') + '?w=' + sc, { waitUntil: 'load' });
    await p.addStyleTag({ content: '#hint{display:none !important}' });
    await p.waitForTimeout(1200);
    const times = sc === 'A' ? [0.9, 2.6, 4.35, 5.2] : sc === 'B' ? [1.0, 2.2, 3.4] : [0.8, 1.6, 3.4];
    for (const t of times) {
      await p.evaluate(s => { window.TEST.freeze(s); }, t);
      await p.waitForTimeout(250);
      await p.screenshot({ path: path.resolve(__dirname, '..', 'frames', 'wow', sc + '_' + String(t).replace('.', '_') + '.png') });
    }
    console.log(sc, 'errors:', errs.length ? errs.slice(0,3).join(' | ') : 'none');
    await p.close();
  }
  await b.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
