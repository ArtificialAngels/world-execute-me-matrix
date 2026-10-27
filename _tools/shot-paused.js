'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
(async () => {
  const root = path.resolve(__dirname, '..');
  const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-gl=angle','--use-angle=swiftshader','--autoplay-policy=no-user-gesture-required','--hide-scrollbars'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const cdp = await p.context().newCDPSession(p);
  async function shot(name) { const r = await cdp.send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(root, 'frames', 'matrix', name), Buffer.from(r.data, 'base64')); }
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///' + path.join(root, 'index.html').replace(/\\/g, '/'), { waitUntil: 'load' });
  await p.waitForTimeout(2000);
  const s = await p.$('#start'); if (s) await s.click();
  await p.waitForTimeout(800);
  for (const [t, name] of [[205.0, 'p205.png'], [207.6, 'p207.png'], [209.8, 'p209.png']]) {
    await p.evaluate(x => { const a = document.getElementById('audio'); if (a) { a.currentTime = x; a.pause(); } }, t);
    await p.waitForTimeout(700);
    await shot(name);
  }
  console.log('errors:', errs.length ? errs.slice(0,3).join(' | ') : 'none');
  await b.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
