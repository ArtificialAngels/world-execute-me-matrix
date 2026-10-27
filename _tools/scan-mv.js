'use strict';
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-gl=angle','--use-angle=swiftshader'] });
  const p = await b.newPage({ viewport: { width: 640, height: 360 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///' + path.resolve(__dirname, '..', 'mv', 'index.html').replace(/\\/g, '/'), { waitUntil: 'load' });
  await p.addStyleTag({ content: '#hint{display:none !important}' });
  await p.waitForTimeout(1500);
  const out = [];
  for (let t = 0; t <= 211.9; t += 4) {
    await p.evaluate(s => { window.FILM.freeze(s); }, t);
    await p.waitForTimeout(70);
    const stat = await p.evaluate(() => {
      const c = document.getElementById('art');
      const x = c.getContext('2d');
      const d = x.getImageData(0, 0, c.width, c.height).data;
      let sum = 0, dark = 0, bright = 0;
      for (let i = 0; i < d.length; i += 4 * 97) { const v = (d[i] + d[i+1] + d[i+2]) / 3; sum += v; if (v < 20) dark++; if (v > 235) bright++; }
      const n = Math.ceil(d.length / (4 * 97));
      return { mean: Math.round(sum / n), dark: +(dark / n).toFixed(2), bright: +(bright / n).toFixed(2) };
    });
    out.push([t, stat.mean, stat.dark, stat.bright]);
  }
  const bad = out.filter(r => (r[0] < 209 && (r[2] > 0.97 || (r[1] > 246 && r[3] > 0.97))));
  console.log('frames', out.length, 'suspicious', bad.length ? JSON.stringify(bad) : 'none');
  console.log('errors:', errs.length ? errs.slice(0,3).join(' | ') : 'none');
  await b.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
