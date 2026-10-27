'use strict';
/* shot-xf.js — stills inside cue transitions, one per effect type.
   usage: node _tools/shot-xf.js [tag] [u] */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

(async () => {
  const root = path.resolve(__dirname, '..');
  const tag = process.argv[2] || 'xf';
  const U = process.argv[3] ? +process.argv[3] : 0.5;
  const out = path.join(root, 'frames', tag);
  fs.mkdirSync(out, { recursive: true });

  const b = await chromium.launch({
    channel: 'chrome', headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required', '--hide-scrollbars']
  });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const cdp = await p.context().newCDPSession(p);
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });

  await p.goto('file:///' + path.join(root, 'index.html').replace(/\\/g, '/') + '?still=1', { waitUntil: 'load' });
  await p.waitForTimeout(1400);

  const picks = await p.evaluate(u => {
    const C = EM.Lyrics.cues, seen = {}, out = [];
    for (let i = 1; i < C.length; i++) {
      const t = EM.transitionAt(i);
      if (!t || seen[t.fx]) continue;
      seen[t.fx] = 1;
      out.push({ i, fx: t.fx, t: C[i].t - t.dur * 0.26 + t.dur * u, dur: t.dur, from: t.from, to: t.to });
    }
    /* plus the biggest act change available */
    let act = null;
    for (let i = 1; i < C.length; i++) {
      const t = EM.transitionAt(i);
      if (t && t.from.split('.')[0] !== t.to.split('.')[0]) { act = { i, fx: t.fx, t: C[i].t - t.dur * 0.26 + t.dur * 0.42, dur: t.dur, from: t.from, to: t.to }; break; }
    }
    if (act) out.push(act);
    return out;
  }, U);

  const meta = [];
  for (const q of picks) {
    await p.evaluate(x => { EM.MV.renderAt(x); }, q.t);
    await p.waitForTimeout(420);
    const r = await cdp.send('Page.captureScreenshot', { format: 'png' });
    const name = 'fx' + q.fx + '_' + q.i + '.png';
    fs.writeFileSync(path.join(out, name), Buffer.from(r.data, 'base64'));
    meta.push({ ...q, name });
  }
  fs.writeFileSync(path.join(out, 'meta.json'), JSON.stringify(meta, null, 1));
  console.log('tag=' + tag + ' u=' + U + ' shots=' + meta.length + ' errors=' + (errs.length ? errs.length : 0));
  if (errs.length) console.log(errs.slice(0, 6).join('\n'));
  await b.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
