'use strict';
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-gl=angle','--use-angle=swiftshader'] });
  const p = await b.newPage({ viewport: { width: 800, height: 600 } });
  await p.goto('file:///' + path.resolve(__dirname, '..', 'mv', 'index.html').replace(/\\/g, '/'), { waitUntil: 'load' });
  await p.waitForTimeout(800);
  const res = await p.evaluate(() => {
    function count(fn) {
      const c = document.createElement('canvas'); c.width = 800; c.height = 400;
      const x = c.getContext('2d');
      x.fillStyle = '#000'; x.fillRect(0, 0, 800, 400);
      fn(x);
      const d = x.getImageData(0, 0, 800, 400).data;
      let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 200) n++;
      return n;
    }
    return {
      plain: count(x => { x.font = 'bold 90px "MS Gothic", Consolas, monospace'; x.fillStyle = '#fff'; x.textAlign = 'center'; x.fillText('EXECUTION', 400, 240); }),
      clipOnly: count(x => { x.save(); x.beginPath(); x.rect(0, 0, 800, 400); x.clip(); x.font = 'bold 90px "MS Gothic", Consolas, monospace'; x.fillStyle = '#fff'; x.textAlign = 'center'; x.fillText('EXECUTION', 400, 240); x.restore(); }),
      clipBand: count(x => { x.save(); x.beginPath(); x.rect(0, 150, 800, 30); x.clip(); x.font = 'bold 90px "MS Gothic", Consolas, monospace'; x.fillStyle = '#fff'; x.textAlign = 'center'; x.fillText('EXECUTION', 400, 240); x.restore(); })
    };
  });
  console.log(JSON.stringify(res));
  await b.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
