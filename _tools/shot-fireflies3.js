'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
(async () => {
  const root = path.resolve(__dirname, '..');
  const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-gl=angle','--use-angle=swiftshader','--autoplay-policy=no-user-gesture-required','--hide-scrollbars'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const cdp = await p.context().newCDPSession(p);
  async function shot(name) {
    const r = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(path.join(root, 'frames', 'matrix', name), Buffer.from(r.data, 'base64'));
  }
  await p.goto('file:///' + path.join(root, 'index.html').replace(/\\/g, '/'), { waitUntil: 'load' });
  await p.waitForTimeout(2500);
  const start = await p.$('#start');
  if (start) await start.click();
  await p.waitForTimeout(6000);
  await shot('ff8.png');
  await p.evaluate(() => { const a = document.getElementById('audio'); if (a) { a.currentTime = 206; a.play().catch(function(){}); } });
  await p.waitForTimeout(2000);
  await shot('ff206.png');
  await p.evaluate(() => { const a = document.getElementById('audio'); if (a) { a.currentTime = 210.5; a.play().catch(function(){}); } });
  await p.waitForTimeout(1500);
  await shot('ff210.png');
  console.log('errors:', errs.length ? errs.slice(0,4).join(' | ') : 'none');
  await b.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
