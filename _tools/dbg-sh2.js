'use strict';
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-gl=angle','--use-angle=swiftshader'] });
  const p = await b.newPage({ viewport: { width: 800, height: 600 } });
  await p.goto('file:///' + path.resolve(__dirname, '..', 'mv', 'index.html').replace(/\\/g, '/'), { waitUntil: 'load' });
  await p.waitForTimeout(900);
  const res = await p.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 1920; c.height = 1080;
    const x = c.getContext('2d'); window.SH.set(x);
    x.fillStyle = '#0b0b0d'; x.fillRect(0, 0, 1920, 1080);
    window.SH.slicesText('EXECUTION', 960, 600, 210, '#f4f3ee', 14);
    const d = x.getImageData(0, 0, 1920, 1080).data;
    let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 200) n++;
    return { white: n };
  });
  console.log(JSON.stringify(res));
  await b.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
