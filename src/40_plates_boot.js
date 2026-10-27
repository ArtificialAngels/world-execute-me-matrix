/* 40_plates_boot.js — Act 0: the apparatus is switched on.
   The act establishes the whole language: cable, shadow, one cool trace,
   a spotlight that is a character. Shadows here are deliberately sharp (low z):
   the machine is still in calibration. */
(function (EM) {
  'use strict';
  var D = EM.D, M = EM.M, L = EM.Life, W = 1920, H = 1080;
  var E = EM.E, TAU = EM.TAU, clamp = EM.clamp, lerp = EM.lerp, hash = EM.hash;

  function lyric(cue, p, o) { M.lyric(cue, p, o || { y: 330, size: 60, fit: 1480 }); }

  /* ------------------------------------------------------------------ pre */
  EM.Scenes('pre.title', function (w, p, cue) {
    var a = clamp(p * 2.6, 0, 1);
    M.type('world.execute(me);', { x: 90, y: 60, size: 78, mode: 'light', alpha: a, track: 12, kind: 'cond', weight: 300 });
    M.type('a shadow play   ·   3:31', { x: 92, y: 130, size: 18, mode: 'light', alpha: a * 0.6, track: 8, kind: 'mono' });
    /* the leader marks: one horizontal rule and two registers */
    M.shadow(function () {
      D.lw(1.4); D.line(-820, 180, 820, 180);
      D.lw(1); D.line(-820, 174, -820, 186); D.line(820, 174, 820, 186);
    }, { z: 0.05, blur: 1.2 });
  });

  /* ---------------------------------------------------------------- power */
  EM.Scenes('boot.power', function (w, p, cue) {
    var ignite = E.outCubic(clamp(p / 0.4, 0, 1));
    /* the power line: a cable across the top, a drop, a knife switch */
    M.shadow(function () {
      D.lw(3.6); D.line(-1000, -318, 1000, -306);
      D.lw(2.6); D.line(-392, -312, -392, -176);
      D.rect(-430, -178, 76, 40); D.stroke();
      D.lw(1.8); D.circle(-392, -120, 12); D.stroke();
      /* the switch, thrown closed by p */
      var ang = lerp(-0.85, -0.05, ignite);
      D.lw(3);
      D.line(-640, -312, -640 + Math.cos(ang) * 96, -312 + Math.sin(ang) * 96);
      D.circle(-640, -312, 9); D.fill();
      D.lw(1.6); D.rect(-700, -334, 60, 44); D.stroke();
    }, { z: 0.1, blur: 1.6 });
    M.rim(function () {
      D.lw(1.2); D.line(-1000, -318, 1000, -306); D.line(-392, -312, -392, -176);
      D.rect(-430, -178, 76, 40); D.stroke(); D.circle(-392, -120, 12); D.stroke();
    }, { z: 0.1, alpha: 0.22 });

    /* contact spark at the socket */
    var spark = Math.pow(clamp(1 - Math.abs(p - 0.12) / 0.1, 0, 1), 2);
    if (spark > 0.01) M.pierce(-392, -118, 26 + 90 * spark, { alpha: 0.9 * spark });
    /* the filament used to catch here, at the lamp. There is no lamp: the
       machine powers on as a signal, not as a light. */
    lyric(cue, p);
  });

  /* -------------------------------------------------------------- protect */
  EM.Scenes('boot.protect', function (w, p, cue) {
    var slide = E.outCubic(clamp(p / 0.5, 0, 1));
    var top = lerp(-760, -500, slide);
    var ctx = D.ctx();
    /* the pane comes down between the light and the wall: its shadow is a
       soft veil with a hard frame inside it */
    M.shadow(function () {
      D.lw(3.4); D.rect(-780, top, 1560, 940); D.stroke();
      D.lw(1.2); D.rect(-752, top + 26, 1504, 888); D.stroke();
      for (var i = 0; i < 4; i++) {
        D.circle(i % 2 ? 726 : -726, top + 60 + (i > 1 ? 820 : 0), 11); D.stroke();
      }
    }, { z: 0.12, blur: 3.2 });
    /* the glass itself: a faint veil and one specular sweep */
    ctx.save();
    ctx.globalAlpha = 0.10;
    ctx.fillStyle = w.pal.wallLo;
    ctx.fillRect(-780, top, 1560, 940);
    ctx.restore();
    ctx.save();
    ctx.beginPath(); ctx.rect(-780, top, 1560, 940); ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    var sx = lerp(-900, 900, (w.t * 0.18) % 1);
    var g = ctx.createLinearGradient(sx - 220, top, sx + 220, top + 940);
    g.addColorStop(0, 'rgba(255,238,205,0)');
    g.addColorStop(0.5, 'rgba(255,242,216,0.13)');
    g.addColorStop(1, 'rgba(255,238,205,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-780, top, 1560, 940);
    ctx.restore();
    M.type('SAFETY  CLASS  ' + (igniteLabel(p)), { x: -700, y: top + 60, size: 13, kind: 'mono', mode: 'light', alpha: 0.4, align: 'left', track: 3 });
    lyric(cue, p, { y: 330, size: 58, fit: 1440 });
  });
  function igniteLabel(p) { return p < 0.5 ? 'II' : 'III'; }

  /* --------------------------------------------------------------- pieces */
  EM.Scenes('boot.pieces', function (w, p, cue) {
    var n = 7, baseY = 210;
    for (var i = 0; i < n; i++) {
      var t0 = 0.04 + i * 0.062;
      var u = clamp((p - t0) / 0.4, 0, 1);
      if (u <= 0) continue;
      var x = -660 + i * 220;
      var y = lerp(-560, baseY + (i % 3) * 52, E.outBounce(u));
      var r = 34 + hash(i * 91) * 20;
      M.shadow(function () {
        D.circle(x, y, r); D.fill();
        D.lw(2.4); D.circle(x, y, r + 12); D.stroke();
      }, { z: 0.12, blur: 2.2 });
      M.rim(function () { D.lw(1.2); D.circle(x, y, r); D.stroke(); }, { z: 0.12, alpha: 0.3 * (1 - u * 0.6) });
      if (u > 0.86) M.pierce(x, y + r, 70, { alpha: 0.12 * (1 - u) });
    }
    /* a measuring line under the row */
    M.measure(-660, 420, 660, 420, { label: '7 pieces', alpha: 0.5 });
    lyric(cue, p);
  });

  /* --------------------------------------------------------------- create */
  EM.Scenes('boot.create', function (w, p, cue) {
    var st = p < 0.18 ? 0 : p < 0.36 ? 1 : p < 0.54 ? 2 : p < 0.74 ? 3 : 4;
    var fade = [];
    for (var s = 0; s <= 4; s++) fade[s] = clamp(1 - (st - s) * 0.55, 0.12, 1);
    /* the object being built: point, edge, triangle, square, solid */
    M.shadow(function () {
      if (st >= 1) { D.lw(3); D.line(-220, 120, 220, 120); }
      if (st >= 2) { D.lw(3); D.line(-220, 120, 0, -160); D.line(220, 120, 0, -160); }
      if (st >= 3) { D.lw(3); D.rect(-220, -160, 440, 280); D.stroke(); }
      if (st >= 4) { D.lw(1.6); for (var k = 0; k < 5; k++) D.line(-220, -160 + k * 70, 220, -160 + k * 70); }
      if (st >= 0) { D.circle(0, -20, 6); D.fill(); }
    }, { z: 0.1, blur: 1.8 });
    /* the machine's construction marks */
    M.crosshair(0, -20, 200, { alpha: 0.4 + 0.15 * p, ticks: true, label: 'object ' + st + '/4' });
    M.measure(-220, 250, 220, 250, { label: '440' });
    M.measure(280, -160, 280, 120, { label: '280' });
    M.type('v = ' + (st + 1) + '   e = ' + (st * 2), { x: -720, y: -380, size: 15, kind: 'mono', mode: 'light', alpha: 0.4, align: 'left', track: 2 });
    lyric(cue, p, { y: 360, size: 56, fit: 1440 });
  });

  /* --------------------------------------------------------------- params */
  EM.Scenes('boot.params', function (w, p, cue) {
    var vals = [0.618, 3.1416, 1.4142, 2.7183];
    var names = ['phi', 'pi', 'sqrt2', 'e'];
    for (var i = 0; i < 4; i++) {
      var x = -420 + i * 280;
      var u = clamp((p - i * 0.07) / 0.62, 0, 1);
      var y = lerp(-220, 60, E.outCubic(u) * (0.5 + vals[i] / 8));
      M.shadow(function () {
        D.lw(3.2); D.line(x, -300, x, 280);
        D.lw(1.8); D.line(x - 52, -300, x + 52, -300);
        D.lw(1.8); D.line(x - 52, 280, x + 52, 280);
        D.lw(4); D.rect(x - 38, y - 9, 76, 18); D.fill();
        D.lw(1.1);
        for (var k = 0; k < 10; k++) { var ty = -300 + k * 64.4; D.line(x + 54, ty, x + 74, ty); }
      }, { z: 0.1, blur: 1.6 });
      M.rim(function () { D.lw(0.9); D.line(x, -300, x, 280); D.rect(x - 38, y - 9, 76, 18); D.stroke(); }, { z: 0.1, alpha: 0.16 });
      M.type(names[i] + ' = ' + vals[i].toFixed(4), { x: x, y: 330, size: 15, kind: 'mono', mode: 'light', alpha: 0.45, track: 1 });
    }
    M.measure(-420, 400, 420, 400, { label: 'calibration' });
    lyric(cue, p, { y: -380, size: 54, fit: 1440 });
  });

  /* ---------------------------------------------------------------- world */
  EM.Scenes('boot.world', function (w, p, cue) {
    var tilt = E.outCubic(clamp(p / 0.65, 0, 1));
    M.shadow(function () {
      D.lw(3.4); D.line(-1000, -40, 1000, -40);
      D.lw(1.5);
      var rows = 10, cols = 23;
      for (var r = 0; r <= rows; r++) {
        var y = -40 + Math.pow(r / rows, 1.4) * 560 * tilt;
        var spread = 0.32 + 0.68 * (r / rows);
        D.line(-980 * spread, y, 980 * spread, y);
        if (r === 0) continue;
        var yPrev = -40 + Math.pow((r - 1) / rows, 1.4) * 560 * tilt;
        for (var c = 0; c < cols; c++) {
          var u = c / (cols - 1) - 0.5;
          var x0 = u * 1960 * spread, x1 = u * 1960 * (0.32 + 0.68 * ((r - 1) / rows));
          D.line(x1, yPrev, x0, y);
        }
      }
    }, { z: 0.14, blur: 2.2 });
    /* the horizon measured */
    M.measure(-980, -40, 980, -40, { label: 'horizon', alpha: 0.5 });
    M.type('new world  ·  1 of 1', { x: 0, y: -350, size: 15, kind: 'mono', mode: 'light', alpha: 0.4, track: 3 });
    lyric(cue, p, { y: 420, size: 54, fit: 1440 });
  });

  /* ------------------------------------------------------------------ sim */
  EM.Scenes('boot.sim', function (w, p, cue) {
    var cols = 21, rows = 11, step = 78;
    var wave = w.t * 1.7;
    M.shadow(function () {
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          var x = (c - (cols - 1) / 2) * step;
          var y = (r - (rows - 1) / 2) * step + 20;
          var d = Math.hypot(x - w.lamp.x, y - w.lamp.y) / 720;
          var on = 0.5 + 0.5 * Math.sin(wave - d * 5.2);
          var s = 5 + on * 10;
          D.circle(x, y, s); D.fill();
          if (on > 0.82 && c < cols - 1) { D.lw(1.4); D.line(x, y, x + step, y); }
          if (on > 0.9 && r < rows - 1) { D.lw(1.4); D.line(x, y, x, y + step); }
        }
      }
    }, { z: 0.2, blur: 2.4 });
    M.type('cells 231   on ' + Math.floor(231 * (0.25 + 0.2 * Math.sin(wave))), { x: -760, y: -400, size: 15, kind: 'mono', mode: 'light', alpha: 0.4, align: 'left', track: 2 });
    lyric(cue, p, { y: 400, size: 56, fit: 1440 });
  });

  /* ------------------------------------------------------------------ run */
  EM.Scenes('boot.run', function (w, p, cue) {
    var t = w.t;
    var open = E.outCubic(clamp(p / 0.3, 0, 1));
    var ctx = D.ctx();
    M.shadow(function () {
      for (var i = 0; i < 3; i++) {
        var r = (180 + i * 130) * open;
        ctx.save(); ctx.translate(0, -30);
        ctx.rotate(t * (0.13 + i * 0.045) * (i % 2 ? -1 : 1) + i * 0.65);
        ctx.beginPath(); ctx.ellipse(0, 0, r, r * (0.4 + i * 0.06), 0, 0, TAU);
        D.lw(3 - i * 0.5); ctx.stroke(); ctx.restore();
      }
      var ang = t * 0.85;
      var px = Math.cos(ang) * 310, py = -30 + Math.sin(ang) * 310 * 0.46;
      D.circle(px, py, 12); D.fill();
      D.lw(1.6); D.line(0, -30, px, py);
      var sw = Math.sin(t * 1.05) * 0.4;
      D.lw(2.6); D.line(0, 90, Math.sin(sw) * 320, 90 + Math.cos(sw) * 340);
      D.circle(Math.sin(sw) * 320, 90 + Math.cos(sw) * 340, 16); D.fill();
      D.lw(1.4); D.circle(0, -30, 26); D.stroke();
    }, { z: 0.12, blur: 2 });
    M.rim(function () {
      D.lw(1);
      for (var i = 0; i < 3; i++) {
        var r = (180 + i * 130) * open;
        ctx.save(); ctx.translate(0, -30);
        ctx.rotate(t * (0.13 + i * 0.045) * (i % 2 ? -1 : 1) + i * 0.65);
        ctx.beginPath(); ctx.ellipse(0, 0, r, r * (0.4 + i * 0.06), 0, 0, TAU); ctx.stroke(); ctx.restore();
      }
    }, { z: 0.12, alpha: 0.14 });
    var bpm = 60 / EM.beatPeriod(t, 0.46);
    M.type('t ' + EM.fmtTime(t), { x: -780, y: -400, size: 16, mode: 'light', alpha: 0.45, track: 2, kind: 'mono', align: 'left' });
    M.type('n ' + EM.beatAt(t), { x: -780, y: -368, size: 16, mode: 'light', alpha: 0.45, track: 2, kind: 'mono', align: 'left' });
    M.type('bpm ' + bpm.toFixed(1), { x: 780, y: -400, size: 16, mode: 'light', alpha: 0.45, track: 2, kind: 'mono', align: 'right' });
    lyric(cue, p, { y: 360, size: 56, fit: 1440 });
  });
})(window.EM);
