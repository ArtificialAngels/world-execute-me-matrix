'use strict';
/* Deterministic 24 fps capture of the full MV at 1280x720. */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
(async () => {
  const root = path.resolve(__dirname, '..');
  const outDir = path.join(root, 'frames', 'seq');
  fs.mkdirSync(outDir, { recursive: true });
  const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-gl=angle','--use-angle=swiftshader','--hide-scrollbars'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///' + path.join(root, 'mv', 'index.html').replace(/\\/g, '/'), { waitUntil: 'load' });
  await p.addStyleTag({ content: '#hint{display:none !important}' });
  await p.waitForTimeout(1000);
  const FPS = 24;
  const dur = await p.evaluate(() => window.FILM.duration);
  const total = Math.ceil(dur * FPS);
  console.log('start total', total);
  const t0 = Date.now();
  for (let i = 0; i < total; i++) {
    const f = path.join(outDir, 'f' + String(i).padStart(5, '0') + '.jpg');
    if (fs.existsSync(f) && fs.statSync(f).size > 2000) continue;
    await p.evaluate(s => { window.FILM.freeze(s); }, i / FPS);
    await p.screenshot({ path: f, type: 'jpeg', quality: 90 });
    if (i % 250 === 0) console.log('frame', i, 'elapsed', ((Date.now() - t0) / 1000).toFixed(0) + 's');
  }
  console.log('done', total, 'errors', errs.length ? errs.slice(0, 2).join(' | ') : 'none');
  await b.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
