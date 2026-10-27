'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const b64 = fs.readFileSync(path.join(ROOT, 'demo', 'char2.bin')).toString('base64');
fs.writeFileSync(path.join(ROOT, 'test12', 'chardata.js'),
  'window.CHAR_B64 = ' + JSON.stringify(b64) + ';\n', 'utf8');
console.log('wrote test12/chardata.js', (b64.length/1024|0) + 'KB');
