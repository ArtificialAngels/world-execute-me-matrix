'use strict';
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const root = path.resolve(__dirname, '..');
  const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-gl=angle','--use-angle=swiftshader','--hide-scrollbars'] });
  for (const [w, h] of [[1280, 720], [960, 540]]) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.goto('file:///' + path.join(root, 'mv', 'index.html').replace(/\\/g, '/'), { waitUntil: 'load' });
    await p.addStyleTag({ content: '#hint{display:none !important}' });
    await p.waitForTimeout(800);
    const t0 = Date.now();
    for (let i = 0; i < 24; i++) {
      await p.evaluate(s => { window.FILM.freeze(s); }, i / 24);
      await p.screenshot({ path: path.join(root, 'frames', 'bench', 'b' + i + '.jpg'), type: 'jpeg', quality: 88 });
    }
    console.log(w + 'x' + h, ((Date.now() - t0) / 24).toFixed(0) + 'ms/frame');
    await p.close();
  }
  await b.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
