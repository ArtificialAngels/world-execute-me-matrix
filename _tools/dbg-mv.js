'use strict';
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///' + path.resolve(__dirname, '..', 'mv', 'index.html').replace(/\\/g, '/'), { waitUntil: 'load' });
  await p.waitForTimeout(1500);
  const info = await p.evaluate(() => ({ dur: window.FILM.duration, hasCues: !!(window.FILM_CUES && window.FILM_CUES.cues && window.FILM_CUES.cues.length), n: window.FILM_CUES && window.FILM_CUES.cues.length, t: window.__lastT }));
  await p.evaluate(() => { window.FILM.freeze(150); });
  await p.waitForTimeout(400);
  const after = await p.evaluate(() => ({ t: window.__lastT, audio: window.TEST_AUDIO && window.TEST_AUDIO.currentTime }));
  console.log(JSON.stringify(info), JSON.stringify(after));
  console.log('errors:', errs.length ? errs.slice(0,4).join(' | ') : 'none');
  await b.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
