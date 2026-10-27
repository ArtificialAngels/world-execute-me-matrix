'use strict';
/* shot-mx.js — stills of the matrix build at fixed film times (no point light,
   no shadow play). Usage: node _tools/shot-mx.js [tag] [times,comma,sep] */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

(async () => {
  const root = path.resolve(__dirname, '..');
  const tag = process.argv[2] || 'mx';
  const times = (process.argv[3] || '8,30,60,75,105,120,150,175,190,206').split(',').map(Number);
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
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

  await p.goto('file:///' + path.join(root, 'index.html').replace(/\\/g, '/') + '?still=1', { waitUntil: 'load' });
  await p.waitForTimeout(1800);
  const boot = await p.evaluate(() => !!(window.EM && EM.MV && EM.MV.renderAt));
  if (!boot) { console.error('EM.MV not available'); await b.close(); process.exit(1); }

  for (const t of times) {
    await p.evaluate(x => { EM.MV.renderAt(x); }, t);
    await p.waitForTimeout(650);
    const r = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(out, 't' + String(t).replace('.', '_') + '.png'), Buffer.from(r.data, 'base64'));
  }
  console.log('tag=' + tag + ' times=' + times.join(',') + ' errors=' + (errs.length ? errs.length : 0));
  if (errs.length) console.log(errs.slice(0, 8).join('\n'));
  await b.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
