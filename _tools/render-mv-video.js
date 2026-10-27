'use strict';
/* Render the full MV to WEBM by real-time recording, then report the audio offset. */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

(async () => {
  const root = path.resolve(__dirname, '..');
  const outDir = path.join(root, 'frames', 'rec');
  fs.mkdirSync(outDir, { recursive: true });
  const t0 = Date.now();
  const ctx = await chromium.launchPersistentContext(path.join(root, 'frames', '_recprofile'), {
    channel: 'chrome',
    headless: true,
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: outDir, size: { width: 1920, height: 1080 } },
    args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=angle', '--use-angle=swiftshader', '--hide-scrollbars']
  });
  let page = ctx.pages()[0] || (await ctx.newPage());
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto('file:///' + path.join(root, 'mv', 'index.html').replace(/\\/g, '/') + '?autostart=1', { waitUntil: 'load' });

  let audioStartAbs = null;
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(250);
    const ct = await page.evaluate(() => (window.TEST_AUDIO ? window.TEST_AUDIO.currentTime : 0));
    if (ct > 0.3) { audioStartAbs = Date.now() - ct * 1000; break; }
  }
  const offset = (audioStartAbs - t0) / 1000;
  console.log('audioOffset', offset.toFixed(3), 'errors', errs.slice(0, 2).join(' | '));

  for (let i = 0; i < 300; i++) {
    await page.waitForTimeout(1000);
    const ct = await page.evaluate(() => (window.TEST_AUDIO ? window.TEST_AUDIO.currentTime : 0));
    if (ct >= 211.95) break;
  }
  await page.waitForTimeout(600);
  const video = page.video();
  await ctx.close();
  const p = await video.path();
  console.log('WEBM', p);
  fs.writeFileSync(path.join(outDir, 'meta.json'), JSON.stringify({ offset }));
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
