/* _tools/render-pw.js — batch stills through one real browser (fast).
   node _tools/render-pw.js --all-cues --p 0.55 --out frames/all
   node _tools/render-pw.js --scenes a,b --p 0.5 --t 40 --out frames/x
   node _tools/render-pw.js --times 0,30,60 --out frames/y
   node _tools/render-pw.js --sheet --out frames/all
*/
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const URL = 'file:///' + ROOT.replace(/\\/g, '/') + '/index.html';

function arg(name, def) {
  const i = process.argv.indexOf('--' + name);
  if (i < 0) return def;
  const v = process.argv[i + 1];
  return v && v.charAt(0) !== '-' ? v : true;
}
function loadTimeline() {
  const src = fs.readFileSync(path.join(ROOT, 'assets', 'timeline.js'), 'utf8');
  return new Function('return ' + src.match(/EM\.CUES\s*=\s*(\[[\s\S]*\]);/)[1])();
}
function sheet(dir) {
  const files = fs.readdirSync(dir).filter(f => /^\d+_.*\.png$/.test(f) || f.endsWith('.png')).sort();
  if (!files.length) return;
  const cols = 5;
  const args = [];
  files.forEach(f => args.push('-i', path.join(dir, f)));
  const fc = files.map((f, i) => '[' + i + ':v]scale=384:216[s' + i + ']').join(';') + ';' +
    files.map((f, i) => '[s' + i + ']').join('') + 'xstack=inputs=' + files.length + ':layout=' +
    files.map((f, i) => (i % cols) * 384 + '_' + Math.floor(i / cols) * 216).join('|') + ':fill=black';
  const out = path.join(dir, 'sheet.png');
  const r = spawnSync('ffmpeg', ['-y', '-v', 'error'].concat(args).concat(['-filter_complex', fc, '-frames:v', '1', out]), { stdio: 'inherit' });
  console.log(r.status === 0 ? 'sheet: ' + out : 'sheet failed');
}

(async () => {
  const out = path.resolve(arg('out', path.join(ROOT, 'frames', 'review')));
  fs.mkdirSync(out, { recursive: true });
  if (arg('sheet', false) && !arg('scenes', null) && !arg('times', null) && !arg('all-cues', false)) { sheet(out); return; }

  const p = parseFloat(arg('p', '0.55'));
  const list = [];
  if (arg('all-cues', false)) {
    for (const c of loadTimeline()) list.push({ scene: c[2], t: c[0], text: c[1] });
  } else if (arg('scenes', null)) {
    for (const s of String(arg('scenes')).split(',')) list.push({ scene: s, t: parseFloat(arg('t', '40')), text: String(arg('text', '')) });
  } else if (arg('times', null)) {
    for (const s of String(arg('times')).split(',')) list.push({ scene: null, t: parseFloat(s), text: '' });
  } else if (arg('shots', null)) {
    const arr = JSON.parse(fs.readFileSync(path.resolve(String(arg('shots'))), 'utf8'));
    for (const s of arr) list.push({ scene: s.scene, t: s.t, p: s.p, text: s.text || '', name: s.name });
  } else { console.error('need --all-cues / --scenes / --times / --shots / --sheet'); process.exit(1); }

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(URL + '?still=1&t=0', { waitUntil: 'load' });
  await page.waitForTimeout(400);
  const view = page.locator('#view');
  let i = 0;
  for (const it of list) {
    const pp = it.p == null ? p : it.p;
    if (it.scene) await page.evaluate(a => EM.MV.renderScene(a.scene, a.t, a.p, a.text), { scene: it.scene, t: it.t + pp, p: pp, text: it.text });
    else await page.evaluate(t => EM.MV.renderAt(t), it.t);
    await page.waitForTimeout(40);
    const name = (String(i).padStart(3, '0') + '_' + (it.name || it.scene || ('t' + it.t))) + '.png';
    await view.screenshot({ path: path.join(out, name) });
    i++;
  }
  console.log('rendered ' + i + ' -> ' + out + (errors.length ? ('  ERRORS: ' + errors.slice(0, 3).join(' | ')) : ''));
  await browser.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(2); });
