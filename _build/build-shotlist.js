'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'film', 'motifs.js'), 'utf8');
const tblock = src.slice(src.indexOf('var TABLE = ['), src.indexOf('function forCue'));
const rows = [];
const re = /\[\/(.+?)\/([gimsuy]*),\s*([A-Za-z0-9_]+)\]/g;
let m;
while ((m = re.exec(tblock))) rows.push({ re: new RegExp(m[1], m[2]), fn: m[3] });
const cs = fs.readFileSync(path.join(root, 'film', 'cues.js'), 'utf8');
const j = JSON.parse(cs.slice(cs.indexOf('=') + 1).trim().replace(/;$/, ''));
function actOf(t) {
  if (t < 29.74) return 'birth';
  if (t < 59.4) return 'proof';
  if (t < 74.04) return 'bargain';
  if (t < 103.48) return 'flesh';
  if (t < 147.86) return 'absence';
  if (t < 177.41) return 'exec';
  return 'love';
}
const FB = { bargain: 'limitBox', flesh: 'stim', absence: 'left', love: 'longing', proof: 'points', birth: '(terminal scene)', exec: 'execStack' };
const out = [];
out.push('# DEEPSEEK — shot list (per lyric line)');
out.push('');
out.push('Generated from film/motifs.js + film/cues.js. One row per LRC cue.');
out.push('');
out.push('| # | Time | Act | Lyric | Motif | Source |');
out.push('|---|---|---|---|---|---|');
for (let i = 0; i < j.cues.length; i++) {
  const c = j.cues[i];
  const act = actOf(c.t);
  let name = null, kind = '';
  for (const r of rows) if (r.re.test(c.text)) { name = r.fn; kind = 'cue'; break; }
  if (!name) { name = FB[act] || '—'; kind = 'act fallback'; }
  const t = c.t;
  const mm = Math.floor(t / 60), ss = (t % 60).toFixed(2).padStart(5, '0');
  out.push('| ' + (i + 1) + ' | ' + mm + ':' + ss + ' | ' + act + ' | ' + c.text.replace(/\|/g, '/') + ' | ' + name + ' | ' + kind + ' |');
}
fs.writeFileSync(path.join(root, 'timeline', 'SHOT-LIST.md'), out.join('\n') + '\n');
console.log('rows', j.cues.length, 'motif patterns', rows.length);
