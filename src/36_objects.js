/* 36_objects.js — the lyric objects, as blueprint plates.
   The lyrics name a handful of things (eggplant, tomato, tabby cat, god, and the
   abstract nutrients / antioxidants). Each one is a generated line-art PNG
   (assets/objects.js, data URIs so file:// canvases stay untainted) and is laid
   into the shot when its line comes up: a large ghost specimen behind the type
   plus a small annotated card in one corner. Placement is seeded by cue.i,
   motion only comes from p and onsets, so every t is reproducible. */
(function (EM) {
  'use strict';
  var clamp = EM.clamp, lerp = EM.lerp, hash = EM.hash, TAU = EM.TAU;

  var SRC = window.EM_OBJECTS || {};
  var IMG = {}, READY = {};
  Object.keys(SRC).forEach(function (id) {
    var im = new Image();
    im.onload = function () { READY[id] = true; };
    im.src = SRC[id];
    IMG[id] = im;
  });

  var LABEL = {
    eggplant: 'SOLANUM MELONGENA',
    nutrients: 'NUTRIENT VECTOR',
    tomato: 'SOLANUM LYCOPERSICUM',
    antiox: 'ANTIOXIDANT',
    cat: 'FELIS CATUS',
    god: 'DEUS EX MACHINA'
  };
  var NUM = { eggplant: '01', nutrients: '02', tomato: '03', antiox: '04', cat: '05', god: '06' };

  function pick(cue) {
    var s = String(cue.text || '').toLowerCase();
    if (/eggplant/.test(s)) return 'eggplant';
    if (/nutrient/.test(s)) return 'nutrients';
    if (/tomato/.test(s)) return 'tomato';
    if (/antioxidant/.test(s)) return 'antiox';
    if (/tabby cat|purr/.test(s)) return 'cat';
    if (/god/.test(s)) return 'god';
    return null;
  }

  function drawCard(ctx, id, x, y, size, a, t, seed) {
    var im = IMG[id];
    if (!im || !READY[id]) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = clamp(a, 0, 1);
    ctx.shadowColor = 'rgba(210,245,255,0.55)';
    ctx.shadowBlur = 18;
    ctx.drawImage(im, -size / 2, -size / 2, size, size);
    ctx.shadowBlur = 0;
    /* corner ticks + label: a specimen card, not a sticker */
    ctx.globalAlpha = clamp(a * 0.55, 0, 1);
    ctx.strokeStyle = 'rgba(230,250,255,0.95)';
    ctx.lineWidth = 1.4;
    var hw = size / 2 + 14, hh = size / 2 + 14, q = 22;
    ctx.beginPath();
    ctx.moveTo(-hw, -hh + q); ctx.lineTo(-hw, -hh); ctx.lineTo(-hw + q, -hh);
    ctx.moveTo(hw - q, -hh); ctx.lineTo(hw, -hh); ctx.lineTo(hw, -hh + q);
    ctx.moveTo(-hw, hh - q); ctx.lineTo(-hw, hh); ctx.lineTo(-hw + q, hh);
    ctx.moveTo(hw - q, hh); ctx.lineTo(hw, hh); ctx.lineTo(hw, hh - q);
    ctx.stroke();
    ctx.globalAlpha = clamp(a * 0.78, 0, 1);
    EM.D.text('SPEC ' + NUM[id] + ' / ' + LABEL[id], 0, hh + 22, {
      size: 11, kind: 'mono', weight: 400, color: 'rgba(230,250,255,0.8)',
      align: 'center', tracking: 3
    });
    /* a tiny live readout under the card */
    ctx.globalAlpha = clamp(a * 0.42, 0, 1);
    EM.D.text('p ' + ((t * 7 + seed * 13) % 100).toFixed(0).padStart(2, '0') + '  ·  scan', 0, -hh - 14, {
      size: 10, kind: 'mono', weight: 400, color: 'rgba(230,250,255,0.7)',
      align: 'center', tracking: 2
    });
    ctx.restore();
  }

  function draw(cue, w, t, p) {
    if (!cue) return;
    var id = pick(cue);
    if (!id || !IMG[id] || !READY[id]) return;
    if (p == null) p = cue.dur > 0 ? clamp((t - cue.t) / cue.dur, 0, 1) : 0;
    var ctx = EM.D.ctx();
    var a = EM.Life.vis(p, EM.Life.ramp(cue));
    if (a <= 0.01) return;
    var pulse = EM.onsetPulse(t, 0.18);
    var seed = (cue.i || 0) * 131 + 7;
    var h1 = hash(seed + 3), h2 = hash(seed + 11), h3 = hash(seed + 23), h4 = hash(seed + 37);
    var fam = (EM.M && EM.M.lyricFamily) ? EM.M.lyricFamily(cue) : ((cue.i || 0) % 7);

    /* the ghost specimen: big, slow, behind the type */
    var gs = 820 + h1 * 190;
    var gx = (h2 - 0.5) * 280 + Math.sin(t * 0.23 + h3 * TAU) * 26 + (p - 0.5) * 40;
    var gy = -20 + (h3 - 0.5) * 110 + Math.cos(t * 0.19) * 18;
    var grot = (h4 - 0.5) * 0.12 + Math.sin(t * 0.27) * 0.014;
    var gsc = 1 + 0.018 * Math.sin(t * 0.6) + pulse * 0.012;
    ctx.save();
    ctx.translate(gx, gy);
    ctx.rotate(grot);
    ctx.scale(gsc, gsc);
    ctx.globalAlpha = clamp(a * (0.24 + 0.10 * h4) + pulse * 0.06, 0, 1);
    ctx.shadowColor = 'rgba(200,240,255,0.4)';
    ctx.shadowBlur = 28;
    ctx.drawImage(IMG[id], -gs / 2, -gs / 2, gs, gs);
    ctx.restore();

    /* the small card: placed away from the line's own typographic corner */
    var side = (fam === 1 || fam === 4) ? 1 : (fam === 2 ? -1 : ((cue.i || 0) % 2 ? 1 : -1));
    var down = fam === 3 ? 1 : (hash(seed + 91) > 0.5 ? -1 : 1);
    if (down > 0 && side < 0) side = 1;        /* keep the matrix readout corner clear */
    var cx = side * 700, cy = down * 292;
    var jx = (hash(seed + 51) - 0.5) * 34, jy = (hash(seed + 67) - 0.5) * 28;
    drawCard(ctx, id, cx + jx, cy + jy, 238 + h2 * 34, a, t, seed);

    /* a hairline linking card and ghost: the specimen is measured, not pasted */
    ctx.save();
    ctx.globalAlpha = clamp(a * 0.22, 0, 1);
    ctx.strokeStyle = 'rgba(225,248,255,0.9)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx + jx + (side > 0 ? -160 : 160), cy + jy);
    ctx.lineTo(gx + (side > 0 ? 200 : -200), gy + 40);
    ctx.stroke();
    ctx.restore();
  }

  EM.Objects = { draw: draw, ready: function () { return Object.keys(SRC).every(function (k) { return READY[k]; }); } };
})(window.EM);
