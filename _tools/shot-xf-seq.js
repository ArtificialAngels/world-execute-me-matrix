'use strict';
/* shot-xf-seq.js — one transition, sampled across its window.
   usage: node _tools/shot-xf-seq.js <cueIndex> [tag] */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

(async () => {
  const root = path.resolve(__dirname, '..');
  const idx = +(process.argv[2] || 60);
  const tag = process.argv[3] || ('seq' + idx);
  const out = path.join(root, 'frames', tag);
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--hide-scrollbars'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const cdp = await p.context().newCDPSession(p);
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///' + path.join(root, 'index.html').replace(/\\/g, '/') + '?still=1', { waitUntil: 'load' });
  await p.waitForTimeout(1300);
  const info = await p.evaluate(i => {
    const C = EM.Lyrics.cues, t = EM.transitionAt(i);
    return { t: C[i].t, fx: t.fx, dur: t.dur, from: t.from, to: t.to };
  }, idx);
  const us = [0.08, 0.3, 0.5, 0.7, 0.92];
  for (let k = 0; k < us.length; k++) {
    const t = info.t - info.dur * 0.26 + info.dur * us[k];
    await p.evaluate(x => { EM.MV.renderAt(x); }, t);
    await p.waitForTimeout(360);
    const r = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(out, 'u' + String(k) + '_' + us[k] + '.png'), Buffer.from(r.data, 'base64'));
  }
  console.log(JSON.stringify(info), 'errors', errs.length ? errs.slice(0, 3) : 0);
  await b.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
