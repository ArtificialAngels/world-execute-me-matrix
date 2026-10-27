/* 41_plates_theorem.js — Act I. The machine proves itself by being measured:
   a set of points, a dimension, a circle, a sine, infinity, limits — each one
   laid on the wall and read off with a cold instrument. Warm body, one ink
   shadow, and the trace cutting across it. Every plate ends with one number. */
(function (EM) {
  'use strict';
  var D = EM.D, M = EM.M, L = EM.Life, W = 1920, H = 1080;
  var E = EM.E, TAU = EM.TAU, clamp = EM.clamp, lerp = EM.lerp, mix = EM.mix;
  var hash = EM.hash, rgba = EM.rgba, smoothstep = EM.smoothstep;
  var PI = Math.PI;

  /* ================================================================ kit ====
     One instrument for the whole act: the same cold hairline, the same end
     ticks, the same mono reading. Nothing here draws a body. */
  function cool(w, a) {
    D.strokeStyle(w.pal.trace, a);
    D.fillStyle(w.pal.trace, a);
  }
  function num(w, str, x, y, size, a, align) {
    if (a <= 0.004) return;
    D.text(str, x, y, {
      size: size || 15, kind: 'mono', weight: 400, align: align || 'center',
      tracking: size >= 20 ? 1.6 : 1.2, color: rgba(w.pal.trace, a)
    });
  }
  function seg(w, x1, y1, x2, y2, a) {
    cool(w, a == null ? 0.42 : a); D.lw(1); D.line(x1, y1, x2, y2);
  }
  /* an arrow head pointing along ang */
  function head(w, x, y, ang, s, a) {
    cool(w, a == null ? 0.5 : a); D.lw(1.15);
    D.line(x, y, x - Math.cos(ang - 0.4) * s, y - Math.sin(ang - 0.4) * s);
    D.line(x, y, x - Math.cos(ang + 0.4) * s, y - Math.sin(ang + 0.4) * s);
  }
  /* cold ruler: body line, ticks, end caps, one label */
  function ruler(w, x1, y1, x2, y2, o) {
    o = o || {};
    var a = o.alpha == null ? 0.4 : o.alpha;
    var lx = x2 - x1, ly = y2 - y1, len = Math.hypot(lx, ly);
    if (len < 2) return;
    var ang = Math.atan2(ly, lx);
    var nx = -Math.sin(ang), ny = Math.cos(ang);
    cool(w, a); D.lw(1); D.line(x1, y1, x2, y2);
    var n = Math.max(2, Math.round(len / (o.step || 46)));
    for (var i = 0; i <= n; i++) {
      var u = i / n, x = x1 + lx * u, y = y1 + ly * u;
      var big = (i % 2 === 0) || i === n;
      var t = big ? (o.tick || 9) : (o.tick || 9) * 0.55;
      D.lw(big ? 1.05 : 0.75);
      D.line(x - nx * t, y - ny * t, x + nx * t, y + ny * t);
    }
    D.lw(1.3);
    D.line(x1 - nx * (o.cap || 15), y1 - ny * (o.cap || 15), x1 + nx * (o.cap || 15), y1 + ny * (o.cap || 15));
    D.line(x2 - nx * (o.cap || 15), y2 - ny * (o.cap || 15), x2 + nx * (o.cap || 15), y2 + ny * (o.cap || 15));
    if (o.label) {
      var mx = (x1 + x2) / 2 + nx * (o.lift == null ? 26 : o.lift);
      var my = (y1 + y2) / 2 + ny * (o.lift == null ? 26 : o.lift);
      num(w, o.label, mx, my, o.labelSize || 15, o.labelAlpha == null ? 0.52 : o.labelAlpha, o.align || 'center');
    }
  }
  /* a measured span: line with arrow heads at both ends */
  function dimline(w, x1, y1, x2, y2, o) {
    o = o || {};
    var a = o.alpha == null ? 0.4 : o.alpha;
    var ang = Math.atan2(y2 - y1, x2 - x1);
    var nx = -Math.sin(ang), ny = Math.cos(ang), off = o.off == null ? 0 : o.off;
    x1 += nx * off; y1 += ny * off; x2 += nx * off; y2 += ny * off;
    cool(w, a); D.lw(1); D.line(x1, y1, x2, y2);
    head(w, x1, y1, ang + PI, 11, a); head(w, x2, y2, ang, 11, a);
    if (o.label) {
      var lift = o.lift == null ? 20 : o.lift;
      num(w, o.label, (x1 + x2) / 2 + nx * lift, (y1 + y2) / 2 + ny * lift, o.labelSize || 15, o.labelAlpha == null ? 0.55 : o.labelAlpha);
    }
  }
  /* a cold tick on an ellipse: at parameter a, length len, pointing outward */
  function ellTick(w, cx, cy, rx, ry, rot, a, len, alpha) {
    var ca = Math.cos(a), sa = Math.sin(a);
    var ex = ca * rx, ey = sa * ry;
    var nx = ca / Math.max(1e-4, rx), ny = sa / Math.max(1e-4, ry);
    var nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
    var cr = Math.cos(rot), sr = Math.sin(rot);
    var px = cx + ex * cr - ey * sr, py = cy + ex * sr + ey * cr;
    var qx = nx * cr - ny * sr, qy = nx * sr + ny * cr;
    cool(w, alpha); D.lw(1);
    D.line(px, py, px + qx * len, py + qy * len);
  }
  /* wall position of a body point at depth z */
  function kz(z) { return 1 / (1 - clamp(z, 0, 0.93)); }
  function proj(w, z, x, y) {
    var k = kz(z), lam = w.lamp;
    return [lam.x + (x - lam.x) * k, lam.y + (y - lam.y) * k];
  }
  /* a small surveyed point marker */
  function survey(w, x, y, r, a) {
    cool(w, a); D.lw(1);
    D.circle(x, y, r); D.stroke();
    D.line(x - r - 5, y, x - r + 1, y); D.line(x + r - 1, y, x + r + 5, y);
    D.line(x, y - r - 5, x, y - r + 1); D.line(x, y + r - 1, x, y + r + 5);
  }
  /* the act's lyric hand */
  function say(cue, p, o) {
    o = o || {};
    M.lyric(cue, p, {
      y: o.y == null ? 330 : o.y, size: o.size || 58, fit: o.fit || 1460,
      mode: o.mode, alpha: o.alpha
    });
  }

  /* ============================================================ 1 points == */
  EM.Scenes('thm.points', function (w, p, cue) {
    var z = 0.14 + 0.16 * E.outCubic(clamp(p / 0.5, 0, 1));
    var aIn = E.outCubic(clamp(p / 0.16, 0, 1));
    var pts = [];
    M.shadow(function () {
      pts = M.constel({ n: 9, r: 150, cx: -140, cy: -70, seed: 5, squash: 0.9, dot: 5.4, link: true });
    }, { z: z, blur: 2.2, alpha: aIn });
    M.rim(function () {
      M.constel({ n: 9, r: 150, cx: -140, cy: -70, seed: 5, squash: 0.9, dot: 2.4, link: false });
    }, { z: z, alpha: 0.2 });

    /* each point gets surveyed: a ring lands, the count goes up */
    var P = [], i;
    for (i = 0; i < pts.length; i++) P.push(proj(w, z, pts[i][0], pts[i][1]));
    var shown = 0;
    for (i = 0; i < P.length; i++) {
      var u = clamp((p - 0.08 - i * 0.052) / 0.15, 0, 1);
      if (u <= 0) continue;
      shown = i + 1;
      survey(w, P[i][0], P[i][1], lerp(15, 8, u), 0.24 + 0.26 * u);
    }
    /* the span ruler underneath the lattice */
    var minX = 1e9, maxX = -1e9;
    for (i = 0; i < shown; i++) { minX = Math.min(minX, P[i][0]); maxX = Math.max(maxX, P[i][0]); }
    var ry = 232, grow = E.outCubic(clamp((p - 0.1) / 0.55, 0, 1));
    if (shown > 1) {
      var x0 = minX - 40, x1 = maxX + 34;
      ruler(w, x0, ry, x0 + (x1 - x0) * grow, ry, { alpha: 0.3, label: 'span', lift: 26 });
      for (i = 0; i < shown; i++) {
        cool(w, 0.22); D.lw(0.8); D.line(P[i][0], ry, P[i][0], ry - 16);
      }
    }
    num(w, 'n = ' + shown, (shown > 1 ? Math.max(maxX + 52, 300) : 300), ry - 2, 26, 0.62, 'left');
    num(w, 'points', (shown > 1 ? Math.max(maxX + 54, 302) : 302), ry + 26, 13, 0.34, 'left');
    say(cue, p);
  });

  /* ========================================================= 2 dimension == */
  EM.Scenes('thm.dimension', function (w, p, cue) {
    var n = 9, i;
    var lift = E.outCubic(clamp((p - 0.06) / 0.7, 0, 1));
    var z = 0.26 + 0.18 * lift;
    var baseY = 96, x0 = -120, dx = 45;
    var h = [];
    for (i = 0; i < n; i++) h.push(0);

    M.shadow(function () {
      D.lw(2.8);
      D.line(x0 - 26, baseY, x0 + dx * (n - 1) + 26, baseY);
      D.lw(1.4);
      for (var bt = 0; bt <= n + 1; bt++) {
        var bx = x0 - 22 + bt * (dx * (n - 1) + 44) / (n + 1);
        D.line(bx, baseY - 9, bx, baseY + 9);
      }
      for (i = 0; i < n; i++) {
        var hi = (72 + 128 * hash(i * 17 + 3)) * clamp((p - 0.06 - i * 0.036) / 0.5, 0, 1);
        hi = hi * hi * (3 - 2 * hi) * 0; /* keep smooth below */
        var e = clamp((p - 0.06 - i * 0.036) / 0.5, 0, 1);
        hi = (72 + 128 * hash(i * 17 + 3)) * smoothstep(e);
        h[i] = hi;
        var x = x0 + i * dx;
        D.lw(2.4); D.line(x, baseY, x, baseY - hi);
        D.circle(x, baseY - hi, 5.4); D.fill();
        D.circle(x, baseY, 3.8); D.fill();
      }
    }, { z: z, blur: 2.2 });
    M.rim(function () {
      D.lw(1);
      for (i = 0; i < n; i++) {
        var x = x0 + i * dx;
        D.line(x, baseY, x, baseY - h[i]);
        D.circle(x, baseY - h[i], 3.2); D.stroke();
      }
    }, { z: z, alpha: 0.2 });

    /* the third axis: vertical, arrowed, ticked — the dimension itself */
    var ax = 300, top = -330, bot = 206;
    var axisA = 0.28 + 0.26 * lift;
    cool(w, axisA); D.lw(1.1);
    D.line(ax, bot, ax, top);
    head(w, ax, top, -PI / 2, 13, axisA);
    for (i = 0; i <= 4; i++) {
      var ty = lerp(bot, top + 30, i / 4);
      D.lw(1); D.line(ax - 7, ty, ax + 7, ty);
      num(w, String(i), ax + 22, ty, 13, 0.38 * (0.4 + lift), 'left');
    }
    num(w, 'dim = ' + (1 + 2 * smoothstep(clamp((lift - 0.05) / 0.55, 0, 1))).toFixed(1),
      ax + 6, top - 34, 18, 0.6, 'center');
    /* the base line, measured flat */
    dimline(w, -308, bot, ax, bot, { alpha: 0.24, label: '' });
    num(w, 'n = 9', -300, bot - 20, 14, 0.34, 'left');
    cool(w, 0.2); D.lw(1);
    for (var q2 = 0; q2 < n; q2++) D.line(proj(w, z, x0 + q2 * dx, baseY)[0], bot, proj(w, z, x0 + q2 * dx, baseY)[0], bot - 9);
    say(cue, p);
  });

  /* ============================================================ 3 circle == */
  EM.Scenes('thm.circle', function (w, p, cue) {
    var z = 0.3, k = kz(z);
    var cx = -150, cy = -60, r = 165;
    var tilt = E.inOutQuad(clamp((p - 0.36) / 0.5, 0, 1));
    var ry = r * (1 - 0.34 * tilt);
    var lean = -0.15 + 0.07 * tilt;

    M.shadow(function () {
      D.lw(2.2);
      D.ellipse(cx, cy, r, ry, lean); D.stroke();
      D.lw(1.1);
      D.ellipse(cx, cy, r - 9, ry - 9 * (ry / r), lean); D.stroke();
      for (var i = 0; i < 30; i++) {
        var a = i / 30 * TAU;
        var ca = Math.cos(a), sa = Math.sin(a);
        var ex = ca * r, ey = sa * ry;
        var nx = ca / r, ny = sa / Math.max(1, ry);
        var nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
        var cr = Math.cos(lean), sr = Math.sin(lean);
        var px = cx + ex * cr - ey * sr, py = cy + ex * sr + ey * cr;
        var qx = nx * cr - ny * sr, qy = nx * sr + ny * cr;
        D.lw(i % 5 === 0 ? 1.6 : 0.9);
        D.line(px, py, px + qx * 13, py + qy * 13);
      }
    }, { z: z, blur: 2.3 });
    M.rim(function () {
      D.lw(1); D.ellipse(cx, cy, r, ry, lean); D.stroke();
    }, { z: z, alpha: 0.18 });

    /* the cold instrument ring: ticks land around the projected hoop */
    var c = proj(w, z, cx, cy);
    var rx = r * k, ryy = ry * k;
    var sweep = clamp((p - 0.06) / 0.62, 0, 1);
    var cnt = Math.floor(28 * sweep);
    for (var j = 0; j < cnt; j++) {
      var an = -PI / 2 + (j / 28) * TAU;
      ellTick(w, c[0], c[1], rx + 7, ryy + 7, lean, an, j % 7 === 0 ? 14 : 7, 0.2 + 0.3 * (j % 7 === 0 ? 1 : 0.5));
    }
    /* radius measured once, from the middle out */
    var ra = -0.42 + 0.1 * Math.sin(w.t * 0.7);
    var e0 = [c[0] + Math.cos(ra) * rx * Math.cos(lean) - Math.sin(ra) * ryy * Math.sin(lean),
              c[1] + Math.cos(ra) * rx * Math.sin(lean) + Math.sin(ra) * ryy * Math.cos(lean)];
    var radA = clamp((p - 0.34) / 0.3, 0, 1);
    if (radA > 0) {
      var ex2 = c[0] + (e0[0] - c[0]) * radA, ey2 = c[1] + (e0[1] - c[1]) * radA;
      dimline(w, c[0], c[1], ex2, ey2, { alpha: 0.3, label: '', off: 0 });
      survey(w, c[0], c[1], 6, 0.3);
      num(w, 'r = 1.000', c[0] + (e0[0] - c[0]) * 0.55, c[1] + (e0[1] - c[1]) * 0.55 - 22, 15, 0.5);
    }
    num(w, 'e = ' + (1 - ry / r).toFixed(3), c[0] + rx + 34, c[1] + ryy + 30, 15, 0.34 * (0.4 + tilt), 'left');
    say(cue, p);
  });

  /* ===================================================== 4 circumference == */
  EM.Scenes('thm.circumference', function (w, p, cue) {
    var z = 0.3;
    var cx = -300, cy = -130, r = 125;
    var th = TAU * clamp(p / 0.66, 0, 1);
    var ln = r * th;
    var ly = cy + r + 100;
    var lx0 = cx - r;
    var a0 = PI / 2;
    var da = [cx + Math.cos(a0 + th) * r, cy + Math.sin(a0 + th) * r];

    M.shadow(function () {
      D.lw(1.3);
      D.circle(cx, cy, r); D.stroke();
      if (th > 0.02) { D.lw(3.4); D.circle(cx, cy, r, a0, a0 + th); D.stroke(); }
      if (ln > 1) {
        D.lw(3.4); D.line(lx0, ly, lx0 + ln, ly);
        D.lw(1.1); D.line(lx0, ly - 12, lx0 + ln, ly - 12);
      }
      D.circle(da[0], da[1], 7); D.fill();
      if (ln > 1) { D.circle(lx0 + ln, ly, 7); D.fill(); }
    }, { z: z, blur: 2.3 });
    M.rim(function () {
      D.lw(1); D.circle(cx, cy, r); D.stroke();
      D.circle(da[0], da[1], 3.4); D.stroke();
    }, { z: z, alpha: 0.16 });

    /* ruler under the unrolled length, in real numbers */
    var pA = proj(w, z, lx0, ly), pB = proj(w, z, lx0 + ln, ly);
    if (ln > 8) {
      ruler(w, pA[0], pA[1] + 66, pB[0], pB[1] + 66, { alpha: 0.3, step: 52 });
      num(w, 's = ' + (6.2832 * th / TAU).toFixed(4), (pA[0] + pB[0]) / 2, pA[1] + 100, 17, 0.55);
    }
    /* the radius, measured inside the circle */
    var pc = proj(w, z, cx, cy);
    var pe = proj(w, z, cx + r, cy);
    dimline(w, pc[0], pc[1], pe[0], pe[1], { alpha: 0.26, label: '' });
    num(w, 'r = 1.000', (pc[0] + pe[0]) / 2, pc[1] + 20, 14, 0.44);
    num(w, 'C = 2 pi r = 6.2832', Math.min(pB[0] + 22, 660), pA[1] + 34, 14,
      0.44 * clamp((p - 0.24) / 0.26, 0, 1), 'left');
    say(cue, p);
  });

  /* ============================================================== 5 sine == */
  EM.Scenes('thm.sine', function (w, p, cue) {
    var z = 0.37, cy = -30, amp = 97, per = 430, ph = -w.t * 2.0;
    var x0 = -620, x1 = 620;
    var breathe = 0.94 + 0.06 * Math.sin(p * PI);
    var A = amp * breathe;
    function env(u) { return A * (0.6 + 0.4 * Math.sin(u * PI)); }
    function yy(x, k) {
      var u = (x - x0) / (x1 - x0);
      return cy + Math.sin((x / per) * TAU + k * 0.7 + ph) * env(u) + k * 11;
    }
    M.shadow(function () {
      D.begin();
      for (var x = x0; x <= x1; x += 10) {
        if (x === x0) D.move(x, yy(x, 0)); else D.to(x, yy(x, 0));
      }
      for (x = x1; x >= x0; x -= 10) D.to(x, yy(x, 2));
      D.close(); D.fill();
      M.waves({ n: 3, amp: A, per: per, cy: cy, gap: 11, phase: ph, x0: x0, x1: x1, lw: 2.6 });
    }, { z: z, blur: 3, alpha: 0.95 });
    M.rim(function () {
      D.lw(1); D.begin();
      for (var x = x0; x <= x1; x += 12) {
        if (x === x0) D.move(x, yy(x, 1)); else D.to(x, yy(x, 1));
      }
      D.stroke();
    }, { z: z, alpha: 0.15 });

    /* the two limits: dashed, cold, hugging the wave's own envelope */
    D.dash([7, 9]); D.lw(1);
    for (var s = -1; s <= 1; s += 2) {
      cool(w, 0.26); D.begin();
      for (var x = x0; x <= x1; x += 9) {
        var u = (x - x0) / (x1 - x0);
        var q = proj(w, z, x, cy + s * env(u));
        if (x === x0) D.move(q[0], q[1]); else D.to(q[0], q[1]);
      }
      D.stroke();
    }
    D.dash([]);
    var qa = proj(w, z, x0 + 10, cy - env(0.02)), qb = proj(w, z, x0 + 10, cy + env(0.02));
    num(w, '+1.00', qa[0] - 26, qa[1], 15, 0.42, 'right');
    num(w, '-1.00', qb[0] - 26, qb[1], 15, 0.42, 'right');
    /* one wavelength, measured peak to peak */
    var xp = x0 + per * 1.5;
    var xp2 = xp + per;
    var r1 = proj(w, z, xp, cy - env((xp - x0) / (x1 - x0)));
    var r2 = proj(w, z, xp2, cy - env((xp2 - x0) / (x1 - x0)));
    var ly = -318;
    cool(w, 0.24); D.lw(0.8);
    D.line(r1[0], r1[1], r1[0], ly + 14);
    D.line(r2[0], r2[1], r2[0], ly + 14);
    dimline(w, r1[0], ly, r2[0], ly, { alpha: 0.3, label: 'lambda', lift: -20 });
    say(cue, p);
  });

  /* ========================================================== 6 tangents == */
  EM.Scenes('thm.tangents', function (w, p, cue) {
    var z = 0.3, k = kz(z);
    var cy = -40, amp = 96, per = 380, x0 = -520, x1 = 520;
    var n = 9;
    function yy(x) { return cy + Math.sin((x / per) * TAU + w.t * 0.5) * amp; }
    function slope(x) { return Math.cos((x / per) * TAU + w.t * 0.5) * amp * (TAU / per); }
    var segs = [];
    for (var i = 0; i < n; i++) {
      var xx = lerp(x0 + 40, x1 - 40, i / (n - 1));
      var u = clamp((p - 0.05 - i * 0.056) / 0.34, 0, 1);
      segs.push({ x: xx, y: yy(xx), m: slope(xx), u: E.outCubic(u) });
    }
    M.shadow(function () {
      D.lw(3); D.begin();
      for (var x = x0; x <= x1; x += 8) {
        var y = yy(x);
        if (x === x0) D.move(x, y); else D.to(x, y);
      }
      D.stroke();
      D.lw(1.8);
      for (i = 0; i < n; i++) {
        var s = segs[i];
        if (s.u <= 0) continue;
        var d = 150 * s.u;
        D.line(s.x - d, s.y - s.m * d, s.x + d, s.y + s.m * d);
      }
    }, { z: z, blur: 2.4 });
    M.rim(function () {
      D.lw(1.2); D.begin();
      for (var x = x0; x <= x1; x += 10) {
        var y = yy(x);
        if (x === x0) D.move(x, y); else D.to(x, y);
      }
      D.stroke();
      for (i = 0; i < n; i++) {
        var s = segs[i];
        if (s.u <= 0.4) continue;
        D.circle(s.x, s.y, 5); D.fill();
      }
    }, { z: z, alpha: 0.24 });

    /* readings on three of them */
    for (i = 1; i < n; i += 3) {
      var s = segs[i];
      if (s.u <= 0.5) continue;
      var q = proj(w, z, s.x, s.y);
      var len = Math.hypot(1, s.m);
      var ux = -s.m / len, uy = 1 / len;
      cool(w, 0.3); D.lw(0.8);
      D.line(q[0] + ux * 12, q[1] + uy * 12, q[0] + ux * 34, q[1] + uy * 34);
      num(w, 'm = ' + (s.m < 0 ? '' : '+') + s.m.toFixed(2), q[0] + ux * 62, q[1] + uy * 62, 13, 0.4);
      survey(w, q[0], q[1], 9, 0.24);
    }
    num(w, 'dy/dx', x1 * 0.0 + 150, cy + amp + 120, 14, 0.3);
    say(cue, p);
  });

  /* ========================================================= 7 infinity == */
  EM.Scenes('thm.infinity', function (w, p, cue) {
    var z = 0.28;
    var v = [170, -80], c0 = [-170, -40];
    var n = 10, i;
    var keep = 1 - smoothstep(clamp((p - 0.8) / 0.18, 0, 1));
    M.shadow(function () {
      for (i = 0; i < n; i++) {
        var s = Math.pow(0.76, i);
        var u = clamp((p - i * 0.055) / 0.3, 0, 1);
        if (u <= 0) continue;
        var cx = v[0] + (c0[0] - v[0]) * s;
        var cy = v[1] + (c0[1] - v[1]) * s;
        var ww = 540 * s, hh = 320 * s;
        D.lw(lerp(2.4, 0.8, i / (n - 1)));
        D.rect(cx - ww / 2, cy - hh / 2, ww, hh);
        D.stroke();
        if (i === 0) {
          D.lw(0.85);
          D.line(cx - ww / 2, cy - hh / 2, v[0], v[1]);
          D.line(cx + ww / 2, cy - hh / 2, v[0], v[1]);
          D.line(cx - ww / 2, cy + hh / 2, v[0], v[1]);
          D.line(cx + ww / 2, cy + hh / 2, v[0], v[1]);
        }
      }
    }, { z: z, blur: 2.2, alpha: keep });
    /* the far point: at the end only this is left, and it glows */
    var q = proj(w, z, v[0], v[1]);
    var endA = smoothstep(clamp((p - 0.72) / 0.24, 0, 1));
    if (endA > 0) {
      M.pierce(q[0], q[1], 26 + 40 * endA, { alpha: 0.5 * endA });
      M.pierce(q[0], q[1], 7, { alpha: 0.9 });
    }
    /* the counter: a cold ladder of how many frames have gone in */
    var ladX = -600, ladY = -120;
    var shown = 0;
    for (i = 0; i < n; i++) if (p > i * 0.055) shown = i + 1;
    num(w, 'n -> oo', ladX, ladY - 30, 16, 0.5, 'left');
    for (i = 0; i < n; i++) {
      var on = i < shown ? 1 : 0.25;
      cool(w, 0.16 + 0.3 * on); D.lw(1);
      D.line(ladX, ladY + i * 22, ladX + (on ? 34 : 18), ladY + i * 22);
    }
    num(w, shown + ' / 10', ladX, ladY + n * 22 + 8, 13, 0.34, 'left');
    say(cue, p);
  });

  /* =========================================================== 8 limits == */
  EM.Scenes('thm.limits', function (w, p, cue) {
    var z = 0.3;
    var q = smoothstep(clamp((p - 0.12) / 0.6, 0, 1));
    var limBody = 150, cx = 170, n = 8, i;
    var pLim = proj(w, z, cx, limBody);
    var yLim = pLim[1];
    M.shadow(function () {
      for (i = 0; i < n; i++) {
        var ww = 520 * Math.pow(0.86, i), hh = 200 * Math.pow(0.78, i);
        var gap = 14 * Math.pow(0.55, i) * (1 - q);
        var top = limBody - hh - gap;
        D.lw(lerp(2.2, 0.9, i / (n - 1)));
        D.rect(cx - ww / 2, top, ww, hh); D.stroke();
        if (i === 0) { D.lw(0.9); D.line(cx - ww / 2, top + hh, cx + ww / 2, top + hh); }
      }
    }, { z: z, blur: 2.2 });

    /* the limit: one cold horizontal, everything stops above it */
    cool(w, 0.42); D.lw(1.15);
    D.line(-620, yLim, 720, yLim);
    D.lw(1);
    for (i = 0; i <= 12; i++) {
      var tx = lerp(-620, 720, i / 12);
      D.line(tx, yLim, tx, yLim + (i % 3 === 0 ? 11 : 6));
    }
    num(w, 'lim', -656, yLim - 4, 16, 0.5, 'left');
    num(w, '1.000', 640, yLim - 22, 17, 0.55, 'right');
    /* vertical ruler: how far each frame still is from the line */
    var rx = 700;
    ruler(w, rx, yLim, rx, yLim - 300, { alpha: 0.26, step: 54, label: '', cap: 13 });
    for (i = 0; i < 3; i++) {
      num(w, (0.2 + i * 0.3).toFixed(1), rx + 14, yLim - 60 - i * 90, 12, 0.3, 'left');
    }
    var dTop = proj(w, z, cx, limBody - 200 * Math.pow(0.78, 0) - 14);
    dimline(w, -400, dTop[1], -400, yLim, { alpha: 0.24, label: '' });
    num(w, 'gap = ' + (14 * (1 - q)).toFixed(2), -412, (dTop[1] + yLim) / 2, 13, 0.4, 'right');
    say(cue, p);
  });

  /* ========================================================== 9 current == */
  EM.Scenes('thm.current', function (w, p, cue) {
    var z = 0.34, k = kz(z);
    var PX = -10, PY = -250, ROD = 268;
    function amp(pp) { return 0.62 * (1 - 0.95 * smoothstep(clamp((pp - 0.44) / 0.44, 0, 1))); }
    function ang(pp) { return amp(pp) * Math.sin(pp * TAU * 2.6); }
    function bob(pp) {
      var a = ang(pp);
      return [PX + Math.sin(a) * ROD, PY + Math.cos(a) * ROD];
    }
    var b = bob(p), A = amp(p);

    /* ghosts: the shadow remembering the swing it just left */
    for (var g = 2; g >= 1; g--) {
      var gg = bob(Math.max(0.001, p - 0.05 * g));
      M.shadow(function () {
        D.circle(gg[0], gg[1], 26); D.fill();
      }, { z: z, blur: 6, alpha: 0.13 });
    }
    M.shadow(function () {
      D.lw(2.4);
      D.line(PX - 168, PY - 20, PX + 168, PY - 20);
      D.line(PX, PY - 20, b[0], b[1]);
      D.circle(b[0], b[1], 27); D.fill();
      D.lw(1.3); D.circle(b[0], b[1], 36); D.stroke();
    }, { z: z, blur: 2.2 });
    M.rim(function () {
      D.lw(1.1); D.line(PX - 168, PY - 20, PX + 168, PY - 20);
      D.circle(b[0], b[1], 27); D.stroke();
      D.circle(PX, PY - 20, 5); D.stroke();
    }, { z: z, alpha: 0.22 });

    /* the arc the bob's shadow rides, and the displacement read off it */
    var qp = proj(w, z, PX, PY - 20);
    var R = ROD * k;
    var aa = PI / 2 - A, ab = PI / 2 + A;
    cool(w, 0.22); D.lw(0.9); D.dash([5, 7]);
    D.begin();
    for (var t = 0; t <= 1.001; t += 0.05) {
      var an = lerp(aa, ab, t);
      var ax2 = qp[0] + Math.cos(an) * R, ay2 = qp[1] + Math.sin(an) * R;
      if (t === 0) D.move(ax2, ay2); else D.to(ax2, ay2);
    }
    D.stroke();
    D.dash([]);
    cool(w, 0.3); D.lw(1);
    D.line(qp[0] + Math.cos(aa) * (R - 16), qp[1] + Math.sin(aa) * (R - 16), qp[0] + Math.cos(aa) * (R + 16), qp[1] + Math.sin(aa) * (R + 16));
    D.line(qp[0] + Math.cos(ab) * (R - 16), qp[1] + Math.sin(ab) * (R - 16), qp[0] + Math.cos(ab) * (R + 16), qp[1] + Math.sin(ab) * (R + 16));
    var qb = proj(w, z, b[0], b[1]);
    cool(w, 0.16); D.lw(0.8); D.dash([3, 6]);
    D.line(qp[0], qp[1], qp[0], qp[1] + R + 90);
    D.dash([]);
    dimline(w, qp[0], qb[1] + 78, qb[0], qb[1] + 78, { alpha: 0.34, label: '' });
    num(w, 'x = ' + ((qb[0] - qp[0]) / R).toFixed(2), (qp[0] + qb[0]) / 2, qb[1] + 106, 15, 0.52);
    num(w, 'A = ' + A.toFixed(2), qp[0], qp[1] + R + 128, 15, 0.4);
    num(w, 'AC', qp[0] - 210, qp[1] + R + 20, 20, 0.46 * (1 - smoothstep(clamp((p - 0.52) / 0.3, 0, 1))));
    num(w, 'DC', qp[0] - 210, qp[1] + R + 20, 20, 0.46 * smoothstep(clamp((p - 0.58) / 0.3, 0, 1)));
    say(cue, p);
  });

  /* ============================================================ 10 acdc == */
  EM.Scenes('thm.acdc', function (w, p, cue) {
    var z = 0.32;
    var cy = 40, amp = 108, per = 300, ph = -w.t * 2.3;
    var c1 = smoothstep(clamp((p - 0.2) / 0.3, 0, 1));
    var c2 = smoothstep(clamp((p - 0.52) / 0.42, 0, 1));
    var x0 = -560, x1 = 560;
    function raw(x) { return cy - amp * Math.sin((x / per) * TAU + ph); }
    function rect(x) { return cy - amp * Math.abs(Math.sin((x / per) * TAU + ph)); }
    function flat() { return cy - amp; }
    function yAt(x) { return lerp(lerp(raw(x), rect(x), c1), flat(), c2); }

    M.shadow(function () {
      var hw = 13;
      D.begin();
      for (var x = x0; x <= x1; x += 8) {
        if (x === x0) D.move(x, yAt(x) - hw); else D.to(x, yAt(x) - hw);
      }
      for (x = x1; x >= x0; x -= 8) D.to(x, yAt(x) + hw);
      D.close(); D.fill();
      D.lw(1.2);
      D.begin();
      for (x = x0; x <= x1; x += 14) {
        if (x === x0) D.move(x, yAt(x)); else D.to(x, yAt(x));
      }
      D.stroke();
    }, { z: z, blur: 2.4 });
    M.rim(function () {
      D.lw(1.1); D.begin();
      for (var x = x0; x <= x1; x += 12) {
        if (x === x0) D.move(x, yAt(x)); else D.to(x, yAt(x));
      }
      D.stroke();
    }, { z: z, alpha: 0.16 });

    /* the instrument traces the signal it is about to flatten */
    var refA = 0.42 * (1 - c2);
    if (refA > 0.01) {
      cool(w, refA); D.lw(1); D.dash([6, 9]);
      D.begin();
      for (var xr = x0; xr <= x1; xr += 10) {
        var qr = proj(w, z, xr, raw(xr));
        if (xr === x0) D.move(qr[0], qr[1]); else D.to(qr[0], qr[1]);
      }
      D.stroke(); D.dash([]);
    }

    var q0 = proj(w, z, x0, cy), q1 = proj(w, z, x1, cy);
    cool(w, 0.22); D.lw(1); D.dash([9, 8]);
    D.line(q0[0], q0[1], q1[0], q1[1]);
    D.dash([]);
    num(w, '0', q0[0] - 22, q0[1], 13, 0.34, 'right');
    num(w, 'AC', q1[0] + 46, q0[1] - 62, 20, 0.5 * (1 - c2));
    num(w, 'DC', q1[0] + 46, q0[1] - 62, 20, 0.5 * c2);
    var qf = proj(w, z, x1 - 40, flat());
    num(w, 'V = 1.000', qf[0], qf[1] - 26, 16, 0.5 * c2, 'right');
    num(w, 'V = ' + Math.abs(Math.sin(ph)).toFixed(3), q0[0], q0[1] - 190, 14, 0.3 * (1 - c2), 'left');
    say(cue, p);
  });

  /* =========================================================== 11 blind == */
  EM.Scenes('thm.blind', function (w, p, cue) {
    var z = 0.56, k = kz(z), lam = w.lamp;
    var q = smoothstep(clamp(p / 0.72, 0, 1));
    var hemWall = lerp(-700, 356, q);
    var hem = lam.y + (hemWall - lam.y) / k;
    var sway = w.t * 1.4;
    function edge(x) { return hem + (30 * Math.sin(x * 0.0044 + sway) + 14 * Math.sin(x * 0.015 - sway * 1.7)) / k; }

    /* the sheet itself: a huge soft mass, its hem the only edge we see */
    M.shadow(function () {
      D.begin();
      D.move(-1600, -1600);
      D.to(1600, -1600);
      for (var x = 1600; x >= -1600; x -= 40) D.to(x, edge(x));
      D.close();
      D.fill();
      D.lw(3); D.begin();
      for (var x3 = -1600; x3 <= 1600; x3 += 30) {
        if (x3 === -1600) D.move(x3, edge(x3)); else D.to(x3, edge(x3));
      }
      D.stroke();
    }, { z: z, blur: 9, alpha: 0.72 });
    /* its two battens, nearer the wall: a hard edge inside the soft one */
    M.shadow(function () {
      D.lw(7);
      for (var i = 1; i <= 3; i++) {
        var by = hem - i * 250 / k;
        D.begin();
        D.move(-1600, by);
        for (var x2 = -1600; x2 <= 1600; x2 += 50) D.to(x2, by + 18 * Math.sin(x2 * 0.004 + sway + i) / k);
        D.stroke();
      }
      D.lw(3);
      D.line(-1420, hem - 900 / k, -1420, hem + 120 / k);
      D.line(1420, hem - 900 / k, 1420, hem + 120 / k);
      /* folds: the only thing that says "cloth" */
      D.lw(2);
      for (var f = -3; f <= 3; f++) {
        D.begin();
        for (var yy = hem - 900 / k; yy <= edge(f * 340 / k); yy += 46 / k) {
          D.to(f * 340 / k + (26 * Math.sin(yy * k * 0.004 + f * 1.7)) / k, yy);
        }
        D.stroke();
      }
    }, { z: 0.34, blur: 3.2, alpha: 0.62 });

    /* what the instrument sees now */
    var bl = smoothstep(clamp((p - 0.25) / 0.5, 0, 1));
    num(w, 'vision = ' + (1 - bl).toFixed(2), 0, -430, 17, 0.45 * bl);
    cool(w, 0.3 * bl); D.lw(1);
    D.line(-260, -430, -160 - 200 * (1 - bl), -430);
    D.line(160 + 200 * (1 - bl), -430, 260, -430);
    /* only the words are lit */
    M.lyric(cue, p, { y: 186, size: 68, fit: 1300, mode: 'light' });
  });

  /* =========================================================== 12 dizzy == */
  EM.Scenes('thm.dizzy', function (w, p, cue) {
    var z0 = 0.26, lam = w.lamp;
    var base = 0.07 * Math.sin(w.t * 5.1) + 0.11 * Math.sin(w.t * 2.3 + 1.1) + p * 0.18;
    var ctx = D.ctx();
    function shape() {
      D.lw(2.2);
      D.circle(-60, -60, 168); D.stroke();
      D.lw(1.1);
      D.circle(-60, -60, 128); D.stroke();
      for (var i = 0; i < 12; i++) {
        var a = i / 12 * TAU;
        var x = -60 + Math.cos(a) * 168, y = -60 + Math.sin(a) * 168;
        D.circle(x, y, i % 3 === 0 ? 8 : 5); D.fill();
        D.lw(0.8);
        D.line(-60 + Math.cos(a) * 128, -60 + Math.sin(a) * 128, x, y);
      }
    }
    for (var i = 2; i >= 0; i--) {
      ctx.save();
      ctx.translate(lam.x, lam.y);
      ctx.rotate(base + i * 0.155);
      ctx.translate(-lam.x, -lam.y);
      M.shadow(shape, { z: z0 + i * 0.07, blur: 2.4 + i * 1.5, alpha: i === 0 ? 1 : 0.34 - i * 0.06 });
      ctx.restore();
    }
    /* the spin, marked on the rim of the throw */
    var c = proj(w, z0, -60, -60);
    var R = 168 * kz(z0);
    var aa0 = base - 0.9, aa1 = base + 0.55;
    cool(w, 0.3); D.lw(1);
    D.begin();
    for (var t = 0; t <= 1.001; t += 0.04) {
      var a = lerp(aa0, aa1, t);
      var x = lam.x + Math.cos(a) * (R + 210), y = lam.y + Math.sin(a) * (R + 210);
      if (t === 0) D.move(x, y); else D.to(x, y);
    }
    D.stroke();
    head(w, lam.x + Math.cos(aa1) * (R + 210), lam.y + Math.sin(aa1) * (R + 210), aa1 + PI / 2, 12, 0.34);
    num(w, 'theta = ' + (base * 57.2958).toFixed(1), lam.x + Math.cos((aa0 + aa1) / 2) * (R + 246), lam.y + Math.sin((aa0 + aa1) / 2) * (R + 246), 15, 0.44);
    num(w, '3 ghosts', c[0] + 20, c[1] + R + 54, 13, 0.3);
    say(cue, p);
  });

  /* =========================================================== 13 travel == */
  EM.Scenes('thm.travel', function (w, p, cue) {
    var z = 0.22;
    var yB = 30, xa = -430, xb = 470, gap = 100;
    var off = -p * 430;
    var gateBodyX = 30;
    var gp = proj(w, z, gateBodyX, yB);
    var gx = gp[0], gy = gp[1];
    var k = kz(z);
    function railX(bx) { return w.lamp.x + (bx - w.lamp.x) * k; }

    M.shadow(function () {
      D.lw(2.6);
      D.line(xa + off, yB, xb + off, yB);
      D.lw(1);
      for (var hx = xa + off; hx <= xb + off; hx += 30) {
        D.rect(hx - 5, yB + 20, 10, 12); D.fill();
      }
      for (var i = 0; i < 10; i++) {
        var bx = xa + i * gap + off;
        D.lw(2); D.line(bx, yB - 30, bx, yB + 4);
        D.circle(bx, yB - 36, 5); D.fill();
      }
    }, { z: z, blur: 1.8 });
    M.rim(function () {
      D.lw(0.9);
      D.line(xa + off, yB, xb + off, yB);
    }, { z: z, alpha: 0.14 });

    /* the gate, fixed on the wall: the one place you are standing */
    cool(w, 0.22); D.lw(1);
    D.line(gx, gy - 170, gx, gy + 96);
    cool(w, 0.34); D.lw(1.2);
    D.line(gx - 10, gy, gx + 10, gy);
    D.line(gx, gy - 10, gx, gy + 10);
    D.circle(gx, gy, 18); D.stroke();
    num(w, 'you', gx, gy - 190, 13, 0.34);

    var best = 1e9, bestI = -1, i;
    for (i = 0; i < 10; i++) {
      var sx = railX(xa + i * gap + off);
      var d = Math.abs(sx - gx);
      if (d < best) { best = d; bestI = i; }
    }
    for (i = 0; i < 10; i++) {
      var px = railX(xa + i * gap + off);
      if (px < -700 || px > 760) continue;
      var near = Math.exp(-Math.pow((px - gx) / 46, 2));
      num(w, (i + 1 < 10 ? '0' : '') + (i + 1), px, yB - 58 + 0, 12, 0.22 + 0.3 * near);
      if (near > 0.25) {
        cool(w, 0.2 + 0.3 * near); D.lw(1);
        D.circle(px, yB - 36, 10 + 8 * near); D.stroke();
      }
    }
    if (bestI >= 0) {
      var hit = Math.exp(-Math.pow(best / 46, 2));
      if (hit > 0.05) M.pierce(gx, gy, 40 + 90 * hit, { alpha: 0.35 * hit });
      num(w, 'd = ' + (best * 2).toFixed(1), gx, gy + 74, 16, 0.5);
    }
    say(cue, p);
  });

  /* ============================================================= 14 tobc == */
  EM.Scenes('thm.tobc', function (w, p, cue) {
    var z = 0.22;
    var yB = 30, gap = 100, off = -p * 430;   /* mirrored: the rail moves the other way */
    var mirror = false;
    var k = kz(z);
    var xa = -470, xb = 430;
    function railX(bx) { return w.lamp.x + (bx - w.lamp.x) * k; }
    /* body x is negated so the strip travels right, and its numbers run down */
    function bodyX(i) { return -(xa + i * gap + off); }

    M.shadow(function () {
      D.lw(2.6);
      D.line(bodyX(-1) + gap, yB, bodyX(10) - gap, yB);
      D.lw(1);
      for (var hx = bodyX(10) - gap; hx <= bodyX(-1) + gap; hx += 30) {
        D.rect(hx - 5, yB + 20, 10, 12); D.fill();
      }
      for (var i = 0; i < 10; i++) {
        var bx = bodyX(i);
        D.lw(2); D.line(bx, yB - 30, bx, yB + 4);
        D.circle(bx, yB - 36, 5); D.fill();
        /* the trail un-grows */
        var tl = 90 * (1 - p);
        D.lw(0.9); D.line(bx, yB - 44, bx + tl, yB - 44);
      }
    }, { z: z, blur: 1.8 });
    M.rim(function () {
      D.lw(0.9);
      D.line(bodyX(-1) + gap, yB, bodyX(10) - gap, yB);
    }, { z: z, alpha: 0.14 });

    var gxB = -30;
    var gp = proj(w, z, gxB, yB);
    var gx = gp[0], gy = gp[1];
    cool(w, 0.22); D.lw(1);
    D.line(gx, gy - 170, gx, gy + 96);
    cool(w, 0.34); D.lw(1.2);
    D.line(gx - 10, gy, gx + 10, gy); D.line(gx, gy - 10, gx, gy + 10);
    D.circle(gx, gy, 18); D.stroke();
    /* the arrow points back the way time came */
    cool(w, 0.4); D.lw(1.1);
    D.line(gx + 56, gy - 150, gx - 42, gy - 150);
    head(w, gx - 42, gy - 150, PI, 12, 0.4);
    num(w, 'B.C.', gx + 64, gy - 150, 13, 0.42, 'left');

    var best = 1e9, bestI = -1, i;
    for (i = 0; i < 10; i++) {
      var sx = railX(bodyX(i));
      var d = Math.abs(sx - gx);
      if (d < best) { best = d; bestI = i; }
    }
    for (i = 0; i < 10; i++) {
      var px = railX(bodyX(i));
      if (px < -700 || px > 760) continue;
      var near = Math.exp(-Math.pow((px - gx) / 46, 2));
      num(w, String(10 - i), px, yB - 58, 12, 0.22 + 0.28 * near);
      if (near > 0.25) {
        cool(w, 0.2 + 0.28 * near); D.lw(1);
        D.circle(px, yB - 36, 10 + 8 * near); D.stroke();
      }
    }
    if (bestI >= 0) {
      var hit = Math.exp(-Math.pow(best / 46, 2));
      if (hit > 0.05) M.pierce(gx, gy, 40 + 90 * hit, { alpha: 0.3 * hit });
      num(w, 'dt = -' + (0.9 * p).toFixed(2), gx, gy + 74, 16, 0.5);
    }
    say(cue, p);
  });

  /* =========================================================== 15 unite == */
  EM.Scenes('thm.unite', function (w, p, cue) {
    var z = 0.3;
    var cx = 20, cy = 0, r = 120;
    var d = 390 * (1 - E.inOutQuad(clamp(p / 0.86, 0, 1)));
    var seam = smoothstep(clamp((240 - d) / 220, 0, 1));
    var k = kz(z);

    M.shadow(function () {
      D.lw(2.2);
      D.circle(cx - d, cy, r, PI / 2, PI * 1.5); D.stroke();
      D.circle(cx + d, cy, r, -PI / 2, PI / 2); D.stroke();
      D.lw(1.4);
      D.line(cx - d, cy - r, cx - d, cy + r);
      D.line(cx + d, cy - r, cx + d, cy + r);
    }, { z: z, blur: 2.4 });

    /* the light that gets through where they meet */
    var sc = proj(w, z, cx, cy);
    var rr = r * k;
    if (seam > 0.02) {
      var ctx = D.ctx();
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = rgba(w.pal.hot, 0.5 * seam);
      ctx.lineWidth = 2.2 + 7 * seam;
      ctx.filter = 'blur(' + (1 + 5 * seam).toFixed(1) + 'px)';
      ctx.beginPath(); ctx.moveTo(sc[0], sc[1] - rr); ctx.lineTo(sc[0], sc[1] + rr); ctx.stroke();
      ctx.filter = 'none';
      ctx.restore();
    }
    /* the gap, measured between the two cut faces */
    var ql = proj(w, z, cx - d, cy - r), qr = proj(w, z, cx + d, cy - r);
    dimline(w, ql[0], ql[1] - 46, qr[0], qr[1] - 46, { alpha: 0.34, label: 'd = ' + (d * 2 / 390).toFixed(3) });
    cool(w, 0.18); D.lw(0.8); D.dash([4, 7]);
    D.line(ql[0], ql[1] - 40, ql[0], ql[1] + 12);
    D.line(qr[0], qr[1] - 40, qr[0], qr[1] + 12);
    D.dash([]);
    if (seam > 0.6) num(w, 'one', sc[0], sc[1] + rr + 46, 14, 0.4 * seam);
    say(cue, p, { size: 60 });
  });

  /* ========================================================== 16 deeply == */
  EM.Scenes('thm.deeply', function (w, p, cue) {
    var cx = 20, cy = 0, r = 132;
    var q = E.inOutQuad(clamp(p / 0.9, 0, 1));
    var z = lerp(0.44, 0.06, q);
    var blurAmt = lerp(5.5, 0.9, q);
    var solid = smoothstep(clamp((q - 0.15) / 0.7, 0, 1));

    function body(fill) {
      D.lw(2.2);
      D.circle(cx, cy, r); D.stroke();
      D.lw(1.2); D.circle(cx, cy, r - 16); D.stroke();
      if (fill > 0.02) {
        D.fillStyle(EM.rgba(w.pal.shadow, fill));
        D.circle(cx, cy, r - 2); D.fill();
      }
    }
    M.shadow(function () { body(0); }, { z: z + 0.09, blur: blurAmt + 3, alpha: 0.4 });
    M.shadow(function () { body(0.9 * solid); }, { z: z, blur: blurAmt });

    /* the wall takes it in */
    var ctx = D.ctx();
    ctx.save();
    var g = ctx.createRadialGradient(cx + 40, cy, 20, cx + 40, cy, 900);
    g.addColorStop(0, EM.rgba(w.pal.shadow, 0.16 + 0.5 * q));
    g.addColorStop(0.45, EM.rgba(w.pal.shadow, 0.08 + 0.3 * q));
    g.addColorStop(1, EM.rgba(w.pal.shadow, 0));
    ctx.fillStyle = g;
    ctx.fillRect(-W / 2, -H / 2, W, H);
    ctx.globalAlpha = 0.3 * q;
    ctx.fillStyle = EM.rgba(w.pal.shadow, 1);
    ctx.fillRect(-W / 2, -H / 2, W, H);
    ctx.restore();

    /* depth, read out as it goes */
    var sc = proj(w, z, cx, cy);
    var sx = 640, sTop = -280, sBot = 130;
    cool(w, 0.3); D.lw(1);
    D.line(sx, sBot, sx, sTop);
    var my = lerp(sBot, sTop, clamp(z / 0.5, 0, 1));
    for (var i = 0; i <= 5; i++) {
      var ty = lerp(sBot, sTop, i / 5);
      cool(w, 0.24); D.lw(1); D.line(sx, ty, sx - (i % 1 === 0 ? 12 : 6), ty);
      num(w, (i * 0.1).toFixed(1), sx + 18, ty, 11, 0.28, 'left');
    }
    cool(w, 0.55); D.lw(1.4);
    D.line(sx - 16, my, sx + 16, my);
    D.circle(sx, my, 4); D.fill();
    num(w, 'z = ' + z.toFixed(3), sx - 26, sTop - 26, 17, 0.55, 'right');
    survey(w, sc[0], sc[1], 10, 0.22);
    say(cue, p, { size: 60 });
  });
})(window.EM);
