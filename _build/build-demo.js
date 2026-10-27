'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const tpl = fs.readFileSync(path.join(ROOT, '_build', 'demo-template.html'), 'utf8');
const b64 = fs.readFileSync(path.join(ROOT, 'demo', 'char.bin')).toString('base64');
fs.writeFileSync(path.join(ROOT, 'demo', 'index.html'), tpl.replace('__CHARB64__', b64), 'utf8');
console.log('wrote demo/index.html', (tpl.length + b64.length) / 1024 | 0, 'KB');
