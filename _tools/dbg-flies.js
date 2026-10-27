'use strict';
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const root = path.resolve(__dirname, '..');
  const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-gl=angle','--use-angle=swiftshader','--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  await p.goto('file:///' + path.join(root, 'index.html').replace(/\\/g, '/'), { waitUntil: 'load' });
  await p.waitForTimeout(2000);
  const s = await p.$('#start'); if (s) await s.click();
  await p.waitForTimeout(800);
  for (const t of [12, 200, 205, 207.6, 209.6]) {
    await p.evaluate(x => { const a = document.getElementById('audio'); if (a) { a.currentTime = x; a.play().catch(function(){}); } }, t);
    await p.waitForTimeout(900);
    const st = await p.evaluate(() => {
      const c = document.getElementById('flies');
      const x = c.getContext('2d');
      const d = x.getImageData(0, 0, c.width, c.height).data;
      let sum = 0, n = 0;
      for (let i = 3; i < d.length; i += 4 * 37) { sum += d[i]; if (d[i] > 8) n++; }
      const a = document.getElementById('audio');
      return { ft: a ? +a.currentTime.toFixed(2) : null, alphaSum: sum, lit: n, size: c.width + 'x' + c.height, z: getComputedStyle(c).zIndex, op: getComputedStyle(c).opacity };
    });
    console.log(t, JSON.stringify(st));
  }
  await b.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
