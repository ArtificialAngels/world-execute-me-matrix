'use strict';
/* shot-xf-anim.js — render one cue transition as a PNG sequence + 12fps GIF.
   usage: node _tools/shot-xf-anim.js <cueIndex> [tag] */
const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');
const { chromium } = require('playwright');

(async () => {
  const root = path.resolve(__dirname, '..');
  const idx = +(process.argv[2] || 33);
  const tag = process.argv[3] || ('xanim' + idx);
  const out = path.join(root, 'frames', tag);
  fs.mkdirSync(out, { recursive: true });

  const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--hide-scrollbars'] });
  const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  const cdp = await p.context().newCDPSession(p);
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///' + path.join(root, 'index.html').replace(/\\/g, '/') + '?still=1', { waitUntil: 'load' });
  await p.waitForTimeout(1300);

  const info = await p.evaluate(i => {
    const C = EM.Lyrics.cues, t = EM.transitionAt(i);
    return { t: C[i].t, fx: t.fx, dur: t.dur, from: t.from, to: t.to };
  }, idx);
  const start = info.t - info.dur * 0.26;
  const n = Math.max(6, Math.round(info.dur * 24));
  for (let k = 0; k < n; k++) {
    const t = start + (info.dur * (k + 0.5)) / n;
    await p.evaluate(x => { EM.MV.renderAt(x); }, t);
    await p.waitForTimeout(120);
    const r = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(out, 'f' + String(k).padStart(3, '0') + '.png'), Buffer.from(r.data, 'base64'));
  }
  const gif = path.join(out, 'xf.gif');
  spawnSync('ffmpeg', ['-v', 'error', '-y', '-framerate', '24', '-i', path.join(out, 'f%03d.png'),
    '-vf', 'scale=960:540:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer',
    '-loop', '0', gif], { stdio: 'ignore' });
  console.log(JSON.stringify({ ...info, frames: n, gif: fs.existsSync(gif) }), 'errors', errs.length ? errs.slice(0, 3) : 0);
  await b.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
