/* _build/build-timeline.js — master timing map for the DEEPSEEK version. */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

/* ---------- parse the supplied LRC ---------- */
const lrc = fs.readFileSync(path.join(ROOT, 'Mili-world.execute(me);.lrc'), 'utf8').split(/\r?\n/);
function isCJK(ch) { const c = ch.charCodeAt(0); return c >= 0x4E00 && c <= 0x9FFF; }
function hasCJK(s) { for (const ch of s) if (isCJK(ch)) return true; return false; }
const parsed = [];
for (const raw of lrc) {
  const m = raw.match(/^\[(\d+):(\d+)[.:](\d+)\](.*)$/);
  if (!m) continue;
  const frac = (+m[3]) / Math.pow(10, m[3].length);
  const t = (+m[1]) * 60 + (+m[2]) + frac;
  const text = m[4].trim();
  if (!text) continue;
  if (hasCJK(text)) continue;
  if (text.indexOf('Lyrics by') === 0 || text.indexOf('Composed by') === 0) continue;
  if (text.indexOf('world.execute(me); - Mili') === 0) continue;
  parsed.push({ t: +t.toFixed(3), text });
}
const seen = new Set();
const lines = [];
for (const c of parsed) {
  const key = c.t.toFixed(2);
  if (seen.has(key)) continue;
  seen.add(key); lines.push(c);
}
/* authored extra beats */
const extras = [
  { t: 0.0, text: 'world.execute(me);', kind: 'title' },
  { t: 16.0, text: '(instrumental - the apparatus boots)', kind: 'instr' },
  { t: 131.5, text: '(instrumental - the argument stack)', kind: 'instr' },
  { t: 184.54, text: 'I know the algebraic expression of lo-o-ove', kind: 'lyric' },
  { t: 191.8, text: '(instrumental - the open loop)', kind: 'instr' }
];
for (const e of extras) if (!lines.some(l => Math.abs(l.t - e.t) < 0.05)) lines.push({ t: e.t, text: e.text });
lines.sort((a, b) => a.t - b.t);
for (let i = 0; i < lines.length; i++) {
  const next = lines[i + 1];
  lines[i].dur = +(Math.max(0.2, (next ? next.t : 211.912857) - lines[i].t)).toFixed(3);
}
function actOf(t) {
  if (t < 29.7) return '0 BOOT';
  if (t < 59.4) return 'I PROOF';
  if (t < 74.04) return 'II BARGAIN';
  if (t < 103.48) return 'III FLESH';
  if (t < 147.83) return 'IV ABSENCE';
  if (t < 177.41) return 'V EXECUTION';
  return 'VI LOVE';
}
const actPlan = {
  '0 BOOT': { mode: 'ASCII / CRT birth', render: 'S0 binary -> S1 strings', motion: 'BIOS + hex walls + scan', fx: 6 },
  'I PROOF': { mode: 'SCI-FI geometry', render: 'S2 geometry + equations in space', motion: 'polyhedra, curves, epsilon-N', fx: 8 },
  'II BARGAIN': { mode: 'SCI-FI architecture', render: 'S3 megastructure', motion: 'lattice + if() + first red alarm', fx: 9 },
  'III FLESH': { mode: 'SCI-FI warm life', render: 'S4 flesh + light', motion: 'mesh skin + heartbeat + spectra', fx: 11 },
  'IV ABSENCE': { mode: 'SCI-FI dissolving', render: 'S4 -> S1 collapse', motion: 'holes + erasure + null rooms', fx: 7 },
  'V EXECUTION': { mode: 'GLITCH / ASCII corruption', render: 'S4 -> shreds', motion: '16 destructions + stack dumps + fork tree', fx: 14 },
  'VI LOVE': { mode: 'CALM light', render: 'S5 light', motion: 'heart curves + handwriting + stardust', fx: 5 }
};
const overrides = {
  '0.27': 'power line ignites / scan line / grid',
  '1.93': 'protection field / hex shield',
  '3.95': 'pieces fall / point burst',
  '5.57': 'object creation / line -> cube',
  '7.60': 'parameters / body assembly starts',
  '11.24': 'new world / grid expands',
  '12.93': 'simulation begins',
  '29.74': 'set of points / body scatters to stars',
  '40.78': 'approach infinity / nested recursion',
  '59.40': 'first conditional / giant if()',
  '68.48': 'first red alarm / requestExecution()',
  '74.04': 'first warm grade / code grows skin',
  '85.13': 'rose-window eye / world inside iris',
  '103.48': 'light starts to leave',
  '110.92': 'hole punched through the body',
  '116.03': 'isolation / one point of light',
  '129.04': 'red exceptions / gravity inversion',
  '147.83': 'EXECUTION storm starts (16 hits)',
  '162.72': 'after the storm / self-recompile',
  '184.54': 'algebraic expression of love',
  '205.96': 'the last EXECUTION / warm light dies'
};
function fmt(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.round((sec - Math.floor(sec)) * 1000);
  return m + ':' + String(s).padStart(2, '0') + '.' + String(ms).padStart(3, '0');
}
const rows = lines.map((l, i) => {
  const act = actOf(l.t);
  const plan = actPlan[act];
  const key = l.t.toFixed(2);
  const o = overrides[key];
  const isInstr = l.text.indexOf('(instrumental') === 0;
  const isTitle = l.t === 0;
  return {
    i,
    t: l.t,
    dur: l.dur,
    time: fmt(l.t),
    act,
    text: l.text,
    kind: isTitle ? 'title' : isInstr ? 'instrumental' : 'lyric',
    scene: (isInstr ? 'instr.' : isTitle ? 'title.' : 'cue.') + String(i).padStart(3, '0'),
    mode: plan.mode,
    render: plan.render,
    motion: o || plan.motion,
    fx: o ? plan.fx + 2 : plan.fx
  };
});
let onsets = [];
try {
  const src = fs.readFileSync(path.join(ROOT, 'assets', 'onsets.js'), 'utf8');
  const m = src.match(/EM\.ONSETS\s*=\s*(\[[\s\S]*\]);/);
  onsets = new Function('return ' + m[1])();
} catch (e) { console.warn('no onsets', e.message); }
const strong = onsets.filter(o => o[2] >= 0.78).map(o => o[0]);
const out = {
  title: 'DEEPSEEK - world.execute(me); master timeline',
  duration: 211.912857,
  cues: rows,
  onsets: onsets.length,
  strongOnsets: strong,
  acts: Object.keys(actPlan).map(name => {
    const inAct = rows.filter(r => r.act === name);
    const last = inAct[inAct.length - 1];
    return { name, start: inAct.length ? inAct[0].time : '', end: last ? fmt(last.t + last.dur) : '', cues: inAct.length };
  })
};
fs.mkdirSync(path.join(ROOT, 'timeline'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'timeline', 'deepseek-timeline.json'), JSON.stringify(out, null, 1), 'utf8');

