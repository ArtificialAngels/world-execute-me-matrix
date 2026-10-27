/* _tools/render.js — render stills through headless Chrome.
   node _tools/render.js --times 0,12.5,60 --out frames/t1
   node _tools/render.js --scenes thm.sine,thm.circle --p 0.5 --out frames/sc
   node _tools/render.js --all-scenes --out frames/all
   node _tools/render.js --sheet --out frames/all     (contact sheet via ffmpeg)
*/
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const W = 1920, H = 1080;

function arg(name, def) {
  const i = process.argv.indexOf('--' + name);
  if (i < 0) return def;
  const v = process.argv[i + 1];
  return v && v.charAt(0) !== '-' ? v : true;
}

function loadTimeline() {
  const src = fs.readFileSync(path.join(ROOT, 'assets', 'timeline.js'), 'utf8');
  const m = src.match(/EM\.CUES\s*=\s*(\[[\s\S]*\]);/);
  return new Function('return ' + m[1])();
}

function shoot(url, out) {
  const r = spawnSync(CHROME, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
    '--window-size=' + W + ',' + H, '--virtual-time-budget=900',
    '--screenshot=' + out.replace(/\//g, '\\'), url
  ], { stdio: 'ignore' });
  const good = r.status === 0 && fs.existsSync(out);
  if (!good) console.error('  chrome exit ' + r.status + ' :: ' + (r.stderr || '').slice(0, 300) + ' :: ' + url);
  return good;
}

function url(t, extra) {
  return 'file:///' + ROOT.replace(/\\/g, '/').replace(/ /g, '%20') +
    '/index.html?still=1&t=' + t + (extra || '');
}

function sheet(dir) {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.png')).sort();
  if (!files.length) return;
  const cols = 5;
  const args = [];
  files.forEach(f => args.push('-i', path.join(dir, f)));
  const fc = files.map((f, i) => '[' + i + ':v]scale=384:216[s' + i + ']').join(';') + ';' +
    files.map((f, i) => '[s' + i + ']').join('') + 'xstack=inputs=' + files.length + ':layout=' +
    files.map((f, i) => (i % cols) * 384 + '_' + Math.floor(i / cols) * 216).join('|') + ':fill=black';
  const out = path.join(dir, 'sheet.png');
  const r = spawnSync('ffmpeg', ['-y', '-v', 'error'].concat(args).concat(['-filter_complex', fc, '-frames:v', '1', out]));
  console.log(r.status === 0 ? 'sheet: ' + out : 'sheet failed');
}

function main() {
  const out = path.resolve(arg('out', path.join(ROOT, 'frames', 'review')));
  fs.mkdirSync(out, { recursive: true });
  const p = parseFloat(arg('p', '0.5'));
  const scenes = arg('scenes', null);
  const times = arg('times', null);
  const all = arg('all-scenes', false);
  const doSheet = arg('sheet', false);
  const list = [];
  if (doSheet && !arg('scenes', null) && !arg('times', null) && !arg('all-scenes', false) && !arg('prefix', null)) { sheet(out); return; }

  if (all) {
    const cues = loadTimeline();
    const seen = new Set();
    for (const c of cues) {
      if (seen.has(c[2])) continue;
      seen.add(c[2]);
      list.push({ name: c[2], t: c[0], text: c[1] });
    }
  } else if (scenes) {
    for (const s of String(scenes).split(',')) list.push({ name: s, t: parseFloat(arg('t', '40')), text: '' });
  } else if (arg('all-cues', false)) {
    for (const c of loadTimeline()) list.push({ name: c[2], t: c[0], text: c[1] });
  } else if (arg('prefix', null)) {
    const pre = String(arg('prefix'));
    for (const c of loadTimeline()) if (c[2].indexOf(pre) === 0) list.push({ name: c[2], t: c[0], text: c[1] });
  } else if (times) {
    for (const s of String(times).split(',')) list.push({ name: 't' + s, t: parseFloat(s), text: '' });
  } else {
    console.error('need --times / --scenes / --all-scenes'); process.exit(1);
  }

  let ok = 0, fail = 0;
  const indexed = arg('indexed', false);
  let seq = 0;
  for (const it of list) {
    const base = indexed ? (String(seq++).padStart(3, '0') + '_' + it.name) : it.name;
    const file = path.join(out, base + '.png');
    const txt = it.text || String(arg('text', '') || '');
    const extra = (all || scenes || arg('prefix', null)) ? '&scene=' + encodeURIComponent(it.name) + '&p=' + p + '&text=' + encodeURIComponent(txt) : '';
    const good = shoot(url(it.t, extra), file);
    if (good) { ok++; } else { fail++; console.error('  failed ' + it.name); }
  }
  console.log('rendered ' + ok + ' ok, ' + fail + ' failed -> ' + out);
  if (doSheet) sheet(out);
}
main();
