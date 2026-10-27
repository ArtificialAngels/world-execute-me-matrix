/* _build/char-data-hi.js — 576x1024 character field (2x resolution). */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const CW = 576, CH = 1024;
const raw = fs.readFileSync(path.join(ROOT, 'demo', '_raw2.rgba'));
const N = CW * CH;
const nearWhite = i => raw[i] > 235 && raw[i + 1] > 235 && raw[i + 2] > 235;
const bg = new Uint8Array(N);
const stack = [];
function push(x, y) {
  if (x < 0 || y < 0 || x >= CW || y >= CH) return;
  const i = y * CW + x;
  if (bg[i]) return;
  if (!nearWhite(i * 4)) return;
  bg[i] = 1; stack.push(i);
}
for (let x = 0; x < CW; x++) { push(x, 0); push(x, CH - 1); }
for (let y = 0; y < CH; y++) { push(0, y); push(CW - 1, y); }
while (stack.length) {
  const i = stack.pop(), x = i % CW, y = (i - x) / CW;
  push(x - 1, y); push(x + 1, y); push(x, y - 1); push(x, y + 1);
}
const out = Buffer.alloc(N * 2);
let filled = 0;
for (let y = 0; y < CH; y++) {
  for (let x = 0; x < CW; x++) {
    const i = y * CW + x, p = i * 4;
    const r = raw[p], g = raw[p + 1], b = raw[p + 2];
    const luma = Math.max(0, Math.min(255, Math.round(0.299 * r + 0.587 * g + 0.114 * b)));
    let cls = 4;
    const l = r * 0.3 + g * 0.5 + b * 0.2;
    if (b > r + 14 && b > g + 2 && b > 70) cls = 0;
    else if (b > r + 4 && l < 110) cls = 1;
    else if (r > g && g > b && r > 150 && r - b > 24) cls = 3;
    else if (r > 198 && g > 198 && b > 198) cls = 2;
    const mask = bg[i] ? 0 : 1;
    out[i * 2] = (mask << 7) | (luma >> 1);
    out[i * 2 + 1] = cls;
    if (mask) filled++;
  }
}
const header = Buffer.alloc(8);
header.write('CHR2', 0, 'ascii');
header.writeUInt16LE(CW, 4);
header.writeUInt16LE(CH, 6);
fs.writeFileSync(path.join(ROOT, 'demo', 'char2.bin'), Buffer.concat([header, out]));
console.log('char2', CW + 'x' + CH, 'filled', filled, 'bytes', header.length + out.length);
