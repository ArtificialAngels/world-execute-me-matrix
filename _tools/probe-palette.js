'use strict';
/* probe-palette.js — try filter chains for the paper/blue skin. */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const CHAINS = [
  'invert(1) grayscale(1) sepia(1) hue-rotate(192deg) saturate(3.2) brightness(0.84) contrast(1.12)',
  'invert(1) grayscale(1) sepia(1) hue-rotate(205deg) saturate(2.8) brightness(0.86) contrast(1.15)',
  'invert(1) grayscale(1) sepia(1) hue-rotate(185deg) saturate(3.6) brightness(0.88) contrast(1.08)',
  'invert(1) grayscale(1) sepia(1) hue-rotate(195deg) saturate(4) brightness(0.90)'
];

(async () => {
  const root = path.resolve(__dirname, '..');
  const out = path.join(root, 'frames', 'palette');
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--hide-scrollbars'] });
  const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  const cdp = await p.context().newCDPSession(p);
  await p.goto('file:///' + path.join(root, 'index.html').replace(/\\/g, '/') + '?still=1', { waitUntil: 'load' });
  await p.waitForTimeout(1500);

  for (const t of [75, 150]) {
    for (let k = 0; k < CHAINS.length; k++) {
      await p.evaluate(x => { EM.MV.renderAt(x); }, t);
      await p.evaluate((chain) => {
        const v = document.getElementById('view');
        const m = document.getElementById('matrix');
        const f = document.getElementById('flies');
        v.style.filter = chain;
        if (m) m.style.filter = chain.replace('sepia(0.9)', 'sepia(1)').replace('sepia(0.75)', 'sepia(1)').replace('sepia(0.6)', 'sepia(1)');
        if (f) f.style.filter = chain.replace('sepia(0.9)', 'sepia(1)').replace('sepia(0.75)', 'sepia(1)').replace('sepia(0.6)', 'sepia(1)');
      }, CHAINS[k]);
      await p.waitForTimeout(300);
      const r = await cdp.send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(out, 't' + t + '_f' + k + '.png'), Buffer.from(r.data, 'base64'));
    }
  }
  console.log('done');
  await b.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
