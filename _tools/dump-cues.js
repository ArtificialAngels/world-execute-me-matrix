'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const s = fs.readFileSync(path.join(root, 'film', 'cues.js'), 'utf8');
const j = JSON.parse(s.slice(s.indexOf('=') + 1).trim().replace(/;$/, ''));
function actOf(t) {
  if (t < 29.74) return 'BOOT';
  if (t < 59.4) return 'PROOF';
  if (t < 74.04) return 'BARGAIN';
  if (t < 103.48) return 'FLESH';
  if (t < 147.86) return 'ABSENCE';
  if (t < 177.41) return 'EXEC';
  return 'LOVE';
}
for (let i = 0; i < j.cues.length; i++) {
  const c = j.cues[i], n = j.cues[i + 1];
  const dur = (n ? n.t : j.duration) - c.t;
  console.log(String(i + 1).padStart(2) + '\t' + c.t.toFixed(2) + '\t' + dur.toFixed(2) + '\t' + actOf(c.t) + '\t' + c.text);
}
