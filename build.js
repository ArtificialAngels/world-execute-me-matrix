/* build.js — assets -> data -> index.html, then verify the generated files agree. */
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const ROOT = __dirname;

function step(n, title) { console.log('\n' + '='.repeat(72) + '\n  ' + n + '. ' + title + '\n' + '='.repeat(72)); }
function run(file) {
  if (!fs.existsSync(path.join(ROOT, '_build', file))) { console.log('  (skip, missing _build/' + file + ')'); return; }
  const r = spawnSync(process.execPath, [path.join(ROOT, '_build', file)], { stdio: 'inherit' });
  if (r.status !== 0) { console.error('FAILED: ' + file); process.exit(r.status || 1); }
}

step(1, 'audio -> assets/onsets.js + assets/waveform.js');
run('parse-mp3.js');
step(2, 'cue sheet -> assets/timeline.js + assets/lrc-embed.txt');
run('gen-timeline.js');
step(3, 'anchors -> src/01_world.js');
run('gen-world.js');

step(4, 'inject the lyric timeline into index.html');
(function embed() {
  const src = path.join(ROOT, 'index.src.html');
  const out = path.join(ROOT, 'index.html');
  const lrc = path.join(ROOT, 'assets', 'lrc-embed.txt');
  if (!fs.existsSync(src)) { console.error('missing index.src.html'); process.exit(1); }
  const html = fs.readFileSync(src, 'utf8');
  const text = fs.readFileSync(lrc, 'utf8').replace(/\s+$/, '');
  const MARK = '<!--LRC-EMBED-->';
  if (html.indexOf(MARK) === -1) { console.error('index.src.html has no LRC placeholder'); process.exit(1); }
  fs.writeFileSync(out, html.replace(MARK, text), 'utf8');
  console.log('  injected ' + text.split('\n').length + ' cues, wrote index.html');
})();

step(5, 'verify generated files');
(function verify() {
  const problems = [];
  const load = (f) => { const s = fs.readFileSync(path.join(ROOT, f), 'utf8'); return s; };
  const tl = load('assets/timeline.js');
  const m = tl.match(/EM\.CUES\s*=\s*(\[[\s\S]*?\]);/);
  if (!m) problems.push('timeline.js has no CUES');
  const cues = m ? JSON.parse(m[1]) : [];
  if (!cues.length) problems.push('no cues');
  for (let i = 1; i < cues.length; i++) if (cues[i][0] <= cues[i - 1][0]) problems.push('cue ' + i + ' not advancing');
  const wf = load('assets/waveform.js');
  const vm = wf.match(/EM\.AUDIO_END\s*=\s*([0-9.]+)/);
  if (!vm) problems.push('waveform.js has no AUDIO_END');
  const last = cues.length ? cues[cues.length - 1][0] : 0;
  if (vm && last > +vm[1] + 0.01) problems.push('last cue after audio end');
  const html = load('index.html');
  if (html.indexOf('<!--LRC-EMBED-->') !== -1) problems.push('embed placeholder not replaced');
  /* plates present for every cue */
  const plateSrc = ['40_plates_boot.js','41_plates_theorem.js','42_plates_condition.js','43_plates_flesh.js','44_plates_absence.js','45_plates_execution.js','46_plates_love.js']
    .filter(f => fs.existsSync(path.join(ROOT, 'src', f)))
    .map(f => fs.readFileSync(path.join(ROOT, 'src', f), 'utf8')).join('\n');
  const ids = new Set();
  const re = /EM\.Scenes\(['"]([a-zA-Z0-9_.]+)['"]/g;
  let mm; while ((mm = re.exec(plateSrc))) ids.add(mm[1]);
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
  const covered = s => ids.has(s) || dynPrefixes.some(p => s.indexOf(p) === 0);
  const missing = cues.map(c => c[2]).filter(s => !covered(s));
  if (missing.length) problems.push('no plate for: ' + missing.join(', '));

  console.log('  duration  : ' + (vm ? (+vm[1]).toFixed(3) : '?') + ' s');
  console.log('  cues      : ' + cues.length);
  console.log('  plates    : ' + ids.size);
  if (problems.length) { console.error('PROBLEMS:'); problems.forEach(p => console.error('  x ' + p)); process.exit(1); }
  console.log('\nBUILD OK');
})();
