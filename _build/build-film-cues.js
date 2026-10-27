'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'timeline', 'deepseek-timeline.json'), 'utf8'));
const cues = data.cues.map(c => ({ t: c.t, text: c.text, act: c.act, mode: c.mode }));
fs.writeFileSync(path.join(ROOT, 'film', 'cues.js'),
  'window.FILM_CUES = ' + JSON.stringify({ duration: data.duration, cues: cues, strongOnsets: data.strongOnsets }) + ';\n', 'utf8');
console.log('cues', cues.length, 'duration', data.duration);
