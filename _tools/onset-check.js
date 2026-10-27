#!/usr/bin/env node
'use strict';
/**
 * _tools/onset-check.js — 验收 assets/waveform.js + assets/onsets.js
 *
 *   node _tools/onset-check.js
 *
 * 打印：总时长 / 帧数 / onset 数量 / 前 20 个 onset /
 *       2:27.8–2:42.0 处决风暴窗口的 onset / LRC 英文行对齐中位差。
 * 退出码：硬指标全过 = 0。
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const LRC  = path.join(ROOT, 'Mili-world.execute(me);.lrc');

/* ---------- 加载 assets/*.js（浏览器里 window.EM 同时创建全局 EM） ---------- */
function loadEm(rel) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) {
    console.error('missing ' + file + '\n先运行: node _build/parse-mp3.js');
    process.exit(1);
  }
  const sandbox = {};
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file });
  return sandbox.window.EM;
}

const pad = (s, n) => String(s).padEnd(n);
const fmt = (ms) => {
  const m = Math.floor(ms / 60000);
  const s = (ms % 60000) / 1000;
  return m + ':' + String(s.toFixed(3)).padStart(6, '0');
};
const median = (a) => { const s = a.slice().sort((x, y) => x - y); return s.length ? (s.length % 2 ? s[s.length >> 1] : (s[(s.length >> 1) - 1] + s[s.length >> 1]) / 2) : NaN; };
const pct = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };

/* ---------- LRC：只取英文歌词行 ---------- */
const CJK = /[\u3000-\u9fff\uff00-\uffef]/;
function parseLrc(file) {
  const rows = [];
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = raw.match(/^\[(\d+):(\d+)(?:[.:](\d+))?\](.*)$/);
    if (!m) continue;
    const text = m[4].trim();
    if (!text) continue;
    if (CJK.test(text)) continue;                       // 中文翻译行
    if (/ by\b/i.test(text) && text.includes('：')) continue;
    if (/^world\.execute\(me\);\s*-\s*Mili$/i.test(text)) continue;  // 标题行
    const frac = m[3] ? (m[3].length === 3 ? Number(m[3]) : Number(m[3]) * 10) : 0;
    rows.push({ ms: Number(m[1]) * 60000 + Number(m[2]) * 1000 + frac, text });
  }
  return rows;
}

const W = loadEm('assets/waveform.js');
const O = loadEm('assets/onsets.js');
const ONSETS = O.ONSETS;

const fails = [];
const check = (cond, msg) => { if (!cond) fails.push(msg); return cond ? '  ok' : '  !! FAIL'; };

console.log('=========================================================');
console.log(' AUDIO  (assets/waveform.js)');
console.log('  AUDIO_END            : ' + W.AUDIO_END.toFixed(6) + ' s   (' + fmt(W.AUDIO_END * 1000) + ')');
console.log('  AUDIO_FRAMES         : ' + W.AUDIO_FRAMES + ' frames');
console.log('  frames x 1152 / 44100: ' + W.AUDIO_END_RAW.toFixed(6) + ' s   (未扣 encoder delay/padding)');
console.log('  encoder delay/padding: ' + W.AUDIO_ENC_DELAY + ' / ' + W.AUDIO_ENC_PADDING + ' samples');
console.log('  实测 = (frames*1152 - delay - padding)/44100 : ' +
  ((W.AUDIO_FRAMES * 1152 - W.AUDIO_ENC_DELAY - W.AUDIO_ENC_PADDING) / 44100).toFixed(6) + ' s' +
  check(Math.abs((W.AUDIO_FRAMES * 1152 - W.AUDIO_ENC_DELAY - W.AUDIO_ENC_PADDING) / 44100 - W.AUDIO_END) < 1e-5, 'duration formula'));

console.log('');
console.log(' WAVEFORM');
console.log('  WAVE.length          : ' + W.WAVE.length + check(W.WAVE.length === 512, 'WAVE 512'));
console.log('  WAVE min / max / mean: ' + Math.min(...W.WAVE).toFixed(3) + ' / ' + Math.max(...W.WAVE).toFixed(3) +
  ' / ' + (W.WAVE.reduce((a, b) => a + b, 0) / W.WAVE.length).toFixed(3));

console.log('');
console.log(' ONSETS  (assets/onsets.js)');
console.log('  ONSETS.length        : ' + ONSETS.length +
  check(ONSETS.length >= 500 && ONSETS.length <= 1200, 'onset count 500..1200') + '   (期望 500–1200)');
{
  const gaps = [];
  for (let i = 1; i < ONSETS.length; i++) gaps.push(ONSETS[i][0] - ONSETS[i - 1][0]);
  console.log('  gap min / med / max  : ' + Math.min(...gaps) + ' / ' + median(gaps) + ' / ' + Math.max(...gaps) + ' ms');
  const vel = ONSETS.map(o => o[2]);
  console.log('  vel med / p90        : ' + median(vel).toFixed(2) + ' / ' + pct(vel, 0.9).toFixed(2));
}
console.log('  前 20 个             :');
for (let i = 0; i < Math.min(20, ONSETS.length); i++) {
  const o = ONSETS[i];
  console.log('    #' + String(i).padStart(3) + '  ' + String(o[0]).padStart(6) + ' ms  ' + fmt(o[0]).padStart(9) +
    '   f0=' + pad(o[1].toFixed(1), 7) + 'Hz  vel=' + o[2].toFixed(2) + '  energy=' + o[3].toFixed(2));
}

