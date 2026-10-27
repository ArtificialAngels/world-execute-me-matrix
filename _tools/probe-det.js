'use strict';
/* probe-det.js — isolate what differs between two renders at the same t */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { chromium } = require('playwright');

const h = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 12);

(async () => {
  const root = path.resolve(__dirname, '..');
  const url = 'file:///' + path.join(root, 'index.html').replace(/\\/g, '/') + '?still=1&t=60';
  const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--hide-scrollbars'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  await p.goto(url, { waitUntil: 'load' });
  await p.waitForTimeout(1500);
  const r = await p.evaluate(async () => {
    function snap() { return EM.MV.snapshotAt(60); }
    const a = snap(); await new Promise(r => setTimeout(r, 350)); const c = snap();
    const out = { filmSame: a === c, filmA: a.length };
    const mx = document.getElementById('matrix'), fl = document.getElementById('flies');
    if (mx) out.matrixPx = mx.getContext('2d').getImageData(0, 0, 40, 40).data.join(',');
    if (fl) out.fliesPx = fl.getContext('2d').getImageData(0, 0, 40, 40).data.join(',');
    return out;
  });
  // full page captures in the same page, 400ms apart
  const s1 = await p.screenshot();
  await p.waitForTimeout(400);
  const s2 = await p.screenshot();
  fs.writeFileSync(path.join(root, 'frames', '_det', 'p1.png'), s1);
  fs.writeFileSync(path.join(root, 'frames', '_det', 'p2.png'), s2);
  console.log(JSON.stringify({ ...r, pageSame: h(s1) === h(s2), hashes: [h(s1), h(s2)] }));
  await b.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
