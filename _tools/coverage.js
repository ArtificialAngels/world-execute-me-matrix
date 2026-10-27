'use strict';
const fs = require('fs');
const path = require('path');
const s = fs.readFileSync(path.join(__dirname, '..', 'film', 'cues.js'), 'utf8');
const j = JSON.parse(s.slice(s.indexOf('=') + 1).trim().replace(/;$/, ''));
const pats = [/set of points/i,/dimension/i,/a circle/i,/circumference/i,/sine wave/i,/tangent/i,/approach infinity/i,/limitation/i,/switch my current/i,/a\.?c to d\.?c|ac to dc/i,/blind my vision/i,/dizzy/i,/travel/i,/eggplant/i,/tomato/i,/tabby cat|cat/i,/god|exist/i,/gender/i,/12 hours|clock/i,/moire/i,/superellipse/i,/vibration|chladni/i,/lissajous/i,/feel your/i,/heart|love/i,/trapped/i,/fragments/i,/execution/i,/nan|illegal|error/i];
let hit = 0; const miss = [];
for (const c of j.cues) { if (pats.some(p => p.test(c.text))) hit++; else miss.push(c.time + ' ' + c.text); }
console.log('matched', hit, 'of', j.cues.length);
console.log(miss.join('\n'));
