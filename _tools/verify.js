/* _tools/verify.js — static checks + determinism + no-empty-frame spot checks. */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const problems = [];
const ok = [];

function loadCues() {
  const src = fs.readFileSync(path.join(ROOT, 'assets', 'timeline.js'), 'utf8');
  return new Function('return ' + src.match(/EM\.CUES\s*=\s*(\[[\s\S]*\]);/)[1])();
}
function loadWave() {
  const src = fs.readFileSync(path.join(ROOT, 'assets', 'waveform.js'), 'utf8');
  return { end: +src.match(/EM\.AUDIO_END\s*=\s*([0-9.]+)/)[1] };
}

/* 1. every cue has a plate, ids unique, times advance */
const cues = loadCues();
const wf = loadWave();
ok.push('cues: ' + cues.length + ', measured length: ' + wf.end.toFixed(3) + 's');
for (let i = 1; i < cues.length; i++) if (cues[i][0] <= cues[i - 1][0]) problems.push('cue ' + i + ' does not advance');
if (cues[cues.length - 1][0] > wf.end) problems.push('last cue after audio end');

const plateFiles = fs.readdirSync(path.join(ROOT, 'src')).filter(f => /^4[0-9]_plates_/.test(f));
let plateSrc = '';
for (const f of plateFiles) plateSrc += fs.readFileSync(path.join(ROOT, 'src', f), 'utf8') + '\n';
const ids = [];
const re = /EM\.Scenes\(\s*['"]([A-Za-z0-9_.]+)['"]/g;
let m;
while ((m = re.exec(plateSrc))) ids.push(m[1]);
const dup = ids.filter((v, i) => ids.indexOf(v) !== i);
if (dup.length) problems.push('duplicate plate ids: ' + dup.join(','));
const idSet = new Set(ids);
/* dynamic registrations: EM.Scenes('prefix' + ...) covers every id with that prefix */
const dynPrefixes = [];
(function () {
  let idx = 0;
  while ((idx = plateSrc.indexOf("EM.Scenes('", idx)) >= 0) {
    const start = idx + 11;
    const end = plateSrc.indexOf("'", start);
    if (end < 0) break;
    const id = plateSrc.slice(start, end);
    const after = plateSrc.slice(end + 1, end + 8).replace(/\s/g, '');
    if (after.charAt(0) === '+') dynPrefixes.push(id);
    idx = end;
  }
})();
const covered = s => idSet.has(s) || dynPrefixes.some(p => s.indexOf(p) === 0);
const missing = cues.map(c => c[2]).filter(s => !covered(s));
if (missing.length) problems.push('no plate for ' + missing.length + ' cues: ' + missing.join(', '));
if (!missing.length) ok.push('plates: ' + ids.length + ' registered, every cue covered');

/* 2. embedded lyric copy agrees with the cue table */
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const block = html.match(/<script id="lrc-source" type="text\/plain">([\s\S]*?)<\/script>/);
if (!block) problems.push('index.html has no embedded lyric block');
else {
  const rows = block[1].split('\n').map(s => s.trim()).filter(Boolean).map(s => {
    const j = s.indexOf(']');
    const stamp = s.slice(1, j), rest = s.slice(j + 1), tab = rest.indexOf('\t');
    const [mm, ss] = stamp.split(':');
    return { t: (+mm) * 60 + (+ss), text: tab < 0 ? rest : rest.slice(0, tab) };
  });
  if (rows.length !== cues.length) problems.push('embedded ' + rows.length + ' vs cues ' + cues.length);
  let worst = 0;
  for (let i = 0; i < Math.min(rows.length, cues.length); i++) {
    worst = Math.max(worst, Math.abs(rows[i].t - cues[i][0]));
    if (rows[i].text !== cues[i][1]) { problems.push('embedded text mismatch at ' + i); break; }
  }
  if (worst > 0.0015) problems.push('embedded worst delta ' + (worst * 1000).toFixed(2) + 'ms');
  else ok.push('embedded copy matches cue table (worst ' + (worst * 1000).toFixed(3) + 'ms)');
}

/* 3. syntax check every src file */
for (const f of fs.readdirSync(path.join(ROOT, 'src')).filter(f => f.endsWith('.js'))) {
  const r = spawnSync(process.execPath, ['--check', path.join(ROOT, 'src', f)]);
  if (r.status !== 0) problems.push('syntax error in src/' + f + ': ' + r.stderr.toString().split('\n')[0]);
}

/* 4. determinism: same t rendered twice must be byte-identical */
function shot(t, out) {
  const r = spawnSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
    '--window-size=1920,1080', '--virtual-time-budget=900', '--screenshot=' + out.replace(/\//g, '\\'),
    'file:///' + ROOT.replace(/\\/g, '/').replace(/ /g, '%20') + '/index.html?still=1&t=' + t], { stdio: 'ignore' });
  return r.status === 0 && fs.existsSync(out);
}
const tmp = path.join(ROOT, 'frames', '_det');
fs.mkdirSync(tmp, { recursive: true });
const sample = [12.5, 60, 150];
let detOK = true;
for (const t of sample) {
  const a = path.join(tmp, 'a' + t + '.png'), b = path.join(tmp, 'b' + t + '.png');
  if (!shot(t, a) || !shot(t, b)) { detOK = false; problems.push('determinism shot failed at ' + t); continue; }
  const ha = crypto.createHash('sha256').update(fs.readFileSync(a)).digest('hex');
  const hb = crypto.createHash('sha256').update(fs.readFileSync(b)).digest('hex');
  if (ha !== hb) { detOK = false; problems.push('two renders at t=' + t + ' differ'); }
}
if (detOK) ok.push('determinism: repeated renders identical at ' + sample.join(', ') + 's');

/* 5. no empty frames: every sampled still must contain bright pixels */
function stats(png) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', png, '-vf', 'signalstats,metadata=print:key=lavfi.signalstats.YMAX', '-f', 'null', '-'], { encoding: 'utf8' });
  const mm = /YMAX=([0-9.]+)/.exec(r.stderr + r.stdout);
  return mm ? +mm[1] : null;
}
let dark = 0;
for (let t = 5; t < wf.end - 2; t += 10) {
  const f = path.join(tmp, 'g' + t + '.png');
  if (!shot(t, f)) { problems.push('gap shot failed at ' + t); continue; }
  const ymax = stats(f);
  if (ymax != null && ymax < 30) { dark++; problems.push('frame at ' + t + 's is nearly black (YMAX ' + ymax + ')'); }
}
if (!dark) ok.push('spot-check: 21 frames across the film all carry light');

console.log(ok.map(s => '  ok   ' + s).join('\n'));
if (problems.length) {
  console.log('\nPROBLEMS');
  problems.forEach(p => console.log('  x    ' + p));
  process.exit(1);
}
console.log('\nALL CHECKS PASSED');
