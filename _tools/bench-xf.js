'use strict';
/* bench-xf.js — frame rate while transitions are firing (plays ~7s across boundaries). */
const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const root = path.resolve(__dirname, '..');
  const b = await chromium.launch({
    channel: 'chrome', headless: true,
    args: ['--autoplay-policy=no-user-gesture-required', '--hide-scrollbars']
  });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const startT = +(process.argv[2] || 56);
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///' + path.join(root, 'index.html').replace(/\\/g, '/') + '?autostart=1', { waitUntil: 'load' });
  await p.waitForTimeout(2600);
  const out = await p.evaluate(async () => {
    const a = document.getElementById('audio');
    try { a.currentTime = startT; } catch (e) {}
    a.play().catch(() => {});
    return await new Promise(res => {
      let n = 0, last = performance.now(), t0 = last; const gaps = [];
      function tick(ts) {
        n++; if (n > 1) gaps.push(ts - last); last = ts;
        if (ts - t0 < 7000) requestAnimationFrame(tick);
        else {
          gaps.sort((x, y) => x - y);
          const avg = gaps.reduce((s, x) => s + x, 0) / gaps.length;
          res({
            frames: n, fps: +(1000 / avg).toFixed(1),
            p50: +gaps[Math.floor(gaps.length * 0.5)].toFixed(1),
            p95: +gaps[Math.floor(gaps.length * 0.95)].toFixed(1)
          });
        }
      }
      requestAnimationFrame(tick);
    });
  });
  console.log('BENCH', JSON.stringify(out), 'errors:', errs.length ? errs.slice(0, 3) : 'none');
  await b.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
