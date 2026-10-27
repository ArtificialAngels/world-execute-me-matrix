'use strict';
/* render-mp4.js — deterministic frame export of the MV.
   usage: node _tools/render-mp4.js [fps] [outDir]
   Each frame calls EM.MV.renderAt(t), waits two rAFs so the rain/fireflies settle
   on that t, then captures the full page (CSS skin included). Resumable: existing
   frames are skipped. */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

(async () => {
  const root = path.resolve(__dirname, '..');
  const fps = +(process.argv[2] || 24);
  const out = path.join(root, process.argv[3] || 'frames/video');
  const max = +(process.argv[4] || 0);
  fs.mkdirSync(out, { recursive: true });

  const b = await chromium.launch({
    channel: 'chrome', headless: true,
    args: ['--hide-scrollbars', '--force-device-scale-factor=1']
  });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const cdp = await p.context().newCDPSession(p);
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });

  await p.goto('file:///' + path.join(root, 'index.html').replace(/\\/g, '/') + '?still=1', { waitUntil: 'load' });
  await p.waitForTimeout(2600);
  const end = await p.evaluate(() => EM.MV.end());
  const n = Math.ceil(end * fps);
  const total = max ? Math.min(n, max) : n;
  console.log('fps=' + fps + ' duration=' + end.toFixed(3) + 's frames=' + n + (max ? ' (test ' + total + ')' : '') + ' out=' + out);

  const t0 = Date.now();
  let written = 0;
  for (let i = 0; i < total; i++) {
    const f = path.join(out, 'f' + String(i).padStart(5, '0') + '.png');
    if (fs.existsSync(f)) continue;
    const t = Math.min(end, i / fps);
    await p.evaluate(x => { EM.MV.renderAt(x); }, t);
    await p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    const r = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(f, Buffer.from(r.data, 'base64'));
    written++;
    if (written % 100 === 0) {
      const el = (Date.now() - t0) / 1000;
      const rate = written / el;
      console.log('  frame ' + i + '/' + total + '  ' + rate.toFixed(1) + ' fps render  eta ' + Math.round((total - i) / rate) + 's');
    }
  }
  console.log('done: wrote ' + written + ' frames in ' + ((Date.now() - t0) / 1000).toFixed(0) + 's  errors=' + (errs.length ? errs.slice(0, 3) : 0));
  await b.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
