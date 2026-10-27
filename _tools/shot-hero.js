'use strict';
/* shot-hero.js — 1920x1080 hero stills + the normal (non-still) opening screen. */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

(async () => {
  const root = path.resolve(__dirname, '..');
  const out = path.join(root, 'frames', 'hero');
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({
    channel: 'chrome', headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required', '--hide-scrollbars']
  });

  /* 1. the opening screen, as a viewer sees it (start overlay, hud, transport) */
  const p1 = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await p1.goto('file:///' + path.join(root, 'index.html').replace(/\\/g, '/'), { waitUntil: 'load' });
  await p1.waitForTimeout(2000);
  await p1.screenshot({ path: path.join(out, 'opening.png') });
  await p1.close();

  /* 2. hero stills of the film */
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await p.goto('file:///' + path.join(root, 'index.html').replace(/\\/g, '/') + '?still=1', { waitUntil: 'load' });
  await p.waitForTimeout(1600);
  for (const t of [30, 60, 75, 120, 135, 150, 175, 206]) {
    await p.evaluate(x => { EM.MV.renderAt(x); }, t);
    await p.waitForTimeout(450);
    await p.screenshot({ path: path.join(out, 't' + t + '.png') });
  }
  console.log('hero stills done');
  await b.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
