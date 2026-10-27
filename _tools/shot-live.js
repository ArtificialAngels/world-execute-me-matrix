/* _tools/shot-live.js — the real page as a viewer sees it (HUD, start screen). */
'use strict';
const path = require('path');
const ROOT = path.join(__dirname, '..');
const { chromium } = require('playwright');
const URL = 'file:///' + ROOT.replace(/\\/g, '/') + '/index.html';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(ROOT, 'frames', 'live-start.png') });
  await page.mouse.click(800, 450);
  await page.waitForTimeout(1500);
  await page.evaluate(() => EM.MV.seek(186.0));
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(ROOT, 'frames', 'live-186.png') });
  const st = await page.evaluate(() => ({
    audio: (function () { var a = document.getElementById('audio'); return { rs: a.readyState, t: +a.currentTime.toFixed(2), paused: a.paused, vol: a.volume }; })(),
    cues: EM.Lyrics.cues.length, plates: EM.plates().length, faults: EM.sceneFaultCount()
  }));
  console.log(JSON.stringify(st));
  await browser.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
