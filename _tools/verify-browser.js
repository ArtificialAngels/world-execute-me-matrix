/* _tools/verify-browser.js — the real checks, in a real browser.
   requires Playwright (system Chrome channel). run:
     NODE_PATH=<npx node_modules> node _tools/verify-browser.js
*/
'use strict';
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const ROOT = path.join(__dirname, '..');
const { chromium } = require('playwright');
const URL = 'file:///' + ROOT.replace(/\\/g, '/') + '/index.html';

function sha(s) { return crypto.createHash('sha256').update(s).digest('hex').slice(0, 16); }

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)); });
  page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
  await page.goto(URL + '?still=1&t=0', { waitUntil: 'load' });
  await page.waitForTimeout(1200);

  const info = await page.evaluate(() => ({
    cues: EM.Lyrics.cues.length,
    plates: EM.plates().length,
    end: EM.AUDIO_END,
    selftest: EM.selftest ? EM.selftest.problems : ['no selftest'],
    missing: EM.selftest ? EM.selftest.missingPlates : []
  }));

  /* determinism + seek safety: hash pixels of the canvas for repeated / shuffled times */
  const times = [12.5, 60, 150, 177.4, 206];
  const hashAt = (t) => page.evaluate((tt) => {
    EM.MV.renderAt(tt);
    var c = document.getElementById('view');
    var s = document.createElement('canvas'); s.width = 240; s.height = 135;
    var x = s.getContext('2d'); x.drawImage(c, 0, 0, 240, 135);
    return x.getImageData(0, 0, 240, 135).data.join(',');
  }, t);

  const first = {};
  for (const t of times) first[t] = sha(await hashAt(t));
  let same = true;
  for (const t of times) if (sha(await hashAt(t)) !== first[t]) { same = false; errors.push('repeat render differs at ' + t); }
  for (const t of [150, 12.5, 206, 60, 177.4, 12.5, 60]) await hashAt(t);
  for (const t of times) if (sha(await hashAt(t)) !== first[t]) { same = false; errors.push('shuffled seek differs at ' + t); }

  /* every cue draws something: sample ink coverage at 55% of each cue */
  const coverage = await page.evaluate(() => {
    var out = [];
    var cues = EM.Lyrics.cues;
    var c = document.getElementById('view');
    var s = document.createElement('canvas'); s.width = 160; s.height = 90;
    var x = s.getContext('2d');
    for (var i = 0; i < cues.length; i++) {
      var t = cues[i].t + cues[i].dur * 0.55;
      EM.MV.renderAt(t);
      x.drawImage(c, 0, 0, 160, 90);
      var d = x.getImageData(0, 0, 160, 90).data;
      var sum = 0, mx = 0;
      for (var k = 0; k < d.length; k += 4) {
        var v = (d[k] * 0.3 + d[k + 1] * 0.5 + d[k + 2] * 0.2);
        sum += v; if (v > mx) mx = v;
      }
      out.push({ scene: cues[i].scene, mean: +(sum / (160 * 90)).toFixed(2), max: Math.round(mx), t: +t.toFixed(2) });
    }
    return out;
  });
  const dark = coverage.filter(c => c.max < 40 || c.mean < 4);
  const faults = await page.evaluate(() => EM.sceneFaults());

  /* fps, with the audio actually playing */
  await page.goto(URL + '?t=60', { waitUntil: 'load' });
  await page.waitForTimeout(600);
  await page.mouse.click(960, 540);
  await page.waitForTimeout(1200);
  const fps = await page.evaluate(() => new Promise(res => {
    var n = 0, t0 = performance.now();
    function f() { n++; if (performance.now() - t0 < 2500) requestAnimationFrame(f); else res(+(n / ((performance.now() - t0) / 1000)).toFixed(1)); }
    requestAnimationFrame(f);
  }));
  const audio = await page.evaluate(() => {
    var a = document.getElementById('audio');
    return { err: a.error ? a.error.code : null, rs: a.readyState, dur: +(a.duration || 0).toFixed(2), t: +(a.currentTime || 0).toFixed(2), paused: a.paused };
  });

  console.log('cues ' + info.cues + ' | plates ' + info.plates + ' | end ' + info.end.toFixed(3));
  console.log('selftest problems: ' + (info.selftest.length ? info.selftest.join('; ') : 'none'));
  console.log('determinism + shuffle: ' + (same ? 'ok' : 'FAILED'));
  console.log('dark/empty cues: ' + (dark.length ? dark.map(d => d.scene + ' (mean ' + d.mean + ', max ' + d.max + ')').join(', ') : 'none'));
  console.log('plate faults: ' + (faults.length ? faults.join(' | ') : 'none'));
  console.log('fps: ' + fps + ' | audio: ' + JSON.stringify(audio));
  console.log('console errors: ' + (errors.length ? errors.slice(0, 8).join(' | ') : 'none'));
  fs.writeFileSync(path.join(ROOT, 'frames', 'verify-report.json'), JSON.stringify({ info, same, dark, faults, fps, audio, errors }, null, 1));
  await browser.close();
  if (!same || dark.length || faults.length || errors.length || info.missing.length) process.exit(1);
})().catch(e => { console.error('PROBE FAILED', e.message); process.exit(2); });