/* ---------- 处决风暴窗口 2:27.8 – 2:42.0 ---------- */
const A = 147800, B = 162000;
const storm = ONSETS.filter(o => o[0] >= A && o[0] <= B);
console.log('');
console.log(' 处决风暴窗口 2:27.800 – 2:42.000  (' + A + '–' + B + ' ms)');
console.log('  窗口内 onset 总数     : ' + storm.length + '（这一段 464ms 拍点 + 16 分音符，本身就很密）');
{
  const g = [];
  for (let i = 1; i < storm.length; i++) g.push(storm[i][0] - storm[i - 1][0]);
  console.log('  间隔 min / med / max  : ' + Math.min(...g) + ' / ' + median(g) + ' / ' + Math.max(...g) + ' ms' +
    '   (464ms ≈ 129.4 BPM 主拍)');
}
/* 重击：力度 + flux 双强，且在 >=700ms 范围内最强的那些（即"明显冲击"，12–16 个） */
const strength = (o) => o[2] * 0.6 + o[3] * 0.4;
const heavy = storm.slice()
  .map(o => ({ o, s: strength(o) }))
  .sort((a, b) => b.s - a.s)
  .reduce((acc, c) => { if (acc.every(k => Math.abs(k.o[0] - c.o[0]) >= 700)) acc.push(c); return acc; }, [])
  .map(k => k.o)
  .sort((a, b) => a[0] - b[0]);
console.log('  明显重击（间隔 >=700ms 的强度峰） : ' + heavy.length + ' 个' + check(heavy.length >= 12 && heavy.length <= 16, 'storm heavy hits 12..16'));
{
  const d = [];
  for (let i = 0; i < heavy.length; i++) {
    const dt = i ? heavy[i][0] - heavy[i - 1][0] : 0;
    console.log('    [' + String(i).padStart(2) + '] ' + String(heavy[i][0]).padStart(6) + ' ms  ' + fmt(heavy[i][0]).padStart(9) +
      '  dt=' + pad(dt ? dt + ' ms' : '—', 8) + ' f0=' + pad(heavy[i][1].toFixed(1), 7) + 'Hz  vel=' + heavy[i][2].toFixed(2) + '  energy=' + heavy[i][3].toFixed(2));
    if (i) d.push(dt);
  }
  if (d.length) console.log('  重击间隔             : ' + d.join(' / ') + ' ms');
}
console.log('  窗口内全部 onset（时间 ms / vel / energy）:');
{
  let line = '   ';
  for (const o of storm) {
    const cell = ' ' + o[0] + '(' + o[2].toFixed(2) + ')';
    if ((line + cell).length > 118) { console.log(line); line = '   '; }
    line += cell;
  }
  if (line.trim()) console.log(line);
}

/* ---------- LRC 对齐 ---------- */
const lrc = parseLrc(LRC);
const nearestDist = (ms) => {
  let lo = 0, hi = ONSETS.length - 1, best = Infinity;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const d = ONSETS[mid][0] - ms;
    if (Math.abs(d) < best) best = Math.abs(d);
    if (d < 0) lo = mid + 1; else hi = mid - 1;
  }
  return best;
};
const rows = lrc.map(r => {
  const d = nearestDist(r.ms);
  let nearest = ONSETS[0][0], bd = Infinity;
  for (const o of ONSETS) { const dd = Math.abs(o[0] - r.ms); if (dd < bd) { bd = dd; nearest = o[0]; } }
  return { ...r, d, nearest };
});
const dists = rows.map(r => r.d);
const med = median(dists);
console.log('');
console.log(' LRC 对齐  (' + lrc.length + ' 条英文行)');
console.log('  |最近 onset - 歌词| 中位差 : ' + med + ' ms' + check(med < 60, 'lrc median < 60ms') + '   (要求 < 60ms)');
console.log('  p90 / max                  : ' + pct(dists, 0.9) + ' / ' + Math.max(...dists) + ' ms');
{
  const signed = rows.map(r => r.nearest - r.ms);
  console.log('  signed 中位偏移            : ' + median(signed) + ' ms  (onset - lrc)');
}
console.log('  最差的 6 行:');
rows.slice().sort((a, b) => b.d - a.d).slice(0, 6).forEach(r =>
  console.log('    ' + String(r.ms).padStart(7) + ' ms  d=' + String(r.d).padStart(4) + ' ms  "' + r.text.slice(0, 44) + '"'));

console.log('');
console.log('---------------------------------------------------------');
if (fails.length) { console.log(' RESULT: FAIL — ' + fails.join(' | ')); process.exit(1); }
console.log(' RESULT: PASS — 时长/帧数/包络/onset 数量/LRC 对齐 全部达标');
console.log('=========================================================');
