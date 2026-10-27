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
  await p.waitForTimeout(2500);
  const start = await p.$('#start'); if (start) await start.click();
  await p.waitForTimeout(1500);
  for (const [t, name] of [[204.5, 'fall1.png'], [207.5, 'fall2.png'], [210.4, 'fall3.png']]) {
    await p.evaluate(s => { const a = document.getElementById('audio'); if (a) { a.currentTime = s; a.play().catch(function(){}); } }, t);
    await p.waitForTimeout(1400);
    await shot(name);
  }
  console.log('errors:', errs.length ? errs.slice(0,3).join(' | ') : 'none');
  await b.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
