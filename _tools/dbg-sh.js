'use strict';
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-gl=angle','--use-angle=swiftshader'] });
  const p = await b.newPage({ viewport: { width: 800, height: 600 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///' + path.resolve(__dirname, '..', 'mv', 'index.html').replace(/\\/g, '/'), { waitUntil: 'load' });
  await p.waitForTimeout(1000);
  const res = await p.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 400; c.height = 200;
    const x = c.getContext('2d'); window.SH.set(x);
    x.fillStyle = '#000'; x.fillRect(0, 0, 400, 200);
    window.SH.text('ABC', 200, 60, 50, '#ffffff');
    window.SH.slicesText('ABC', 200, 160, 60, '#ffffff', 8);
    const d = x.getImageData(0, 0, 400, 200).data;
    let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 200) n++;
    return { whitePixels: n, font: x.font, text: window.SH.text.toString().slice(0, 80) };
  });
  console.log(JSON.stringify(res));
  console.log('errors:', errs.slice(0,3).join(' | '));
  await b.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
