'use strict';
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-gl=angle','--use-angle=swiftshader'] });
  const p = await b.newPage({ viewport: { width: 640, height: 360 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///' + path.resolve(__dirname, '..', 'mv', 'index.html').replace(/\\/g, '/'), { waitUntil: 'load' });
  await p.addStyleTag({ content: '#hint{display:none !important}' });
  await p.waitForTimeout(1500);
  const times = [];
  for (let t = 0; t < 212; t += 9) times.push(t);
  let i = 0;
  for (const t of times) {
    await p.evaluate(s => { window.FILM.freeze(s); }, t);
    await p.waitForTimeout(120);
    await p.screenshot({ path: path.resolve(__dirname, '..', 'frames', 'sheet', 's' + String(i).padStart(2, '0') + '.png') });
    i++;
  }
  console.log('captured', i, 'errors:', errs.length ? errs.slice(0,3).join(' | ') : 'none');
  await b.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
