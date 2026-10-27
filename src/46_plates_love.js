/* 46_plates_love.js — Act VI: candlelight, handwriting, and the last execution.
   The machine stops measuring here and starts writing by hand. */
(function (EM) {
  'use strict';
  var D = EM.D, M = EM.M, L = EM.Life, W = 1920, H = 1080;
  var E = EM.E, TAU = EM.TAU, clamp = EM.clamp, lerp = EM.lerp, hash = EM.hash, noise1 = EM.noise1;

  var LX = -110, LY = 250;   /* where the machine's cursor stands in this act */

  /* The candle is gone: no flame, no point light, no warm room. What stands
     where it stood is a phosphor cursor — a thin vertical bar of green light
     (emission only; it lights nothing else). */
  function flame(w, t, s) {
    var x = LX + 60, y = LY - 96;
    var ctx = D.ctx();
    var fl = 0.9 + 0.16 * (noise1(t * 2.7) - 0.5) + 0.05 * Math.sin(t * 9.0);
    var h = 108 * s * fl, wd = 5 * s * fl;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var g = ctx.createLinearGradient(x, y - h, x, y + h * 0.35);
    g.addColorStop(0, 'rgba(180,255,214,0)');
    g.addColorStop(0.22, 'rgba(150,255,196,0.55)');
    g.addColorStop(0.62, 'rgba(0,255,108,0.85)');
    g.addColorStop(1, 'rgba(0,255,108,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - wd * 0.5, y - h, wd, h * 1.35);
    /* the head of the cursor, and a slow scan ring at its foot */
    ctx.fillStyle = 'rgba(226,255,238,0.9)';
    ctx.fillRect(x - wd * 0.9, y - h - 3, wd * 1.8, 5);
    ctx.strokeStyle = 'rgba(0,255,108,0.30)';
    ctx.lineWidth = 1.2;
    var rr = (36 + 8 * Math.sin(t * 1.4)) * s;
    ctx.beginPath(); ctx.ellipse(x, y + 12, rr, rr * 0.30, 0, 0, TAU); ctx.stroke();
    ctx.restore();
  }

  function penPts(kind, p, seed) {
    var pts = [], n = 160, i, u, a, r;
    if (kind === 'spiral') {
      for (i = 0; i <= n; i++) {
        u = i / n;
        a = u * TAU * 3.6 - Math.PI * 0.5;
        r = 40 + u * 300;
        pts.push([LX + Math.cos(a) * r * 1.15,
          LY - 60 + Math.sin(a) * r * 0.72 - u * 30]);
      }
    } else if (kind === 'loop') {
      for (i = 0; i <= n; i++) {
        u = i / n;
        a = u * TAU * 1.35 - Math.PI * 0.55;
        r = 150 + 30 * Math.sin(u * Math.PI * 2);
        pts.push([LX + 40 + Math.cos(a) * r,
          LY - 150 + Math.sin(a) * r * 0.8]);
      }
    } else if (kind === 'question') {
      for (i = 0; i <= n; i++) {
        u = i / n;
        a = -Math.PI * 0.45 + u * Math.PI * 1.25;
        r = 120 * (1 - u * 0.25);
        pts.push([LX + 90 + Math.cos(a) * r,
          LY - 210 + Math.sin(a) * r * 0.75 + u * 60]);
      }
      pts.push([LX + 90, LY - 60]);
    } else if (kind === 'inf') {
      for (i = 0; i <= n; i++) {
        u = i / n;
        a = u * TAU * 2;
        pts.push([LX + 250 + Math.cos(a - Math.PI / 2) * 118 * (1 + 0.35 * Math.sin(a)),
          LY - 400 + Math.sin(a * 2) * 66]);
      }
    } else if (kind === 'rope') {
      for (i = 0; i <= n; i++) {
        u = i / n;
        a = -Math.PI * 0.2 + u * TAU * 1.15;
        r = 190 + 26 * Math.sin(u * TAU);
        pts.push([LX + 60 + Math.cos(a) * r,
          LY - 120 + Math.sin(a) * r * 0.62]);
      }
    }
    return pts;
  }

  /* ---------------------------------------------------------------- studied */
  EM.Scenes('lov.studied', function (w, p, cue) {
    var s = 0.6 + 0.4 * E.outCubic(clamp(p / 0.5, 0, 1));
    flame(w, w.t, s);
    /* a wire comes down out of the dark to the flame */
    M.shadow(function () {
      D.lw(2.4); D.line(-520, -540, LX - 60, LY - 300);
      D.lw(1.6); D.line(LX - 60, LY - 300, LX - 20, LY - 120);
    }, { z: 0.5, blur: 3.2 });
    M.lyric(cue, p, { y: -110, size: 54, mode: 'light', alpha: 0.95 });
  });

  /* -------------------------------------------------------------- properly */
  EM.Scenes('lov.properly', function (w, p, cue) {
    flame(w, w.t, 1);
    var pts = penPts('spiral', p, 3);
    M.pen(pts, { reveal: clamp(p / 0.9, 0, 1), w: 2.2, seed: 11, jitter: 2.2 });
    /* the machine's trace quietly gives up its measurements */
    M.type('trace  off', { x: -780, y: -400, size: 14, kind: 'mono', mode: 'light', alpha: 0.12 * (1 - p), align: 'left' });
    M.lyric(cue, p, { y: -230, size: 54, mode: 'light' });
  });

  /* -------------------------------------------------------------- question */
  EM.Scenes('lov.question', function (w, p, cue) {
    flame(w, w.t, 1);
    var pts = penPts('question', p, 5);
    M.pen(pts, { reveal: clamp(p / 0.85, 0, 1), w: 2.6, seed: 23, jitter: 2.6 });
    M.lyric(cue, p, { y: -300, size: 52, mode: 'light' });
  });

  /* ---------------------------------------------------------------- answer */
  EM.Scenes('lov.answer', function (w, p, cue) {
    flame(w, w.t, 1);
    var pts = penPts('loop', p, 7);
    M.pen(pts, { reveal: clamp(p / 0.8, 0, 1), w: 2.2, seed: 31, jitter: 2.0 });
    M.hand('lo-o-ove', LX + 40, LY - 40, { size: 78, reveal: clamp((p - 0.2) / 0.6, 0, 1), alpha: 0.88, seed: 9, track: 6 });
    M.lyric(cue, p, { y: -300, size: 50, mode: 'light' });
  });

  /* --------------------------------------------------------------- algebra */
  EM.Scenes('lov.algebra', function (w, p, cue) {
    flame(w, w.t, 1);
    var r1 = clamp((p - 0.05) / 0.2, 0, 1);
    var r2 = clamp((p - 0.25) / 0.2, 0, 1);
    var r3 = clamp((p - 0.45) / 0.2, 0, 1);
    var r4 = clamp((p - 0.68) / 0.28, 0, 1);
    M.hand('lim', -520, -150, { size: 64, reveal: r1, alpha: 0.88, seed: 41, track: 4 });
    M.hand('you -> me', -420, -96, { size: 26, reveal: r2, alpha: 0.62, seed: 43, track: 3 });
    M.hand('love =', -230, -150, { size: 64, reveal: r3, alpha: 0.9, seed: 47, track: 4 });
    var pts = penPts('inf', p, 9);
    M.pen(pts, { reveal: r4, w: 4.6, seed: 53, jitter: 2.6 });
    /* the equation is the only instrument left, and it is wrong in a human way */
    M.lyric(cue, p, { y: 330, size: 52, mode: 'light', alpha: 0.92 });
  });

  /* ------------------------------------------------------------------ free */
  EM.Scenes('lov.free', function (w, p, cue) {
    /* a door of light opens on the wall, and the flame drifts toward it */
    var ctx = D.ctx();
    var a = clamp(p / 0.6, 0, 1);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.filter = 'blur(26px)';
    var g = ctx.createLinearGradient(-700, 0, -380, 0);
    g.addColorStop(0, 'rgba(255,214,150,0)');
    g.addColorStop(0.5, 'rgba(255,220,165,' + (0.16 * a) + ')');
    g.addColorStop(1, 'rgba(255,214,150,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-700, -420, 320, 860);
    ctx.filter = 'none';
    ctx.restore();
    flame(w, w.t, 1 - p * 0.25);
    /* the small shadow that stayed behind */
    M.shadow(function () { D.circle(LX + 30, LY + 90, 26); D.fill(); }, { z: 0.45, blur: 3 });
    M.lyric(cue, p, { y: -300, size: 50, mode: 'light' });
  });

  /* --------------------------------------------------------------- trapped */
  EM.Scenes('lov.trapped', function (w, p, cue) {
    flame(w, w.t, 1);
    M.shadow(function () { D.circle(LX + 70, LY - 40, 30); D.fill(); }, { z: 0.42, blur: 2.4 });
    var pts = penPts('rope', p, 11);
    M.pen(pts, { reveal: clamp(p / 0.9, 0, 1), w: 2.4, seed: 61, jitter: 2.0 });
    M.lyric(cue, p, { y: -300, size: 50, mode: 'light' });
  });

  /* ---------------------------------------------------------------- loove2 */
  EM.Scenes('lov.loove2', function (w, p, cue) {
    flame(w, w.t, 0.9);
    var ctx = D.ctx();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(255,206,150,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(LX + 20, LY - 110, 200, 120, -0.2, 0, TAU);
    ctx.stroke();
    ctx.restore();
    M.lyric(cue, p, { y: -300, size: 50, mode: 'light' });
  });

  /* ------------------------------------------------------------------ loop */
  EM.Scenes('lov.loop', function (w, p, cue) {
    var t = w.t;
    var s = 1 - 0.35 * p;
    flame(w, t, s);
    /* one open spiral, drawn slowly, that never closes */
    var pts = [];
    var n = 220;
    for (var i = 0; i <= n; i++) {
      var u = i / n;
      var a = u * TAU * 2.15 - Math.PI * 0.62;
      var r = 46 + u * 380;
      pts.push([LX + Math.cos(a) * r * 1.2 + 20, LY - 40 + Math.sin(a) * r * 0.66 - u * 24]);
    }
    M.pen(pts, { reveal: E.outCubic(clamp(p / 0.86, 0, 1)), w: 2.0, seed: 71, jitter: 1.8 });
    /* the last of the world's dust, and the candle burning down */
    M.type('love = 1.000', { x: 700, y: 330, size: 14, kind: 'mono', mode: 'light', align: 'right', alpha: 0.16 * (1 - p) });
  });

  /* ------------------------------------------------------------- exe.final */
  EM.Scenes('exe.final', function (w, p, cue) {
    var ink = clamp(1.25 - p * 1.9, 0, 1);          /* the word as a shadow while there is light */
    var light = clamp((p - 0.16) / 0.22, 0, 1) * clamp(1 - (p - 0.34) / 0.32, 0, 1);
    flame(w, w.t, 0.5 * clamp(1 - p * 2.2, 0, 1));
    /* the last impact, once */
    var hit = Math.pow(clamp(1 - p / 0.12, 0, 1), 2);
    if (hit > 0.01) {
      M.shadow(function () {
        D.lw(2); D.circle(0, -20, 260 + 420 * hit); D.stroke();
      }, { z: 0.2, blur: 6 });
    }
    M.type('EXECUTION', { x: 0, y: -20, size: 150, mode: 'ink', alpha: ink * 0.95, track: 2, kind: 'cond', weight: 700 });
    if (light > 0.01) M.type('EXECUTION', { x: 0, y: -20, size: 150, mode: 'light', alpha: light * 0.55, track: 2, kind: 'cond', weight: 300 });
    /* the centre measured one last time and then left alone */
    var cross = clamp(1 - p / 0.3, 0, 1);
    if (cross > 0.01) M.crosshair(0, -20, 320, { alpha: 0.35 * cross, ticks: true });
  });
})(window.EM);
