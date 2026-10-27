'use strict';
/* Usage: node _tools/shot-times.js 39 76 110 ...   (writes frames/cur/<t>.png at 1280x720)
   Optional env: PREFIX, VIEW (WxH), SUB (subdir) */
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const times = process.argv.slice(2).map(Number).filter(n => !isNaN(n));
  if (!times.length) { console.error('no times'); process.exit(1); }
  const prefix = process.env.PREFIX || '';
  const sub = process.env.SUB || 'cur';
  const [vw, vh] = (process.env.VIEW || '1280x720').split('x').map(Number);
  const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: vw, height: vh } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto('file:///' + path.resolve(__dirname, '..', 'film', 'index.html').replace(/\\/g, '/'), { waitUntil: 'load' });
  await p.addStyleTag({ content: '#hint{display:none !important}' });
  await p.waitForTimeout(1300);
  for (const t of times) {
    await p.evaluate(s => { window.FILM.freeze(s); }, t);
    await p.waitForTimeout(220);
    await p.screenshot({ path: path.resolve(__dirname, '..', 'frames', sub, prefix + String(t).replace('.', '_') + '.png') });
  }
  console.log('shots', times.length, 'errors:', errs.length ? errs.slice(0, 5).join(' | ') : 'none');
  await b.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
