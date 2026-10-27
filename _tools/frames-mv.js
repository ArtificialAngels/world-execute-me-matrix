'use strict';
/* Deterministic frame capture at 24 fps for the full MV. */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

(async () => {
  const root = path.resolve(__dirname, '..');
  const outDir = path.join(root, 'frames', 'seq');
  fs.mkdirSync(outDir, { recursive: true });
  for (const f of fs.readdirSync(outDir)) fs.unlinkSync(path.join(outDir, f));

  const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--hide-scrollbars'] });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///' + path.join(root, 'mv', 'index.html').replace(/\\/g, '/'), { waitUntil: 'load' });
  await p.addStyleTag({ content: '#hint{display:none !important}' });
  await p.evaluate(() => document.body.style.overflow = 'hidden');
  await p.waitForTimeout(1200);

  const FPS = 24;
  const dur = await p.evaluate(() => window.FILM.duration);
  const total = Math.ceil(dur * FPS);
  console.log('frames', total, 'duration', dur);
  const t0 = Date.now();
  for (let i = 0; i < total; i++) {
    const t = i / FPS;
    await p.evaluate(s => { window.FILM.freeze(s); }, t);
    await p.screenshot({ path: path.join(outDir, 'f' + String(i).padStart(5, '0') + '.jpg'), type: 'jpeg', quality: 92 });
    if (i % 250 === 0) console.log('frame', i, '/', total, 'elapsed', ((Date.now() - t0) / 1000).toFixed(0) + 's');
  }
  console.log('done', total, 'errors', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
  await b.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
