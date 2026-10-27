'use strict';
/* shot-objects.js — 1920 stills of the lyric-object moments + 2x4 sheet. */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const TIMES = [74.9, 76.5, 78.4, 80.0, 82.0, 83.7, 85.8, 126.3];

(async () => {
  const root = path.resolve(__dirname, '..');
  const out = path.join(root, 'frames', 'objects-hero');
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--hide-scrollbars'] });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  const cdp = await p.context().newCDPSession(p);
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///' + path.join(root, 'index.html').replace(/\\/g, '/') + '?still=1', { waitUntil: 'load' });
  await p.waitForTimeout(2200);
  for (let i = 0; i < TIMES.length; i++) {
    await p.evaluate(t => { EM.MV.renderAt(t); }, TIMES[i]);
    await p.waitForTimeout(450);
    const r = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(out, 'o' + i + '.png'), Buffer.from(r.data, 'base64'));
  }
  const ready = await p.evaluate(() => EM.Objects ? EM.Objects.ready() : false);
  console.log('objects loaded:', ready, 'errors:', errs.length ? errs.slice(0, 3) : 'none');
  await b.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
