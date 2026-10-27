'use strict';
const fs = require('fs');
const path = require('path');
global.window = {};
eval(fs.readFileSync(path.join(__dirname, '..', 'film', 'motifs.js'), 'utf8'));
const M = window.MOTIFS;
const s = fs.readFileSync(path.join(__dirname, '..', 'film', 'cues.js'), 'utf8');
const j = JSON.parse(s.slice(s.indexOf('=') + 1).trim().replace(/;$/, ''));
let hit = 0; const miss = [];
for (const c of j.cues) { if (M.forCue({ text: c.text })) hit++; else miss.push(c.t.toFixed(2) + ' ' + c.text); }
console.log('matched', hit, 'of', j.cues.length);
console.log(miss.slice(0, 60).join('\n'));