const md = [];
md.push('# DEEPSEEK - master timeline');
md.push('');
md.push('Source: the supplied LRC (exact lyric times) + our onset analysis (' + onsets.length + ' onsets).');
md.push('Duration: 3:31.912. Acts, scenes and motion plans are authored for the new version.');
md.push('');
md.push('| # | Time | Dur | Act | Mode | Lyric / beat | Render | Motion | FX |');
md.push('|---|---|---|---|---|---|---|---|---|');
for (const r of rows) md.push('| ' + r.i + ' | ' + r.time + ' | ' + r.dur.toFixed(2) + ' | ' + r.act + ' | ' + r.mode + ' | ' + r.text.replace(/\|/g, '/') + ' | ' + r.render + ' | ' + r.motion + ' | ' + r.fx + ' |');
md.push('');
md.push('## Act totals');
md.push('');
md.push('| Act | Cues | Start | End |');
md.push('|---|---|---|---|');
for (const a of out.acts) md.push('| ' + a.name + ' | ' + a.cues + ' | ' + a.start + ' | ' + a.end + ' |');
md.push('');
md.push('Strong onsets (velocity >= 0.78): ' + strong.length + ' - use these for flashes, shocks and cuts.');
fs.writeFileSync(path.join(ROOT, 'timeline', 'DEEPSEEK-TIMELINE.md'), md.join('\n'), 'utf8');

const tpl = fs.readFileSync(path.join(ROOT, '_build', 'timeline-template.html'), 'utf8');
fs.writeFileSync(path.join(ROOT, 'timeline', 'index.html'), tpl.replace('__DATA__', JSON.stringify(out)), 'utf8');
console.log('timeline:', rows.length, 'cues,', strong.length, 'strong onsets,', onsets.length, 'onsets');
console.log('acts:', out.acts.map(a => a.name + '=' + a.cues).join(' / '));
