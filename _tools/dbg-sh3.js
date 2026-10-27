'use strict';
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-gl=angle','--use-angle=swiftshader'] });
  const p = await b.newPage({ viewport: { width: 800, height: 600 } });
  await p.goto('file:///' + path.resolve(__dirname, '..', 'mv', 'index.html').replace(/\\/g, '/'), { waitUntil: 'load' });
  await p.waitForTimeout(900);
  const res = await p.evaluate(() => {
    function test(w, h, size, bands, useSlices) {
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const x = c.getContext('2d'); window.SH.set(x);
      x.fillStyle = '#0b0b0d'; x.fillRect(0, 0, w, h);
      if (useSlices) window.SH.slicesText('EXECUTION', w/2, h*0.6, size, '#f4f3ee', bands);
      else window.SH.text('EXECUTION', w/2, h*0.6, size, '#f4f3ee');
      const d = x.getImageData(0, 0, w, h).data;
      let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 200) n++;
      return n;
    }
    return { textSmall: test(400,200,30,0,false), slicesSmall: test(400,200,30,8,true), textBig: test(1920,1080,210,0,false), slicesBig: test(1920,1080,210,14,true), slicesMid: test(1920,1080,90,12,true) };
  });
  console.log(JSON.stringify(res));
  await b.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
