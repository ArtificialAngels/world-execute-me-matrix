'use strict';
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto('file:///' + path.resolve(__dirname, '..', 'film', 'index.html').replace(/\\/g, '/') + '?autostart=1', { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  await page.evaluate(() => { if (window.FILM) window.FILM.play(); });
  await page.waitForTimeout(4500);
  const st = await page.evaluate(() => ({
    t: +window.TEST_AUDIO.currentTime.toFixed(2),
    paused: window.TEST_AUDIO.paused,
    err: window.TEST_AUDIO.error ? window.TEST_AUDIO.error.code : null,
    dur: window.FILM ? +window.FILM.duration.toFixed(2) : null
  }));
  console.log(JSON.stringify(st), 'errors', errs.length ? errs.slice(0,3).join(' | ') : 'none');
  await browser.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
