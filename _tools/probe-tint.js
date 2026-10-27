'use strict';
/* probe-tint.js — compare stage tint recipes for the paper theme. */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const RECIPES = [
  ['p1', "#stage::after{content:'';position:absolute;inset:0;pointer-events:none;z-index:1;background:#176ad0;mix-blend-mode:color;opacity:0.60}#stage::before{content:none}"],
  ['p2', "#stage::after{content:'';position:absolute;inset:0;pointer-events:none;z-index:1;background:#176ad0;mix-blend-mode:color;opacity:0.60}#stage::before{content:'';position:absolute;inset:0;pointer-events:none;z-index:1;background:rgba(10,50,100,0.10);mix-blend-mode:multiply}"],
  ['p3', "#stage::after{content:'';position:absolute;inset:0;pointer-events:none;z-index:1;background:#1b72d8;mix-blend-mode:color;opacity:0.45}#stage::before{content:'';position:absolute;inset:0;pointer-events:none;z-index:1;background:rgba(255,255,255,0.20);mix-blend-mode:screen}"],
  ['p4', "#stage::after{content:'';position:absolute;inset:0;pointer-events:none;z-index:1;background:#1259b0;mix-blend-mode:color;opacity:0.78}#stage::before{content:'';position:absolute;inset:0;pointer-events:none;z-index:1;background:rgba(235,242,248,0.18);mix-blend-mode:screen}"]
];

(async () => {
  const root = path.resolve(__dirname, '..');
  const out = path.join(root, 'frames', 'tint');
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--hide-scrollbars'] });
  const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  const cdp = await p.context().newCDPSession(p);
  await p.goto('file:///' + path.join(root, 'index.html').replace(/\\/g, '/') + '?still=1', { waitUntil: 'load' });
  await p.waitForTimeout(1500);
  for (const t of [30, 150]) {
    for (const [name, css] of RECIPES) {
      await p.evaluate(({ css, t }) => {
        EM.MV.renderAt(t);
        let st = document.getElementById('probe-style');
        if (!st) { st = document.createElement('style'); st.id = 'probe-style'; document.head.appendChild(st); }
        st.textContent = css;
      }, { css, t });
      await p.waitForTimeout(280);
      const r = await cdp.send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(out, 't' + t + '_' + name + '.png'), Buffer.from(r.data, 'base64'));
    }
  }
  console.log('done');
  await b.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
