/* 42_plates_condition.js — Act II: the trade.
   Everything here is a fork, a gate, a press or a cage: the machine bidding
   for a body. Materials stay the same: wall, light, and what stands between. */
(function (EM) {
  'use strict';
  var D = EM.D, M = EM.M, L = EM.Life;
  var E = EM.E, TAU = EM.TAU, clamp = EM.clamp, lerp = EM.lerp;
  var hash = EM.hash, rgba = EM.rgba, mix = EM.mix;

  function pal() { return M.cur().pal; }
  function lamp() { return M.cur().lamp; }
  /* wall position of a body point at depth z (same maths as D.cast) */
  function proj(x, y, z) {
    var l = lamp(), k = 1 / (1 - clamp(z == null ? 0.2 : z, 0, 0.93));
    return [l.x + k * (x - l.x), l.y + k * (y - l.y)];
  }
  function shadow(fn, o) { M.shadow(fn, o); }
  function rim(fn, o) { M.rim(fn, o); }

  /* a soft shaft of light in wall space: stacked trapezoids, no filter,
     so the edge falls off instead of stepping. */
  function shaft(x0, y0, x1, y1, w0, w1, a, tint) {
    if (a <= 0.004) return;
    var P = pal(), ctx = D.ctx(), c = tint || P.glow;
    var ang = Math.atan2(y1 - y0, x1 - x0);
    var nx = Math.cos(ang + Math.PI / 2), ny = Math.sin(ang + Math.PI / 2);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var N = 12;
    for (var i = 0; i < N; i++) {
      var f = 1 - 0.86 * Math.pow(i / (N - 1), 1.35);
      var al = a * 0.16 * (0.25 + 0.75 * (i / (N - 1)));
      ctx.beginPath();
      ctx.moveTo(x0 + nx * w0 * f, y0 + ny * w0 * f);
      ctx.lineTo(x1 + nx * w1 * f, y1 + ny * w1 * f);
      ctx.lineTo(x1 - nx * w1 * f, y1 - ny * w1 * f);
      ctx.lineTo(x0 - nx * w0 * f, y0 - ny * w0 * f);
      ctx.closePath();
      ctx.fillStyle = rgba(i > N * 0.55 ? mix(c, P.hot, 0.5) : c, al);
      ctx.fill();
    }
    ctx.restore();
  }
  function pool(x, y, r, a) {
    if (a <= 0.004 || r <= 1) return;
    var P = pal(), ctx = D.ctx();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(x, y); ctx.scale(1, 0.5);
    var g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, rgba(P.hot, a));
    g.addColorStop(0.34, rgba(P.glow, a * 0.42));
    g.addColorStop(1, rgba(P.glow, 0));
    ctx.fillStyle = g;
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.restore();
  }
  /* weight dropped on the wall: the unlit side of the fork */
  function darken(x, y, r, a) {
    if (a <= 0.004 || r <= 1) return;
    var P = pal(), ctx = D.ctx();
    var g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(P.shadow, a));
    g.addColorStop(0.55, rgba(P.shadow, a * 0.5));
    g.addColorStop(1, rgba(P.shadow, 0));
    ctx.save();
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.restore();
  }

  /* ================================================================ cnd.if
     A decision is cut from a plate. Two roads leave it; one is lit. */
  EM.Scenes('cnd.if', function (w, p, cue) {
    var P = w.pal;
    var open = 0.06 + 0.94 * E.outCubic(clamp(p / 0.72, 0, 1));
    var form = 0.58 + 0.42 * E.outCubic(clamp(p / 0.3, 0, 1));
    var ax = -330, ay = -40, r = 158, zN = 0.2;

    var rx0 = ax + r * 0.84, ry0 = ay;
    var litA = [lerp(rx0, 452, open), lerp(ry0, -170, open)];
    var litB = [lerp(rx0, 486, open), lerp(ry0, -18, open)];
    var bx = ax + r * 0.16, by = ay + r * 0.98;
    var ex = lerp(bx, 512, open), ey = lerp(by, 312, open);

    shadow(function () {
      /* diamond, struck twice: outer plate and inner cut */
      D.lw(3.2);
      D.polyline([[ax, ay - r], [ax + r * 0.84, ay], [ax, ay + r], [ax - r * 0.84, ay]], true);
      D.lw(1.1);
      D.polyline([[ax, ay - r * 0.56], [ax + r * 0.46, ay], [ax, ay + r * 0.56], [ax - r * 0.46, ay]], true);
      D.circle(ax, ay, 8 * form); D.fill();

      /* the fork: two rails with a lane between them */
      D.lw(2.3);
      D.line(rx0, ry0, litA[0], litA[1]);
      D.line(rx0, ry0, litB[0], litB[1]);
      D.lw(1.4);
      for (var i = 1; i <= 3; i++) {
        var u = i / 4;
        D.line(lerp(rx0, litA[0], u), lerp(ry0, litA[1], u),
               lerp(rx0, litB[0], u), lerp(ry0, litB[1], u));
      }

      /* the other road: a barred wedge that goes nowhere */
      D.fillPoly([[bx - 34, by], [bx + 34, by], [ex + 68, ey], [ex - 68, ey]]);
      var ang2 = Math.atan2(ey - by, ex - bx) + Math.PI / 2;
      D.lw(1.8);
      for (var k = 0; k < 5; k++) {
        var q = 0.2 + k * 0.17;
        var cxp = lerp(bx, ex, q), cyp = lerp(by, ey, q);
        var hw2 = lerp(36, 70, q);
        D.line(cxp - Math.cos(ang2) * hw2, cyp - Math.sin(ang2) * hw2,
               cxp + Math.cos(ang2) * hw2, cyp + Math.sin(ang2) * hw2);
      }
    }, { z: zN, blur: 2.5 });

    /* light falls into the lane */
    var A = proj(rx0, ry0, zN);
    var B = proj((litA[0] + litB[0]) / 2, (litA[1] + litB[1]) / 2, zN);
    shaft(A[0], A[1], B[0], B[1], 32, 58, 0.42 * open * form, P.hot);
    M.pierce(B[0], B[1], 38, { alpha: 0.32 * open });
    /* the dark road carries no light */
    var Dk = proj((bx + ex) / 2, (by + ey) / 2, zN);
    darken(Dk[0], Dk[1], 340, 0.32 * form);

    rim(function () {
      D.lw(1.0);
      D.polyline([[ax, ay - r], [ax + r * 0.84, ay], [ax, ay + r], [ax - r * 0.84, ay]], true);
      D.line(rx0, ry0, litA[0], litA[1]);
      D.line(rx0, ry0, litB[0], litB[1]);
    }, { z: zN, alpha: 0.20 });

    M.lyric(cue, p, { y: 330, size: 58, fit: 1400 });
  });

  /* ============================================================== cnd.stim
     One fork becomes many; they reach out of the picture, each tipped with light. */
  EM.Scenes('cnd.stim', function (w, p, cue) {
    var P = w.pal;
    var u = clamp(p / 0.92, 0, 1);
    var g = E.outCubic(u);
    var ox = -500, oy = 110, zN = 0.28;
    var n = 26;

    shadow(function () {
      /* the knot where the diamond split */
      D.lw(2.4);
      var kr = 58 * (0.6 + 0.4 * g);
      D.polyline([[ox, oy - kr], [ox + kr, oy], [ox, oy + kr], [ox - kr, oy]], true);
      D.circle(ox, oy, 7); D.fill();
      for (var i = 0; i < n; i++) {
        var h = hash(i * 31 + 7);
        var a = lerp(-3.02, 0.06, i / (n - 1)) + (h - 0.5) * 0.07;
        var len = (540 + hash(i * 57 + 13) * 470) * (0.05 + 0.95 * g);
        var mx = ox + Math.cos(a) * len * 0.58 + (hash(i * 7 + 3) - 0.5) * 26;
        var my = oy + Math.sin(a) * len * 0.58 + (hash(i * 11 + 5) - 0.5) * 22;
        var ex = ox + Math.cos(a) * len, ey = oy + Math.sin(a) * len;
        D.lw(2.8 - hash(i * 5) * 1.4);
        D.spine([[ox, oy], [mx, my], [ex, ey]]);
        D.stroke();
        /* some forks fork again */
        if (g > 0.32 && i % 3 === 0) {
          var b = a + (i % 2 ? 0.26 : -0.26);
          D.lw(1.1);
          D.line(mx, my, mx + Math.cos(b) * len * 0.40, my + Math.sin(b) * len * 0.40);
        }
      }
    }, { z: zN, blur: 3.2 });

    /* each tip carries a small light; the fork is reaching for the viewer */
    var lit = clamp((g - 0.18) / 0.55, 0, 1);
    for (var i = 0; i < n; i++) {
      var h = hash(i * 31 + 7);
      var a = lerp(-3.02, 0.06, i / (n - 1)) + (h - 0.5) * 0.07;
      var len = (540 + hash(i * 57 + 13) * 470) * (0.05 + 0.95 * g);
      var T = proj(ox + Math.cos(a) * len, oy + Math.sin(a) * len, zN);
      var al = lit * (0.22 + 0.55 * hash(i * 3 + 1));
      if (al > 0.02) M.pierce(T[0], T[1], 8 + hash(i * 5 + 9) * 9, { alpha: al });
    }
    /* the knot itself catches an edge */
    var K = proj(ox, oy, zN);
    rim(function () {
      D.lw(1.1);
      var kr2 = 58 * (0.6 + 0.4 * g);
      D.polyline([[ox, oy - kr2], [ox + kr2, oy], [ox, oy + kr2], [ox - kr2, oy]], true);
    }, { z: zN, alpha: 0.26 });
    /* pressure rings leaving the knot */
    var ctx = D.ctx();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (var q = 0; q < 3; q++) {
      var rr = 120 + q * 110 + u * 260;
      ctx.strokeStyle = rgba(P.glow, 0.10 * (1 - q / 3) * u);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(K[0], K[1], rr, rr * 0.7, 0, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();

    M.lyric(cue, p, { y: 330, size: 56, fit: 1460 });
  });

  /* ============================================================== cnd.then
     All of it is pulled through one narrow gate. */
  EM.Scenes('cnd.then', function (w, p, cue) {
    var P = w.pal;
    var u = E.inOutQuad(clamp(p / 0.9, 0, 1));
    var form = 0.5 + 0.5 * E.outCubic(clamp(p / 0.35, 0, 1));
    var gx = 30, zN = 0.18, top = -300, bot = 286;
    var gw = lerp(118, 24, u);
    var jw = 118;

    shadow(function () {
      /* the wall the gate is cut into: a lintel above, two jambs below */
      D.rect(-gw - jw - 30, -660, (gw + jw + 30) * 2, 660 + top); D.fill();
      D.fillPoly([[-gw - jw, top], [-gw, top], [-gw, bot], [-gw - jw, bot]]);
      D.fillPoly([[gw, top], [gw + jw, top], [gw + jw, bot], [gw, bot]]);
      D.lw(5);
      D.line(-gw - jw - 26, top, gw + jw + 26, top);
      D.line(-gw - jw - 26, bot, gw + jw + 26, bot);
      /* the fork, collected: every road ends on the gate frame */
      var n = 19;
      for (var i = 0; i < n; i++) {
        var s = (i / (n - 1)) - 0.5;
        var spread = 1 - u * 0.9;
        var sx = gx + s * 2050 * spread;
        var sy = lerp(-250, 130, hash(i * 13 + 5)) * (0.35 + 0.65 * spread);
        var tx = gx + (s < 0 ? -(gw + jw + 14) : (gw + jw + 14));
        var ty = lerp(top + 22, bot - 22, hash(i * 29 + 11) * 0.92 + 0.04);
        var mx = lerp(sx, tx, 0.55) + (hash(i * 17 + 3) - 0.5) * 54;
        var my = lerp(sy, ty, 0.55) + (hash(i * 23 + 7) - 0.5) * 42;
        D.lw(1.2 + hash(i * 7 + 1) * 1.8);
        D.spine([[sx, sy], [mx, my], [tx, ty]]);
        D.stroke();
      }
    }, { z: zN, blur: 2.6 });

    /* light only where the gate opens */
    var wl = proj(gx, 0, zN), wx = wl[0], k = 1 / (1 - zN);
    var hw = gw * k;
    var wy0 = proj(0, top, zN)[1], wy1 = proj(0, bot, zN)[1];
    shaft(wx, wy0 - 6, wx, wy1 + 30, hw * 0.96, hw * 1.1, 0.60 * form, P.hot);
    pool(wx, wy1 + 36, 150 + 190 * form, 0.40 * form);
    M.pierce(wx, lerp(wy0, wy1, 0.5), 24, { alpha: 0.40 * form });

    rim(function () {
      D.lw(0.9);
      D.line(-gw, top, -gw, bot); D.line(gw, top, gw, bot);
      D.line(-gw - jw, top, gw + jw, top);
      D.line(-gw - jw, bot, gw + jw, bot);
    }, { z: zN, alpha: 0.16 });

    M.lyric(cue, p, { y: 330, size: 60, fit: 1200 });
  });

  /* ============================================================= cnd.satis
     The one thing that gets through: a thread of light on the middle of the wall. */
  EM.Scenes('cnd.satis', function (w, p, cue) {
    var P = w.pal;
    var u = E.outCubic(clamp(p / 0.75, 0, 1));
    var form = 0.72 + 0.28 * E.outCubic(clamp(p / 0.3, 0, 1));
    var zN = 0.12;
    var gL = -46, gR = 18;

    /* everything that is not the slit is a blocker */
    shadow(function () {
      D.rect(-1120, -820, 1120 + gL, 1640); D.fill();
      D.rect(gR, -820, 1120 - gR, 1640); D.fill();
    }, { z: zN, blur: 15 });

    var eL = proj(gL, 0, zN), eR = proj(gR, 0, zN);
    var cx = (eL[0] + eR[0]) / 2;
    /* the slit's own edges catch a little light */
    var ctx = D.ctx();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = rgba(P.hot, 0.26 * form);
    ctx.beginPath(); ctx.moveTo(eL[0], -560); ctx.lineTo(eL[0], 66); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(eR[0], -560); ctx.lineTo(eR[0], 66); ctx.stroke();
    ctx.restore();

    var wide = lerp(1.9, 1.0, u);
    shaft(cx, -580, cx, 58, 16 * wide, 23 * wide, 0.66 * form, P.hot);
    M.pierce(cx, 46, 26, { alpha: 0.48 * form });
    pool(cx, 54, 140 + 40 * u, 0.32 * form);

    /* dust caught in the thread */
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < 26; i++) {
      var y = -520 + hash(i * 53 + 7) * 560 + (w.t * (10 + hash(i) * 26)) % 560;
      if (y > 62) y = 62 - (y - 62);
      var x = cx + (hash(i * 71 + 3) - 0.5) * 22;
      var tw = 0.35 + 0.65 * EM.wave(w.t * (0.7 + hash(i) * 1.4), 1.9 + hash(i * 3) * 2.2, i * 0.41);
      ctx.fillStyle = rgba(mix(P.hot, P.glow, 0.35), 0.55 * tw * form);
      ctx.beginPath(); ctx.arc(x, y, 0.7 + hash(i * 11) * 1.6, 0, TAU); ctx.fill();
    }
    ctx.restore();

    /* two rings where it lands */
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (var q = 0; q < 2; q++) {
      ctx.strokeStyle = rgba(P.glow, 0.13 * (1 - q * 0.4) * form);
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.ellipse(cx, 52, 88 + q * 92 + u * 46, (88 + q * 92 + u * 46) * 0.3, 0, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();

    M.lyric(cue, p, { y: 330, size: 58, fit: 1460, mode: 'light' });
  });

  /* ============================================================= cnd.happy
     The wall goes warm; a low horizon lifts; the dust wakes up. */
  EM.Scenes('cnd.happy', function (w, p, cue) {
    var P = w.pal;
    var u = E.outCubic(clamp(p / 0.95, 0, 1));
    var lift = E.inOutQuad(clamp(p / 0.95, 0, 1));
    var arcY = lerp(312, -30, lift);
    var ctx = D.ctx();

    var g = ctx.createRadialGradient(0, arcY - 120, 0, arcY - 120, 0, 1400);
    g.addColorStop(0, rgba(P.hot, 0.06 + 0.15 * u));
    g.addColorStop(0.48, rgba(P.wallHi, 0.05 + 0.09 * u));
    g.addColorStop(1, rgba(P.glow, 0));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g;
    ctx.fillRect(-960, -540, 1920, 1080);
    ctx.restore();

    var pts = [], ptsDark = [];
    for (var x = -1020; x <= 1020; x += 42) {
      var q = x / 1020;
      var y = arcY - 100 * (1 - q * q) + Math.sin(q * 2.2 + w.t * 0.14) * 2.4;
      pts.push([x, y]);
      ptsDark.push([x, y + 13]);
    }
    /* the line has a body: its shadow sits just under it */
    shadow(function () {
      D.lw(3.6); D.polyline(ptsDark, false);
    }, { z: 0.08, blur: 3.6, ink: 0.5 });

    /* the sky is lit from behind the line */
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.beginPath();
    ctx.moveTo(-1020, -560);
    for (var i = 0; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.lineTo(1020, -560);
    ctx.closePath();
    var sky = ctx.createLinearGradient(0, arcY - 130, 0, -540);
    sky.addColorStop(0, rgba(P.hot, 0.20 * u));
    sky.addColorStop(0.5, rgba(P.glow, 0.09 * u));
    sky.addColorStop(1, rgba(P.glow, 0.03 * u));
    ctx.fillStyle = sky;
    ctx.fill();
    ctx.restore();

    /* the horizon itself */
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineWidth = 22;
    ctx.strokeStyle = rgba(P.glow, 0.055 + 0.07 * u);
    ctx.beginPath();
    for (i = 0; i < pts.length; i++) (i === 0 ? ctx.moveTo : ctx.lineTo).call(ctx, pts[i][0], pts[i][1]);
    ctx.stroke();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = rgba(mix(P.hot, P.wallHi, 0.18), 0.45 + 0.35 * u);
    ctx.beginPath();
    for (i = 0; i < pts.length; i++) (i === 0 ? ctx.moveTo : ctx.lineTo).call(ctx, pts[i][0], pts[i][1]);
    ctx.stroke();
    ctx.restore();

    M.pierce(0, arcY - 100, 80 + 60 * u, { alpha: 0.30 * u });

    /* dust, brighter than the room */
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (i = 0; i < 170; i++) {
      var hx = hash(i * 73 + 11), hy = hash(i * 131 + 5);
      var dx = (hx - 0.5) * 1880;
      var edge = 0.25 + 0.75 * (1 - Math.abs(dx) / 960);
      var dy = arcY - 30 - hy * 540;
      if (dy < -540) continue;
      var tw = 0.4 + 0.6 * EM.wave(w.t * (0.5 + hx), 1.6 + hy * 3.2, i * 0.31);
      var a = (0.10 + 0.70 * u) * tw * edge;
      ctx.fillStyle = rgba(mix(P.wallHi, P.hot, 0.55), a);
      ctx.beginPath();
      ctx.arc(dx + Math.sin(w.t * 0.4 + i) * 4, dy, 0.8 + hash(i * 7 + 2) * 2.2, 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    M.lyric(cue, p, { y: 330, size: 58, fit: 1460 });
  });

  /* ============================================================== cnd.exec
     The first small execution: a seal comes down, the lamp blinks,
     the wall takes its first dark mark. */
  EM.Scenes('cnd.exec', function (w, p, cue) {
    var P = w.pal;
    var fall = E.inCubic(clamp(p / 0.42, 0, 1));
    var after = clamp((p - 0.42) / 0.09, 0, 1);
    var lift = E.outCubic(clamp((p - 0.56) / 0.26, 0, 1));
    var zN = 0.22, k = 1 / (1 - zN), discR = 150;
    var sealY = lerp(-396, -94, fall) - lift * 152;
    var sc = clamp((p - 0.42) / 0.07, 0, 1);

    /* the press: two rails and a platen, always on the wall */
    shadow(function () {
      D.lw(3.6);
      D.line(-338, -560, -338, 58);
      D.line(338, -560, 338, 58);
      D.lw(2.6);
      D.line(-486, 58, 486, 58);
      D.rect(-486, 58, 972, 46); D.fill();
      D.lw(1.8);
      for (var i = 0; i < 7; i++) {
        var x = -440 + i * 146;
        D.line(x, 104, x, 122);
      }
      D.circle(-338, 58, 11); D.stroke();
      D.circle(338, 58, 11); D.stroke();
    }, { z: 0.16, blur: 2.4 });

    /* the imprint the seal face leaves: first dark on the wall */
    var imp = proj(0, -94, zN), R0 = discR * k;
    if (sc > 0.005) {
      var ctx0 = D.ctx();
      var g0 = ctx0.createRadialGradient(imp[0], imp[1], R0 * 0.18, imp[0], imp[1], R0 * 1.45);
      g0.addColorStop(0, rgba(P.shadow, 0.54 * sc));
      g0.addColorStop(0.60, rgba(P.shadow, 0.36 * sc));
      g0.addColorStop(1, rgba(P.shadow, 0));
      ctx0.save(); ctx0.fillStyle = g0;
      ctx0.fillRect(imp[0] - R0 * 1.6, imp[1] - R0 * 1.6, R0 * 3.2, R0 * 3.2);
      ctx0.restore();
      ctx0.save();
      ctx0.strokeStyle = rgba(P.shadow, 0.68 * sc);
      ctx0.lineWidth = 12;
      ctx0.beginPath(); ctx0.arc(imp[0], imp[1], R0 * 0.99, 0, TAU); ctx0.stroke();
      ctx0.restore();
      shadow(function () {
        D.lw(2.2);
        for (var i = 0; i < 12; i++) {
          var a = hash(i * 91 + 3) * TAU, r0 = R0 * (0.95 + hash(i * 13) * 0.12), r1 = R0 + 36 + hash(i * 29) * 185;
          D.line(imp[0] + Math.cos(a) * r0, imp[1] + Math.sin(a) * r0 * 0.9,
                 imp[0] + Math.cos(a) * r1, imp[1] + Math.sin(a) * r1 * 0.9);
        }
        D.lw(1.4);
        for (i = 0; i < 18; i++) {
          var aa = hash(i * 61 + 17) * TAU, rr = R0 * (0.3 + hash(i * 43) * 1.15);
          D.circle(imp[0] + Math.cos(aa) * rr, imp[1] + Math.sin(aa) * rr, 1.2 + hash(i) * 2.6); D.fill();
        }
      }, { z: 0.04, blur: 1.1, ink: 0.62 * sc });
    }

    /* the seal: a disc on a stem; its face is carved, so light comes through */
    shadow(function () {
      var c = D.ctx();
      c.save();
      c.translate(0, sealY);
      c.rotate(-0.012);
      D.rect(-36, -discR - 236, 72, 236); D.fill();
      D.circle(0, 0, discR); D.fill();
      D.lw(3.4); D.circle(0, 0, discR + 14); D.stroke();
      c.restore();
    }, { z: zN, blur: lerp(11, 2.0, after) });

    /* the carving: light squeezing through the engraved face */
    var SC = proj(0, sealY, zN), RW = discR * k;
    var ea = 0.48 * (0.28 + 0.72 * after);
    var ctx = D.ctx();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = rgba(P.hot, ea);
    ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.arc(SC[0], SC[1], RW * 0.76, 0, TAU); ctx.stroke();
    ctx.lineWidth = 2.8;
    ctx.strokeRect(SC[0] - RW * 0.46, SC[1] - RW * 0.46, RW * 0.92, RW * 0.92);
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(SC[0] - RW * 0.26, SC[1] - RW * 0.19); ctx.lineTo(SC[0] + RW * 0.26, SC[1] - RW * 0.19);
    ctx.moveTo(SC[0] - RW * 0.31, SC[1]); ctx.lineTo(SC[0] + RW * 0.31, SC[1]);
    ctx.moveTo(SC[0] - RW * 0.26, SC[1] + RW * 0.19); ctx.lineTo(SC[0] + RW * 0.26, SC[1] + RW * 0.19);
    ctx.stroke();
    /* the rim of the disc, where light is squeezed out */
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = rgba(P.glow, 0.40 * (0.3 + 0.7 * after));
    ctx.beginPath(); ctx.arc(SC[0], SC[1], RW + 3, 0, TAU); ctx.stroke();
    ctx.restore();

    /* the hit: one bright frame, one black frame */
    var flash = Math.pow(clamp(1 - Math.abs(p - 0.435) / 0.05, 0, 1), 2);
    var cut = Math.pow(clamp(1 - Math.abs(p - 0.505) / 0.04, 0, 1), 2);
    if (flash > 0.01) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = rgba(P.hot, 0.22 * flash);
      ctx.fillRect(-960, -540, 1920, 1080);
      ctx.restore();
      M.pierce(imp[0], imp[1], 300 + 300 * flash, { alpha: 0.55 * flash });
    }
    if (cut > 0.01) {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,' + (0.36 * cut) + ')';
      ctx.fillRect(-960, -540, 1920, 1080);
      ctx.restore();
    }

    M.lyric(cue, p, { y: 330, size: 58, fit: 1400 });
  });

  /* =========================================================== cnd.trapped
     Four sides come in. The shadow is put in a box that keeps getting smaller. */
  EM.Scenes('cnd.trapped', function (w, p, cue) {
    var P = w.pal;
    var u = E.inOutQuad(clamp(p / 0.97, 0, 1));
    var zN = 0.08;
    var cx = lerp(780, 236, u);
    var yt = lerp(-460, -270, u);
    var yb = lerp(455, 355, u);
    var th = lerp(88, 172, u);
    var shake = Math.sin(w.t * 9.1) * 5 * u;

    function frame() {
      D.rect(-cx - th, yt - th, (cx + th) * 2, th); D.fill();
      D.rect(-cx - th, yb, (cx + th) * 2, th); D.fill();
      D.rect(-cx - th, yt, th, yb - yt); D.fill();
      D.rect(cx, yt, th, yb - yt); D.fill();
    }

    /* penumbra, then the frame with its hard inner edge */
    shadow(function () { frame(); }, { z: zN, blur: 15, ink: 0.42 });
    shadow(function () { frame(); }, { z: zN, blur: 1.8, ink: 0.94 });

    /* light leaks between frame and wall */
    var SE = [proj(-cx, yt, zN), proj(cx, yt, zN), proj(cx, yb, zN), proj(-cx, yb, zN)];
    var ctx = D.ctx();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = rgba(P.hot, 0.30);
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.moveTo(SE[0][0] + 3, SE[0][1] + 3);
    for (var i = 1; i < 4; i++) ctx.lineTo(SE[i][0] - 3, SE[i][1] - 3);
    ctx.closePath(); ctx.stroke();
    /* the outer edge of the band */
    ctx.strokeStyle = rgba(P.hot, 0.11);
    ctx.lineWidth = 1.2;
    var SO = [proj(-cx - th, yt - th, zN), proj(cx + th, yt - th, zN),
              proj(cx + th, yb + th, zN), proj(-cx - th, yb + th, zN)];
    ctx.beginPath();
    ctx.moveTo(SO[0][0], SO[0][1]);
    for (i = 1; i < 4; i++) ctx.lineTo(SO[i][0], SO[i][1]);
    ctx.closePath(); ctx.stroke();
    /* corner mitres: the light gets through the joints */
    ctx.strokeStyle = rgba(P.hot, 0.24);
    ctx.lineWidth = 2.6;
    for (i = 0; i < 4; i++) {
      var c0 = SE[i];
      var dxs = i === 0 || i === 3 ? 1 : -1;
      var dys = i < 2 ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(c0[0] + dxs * 2, c0[1] + dys * 2);
      ctx.lineTo(c0[0] + dxs * 30, c0[1] + dys * 30);
      ctx.stroke();
    }
    ctx.restore();

    /* what is caught inside: the fork, crushed flat */
    var tcx = 0 + shake, tcy = -88;
    var sx = lerp(1, 0.56, u), sy = lerp(1, 0.33, u);
    shadow(function () {
      var c = D.ctx();
      c.save();
      c.translate(tcx, tcy); c.scale(sx, sy);
      D.lw(2.6);
      D.polyline([[0, -112], [98, 0], [0, 112], [-98, 0]], true);
      D.lw(1.3);
      D.polyline([[0, -64], [52, 0], [0, 64], [-52, 0]], true);
      D.circle(0, 0, 9); D.fill();
      D.lw(1.7);
      D.line(98, 0, 166, -40); D.line(98, 0, 162, 34); D.line(-98, 0, -166, 30);
      c.restore();
    }, { z: 0.34, blur: 2.8 });

    M.pierce(0, -80, 250 - 70 * u, { alpha: 0.15 });

    M.lyric(cue, p, { y: 330, size: 54, fit: 980 });
  });

  /* ========================================================= cnd.simulation
     The box becomes a lattice over the whole picture: one room, one cage.
     Everything is printed twice, and the two prints drift apart. */
  EM.Scenes('cnd.simulation', function (w, p, cue) {
    var P = w.pal;
    var u = clamp(p, 0, 1);
    var dx = 12 + 58 * E.outCubic(u), dy = 8 + 22 * u;

    function grille(cols, rows, ox, oy, skew, lwV, lwH) {
      var x0 = -1040 + ox - skew, x1 = 1040 + ox + skew;
      for (var c = 0; c < cols; c++) {
        var x = lerp(x0, x1, c / (cols - 1)) + ((c * 37) % 11 - 5) * 0.8;
        D.lw(lwV);
        D.line(x, -620 + oy, x + skew * 0.5, 620 + oy);
      }
      for (var r = 0; r < rows; r++) {
        var y = lerp(-560, 560, r / (rows - 1)) + oy;
        D.lw(lwH);
        D.line(-1040 + ox, y, 1040 + ox, y);
      }
    }

    /* the far print of the room: out of focus, already displaced */
    shadow(function () { grille(14, 8, dx * 0.9, dy * 0.9, 24, 2.6, 1.3); },
      { z: 0.34, blur: 7, ink: 0.30 });
    /* the near print: the bars you are behind */
    shadow(function () { grille(17, 8, 0, 0, 0, 2.6, 0.85); },
      { z: 0.12, blur: 1.1, ink: 0.60 });

    /* the word, printed twice on the same wall */
    var bx = -300, by = 168, ws = 148;
    M.type('strange', { x: bx, y: by, size: ws, mode: 'stamp', alpha: 0.60, rot: -0.02, track: -2 });
    M.type('strange', { x: bx + dx, y: by + dy, size: ws, mode: 'stamp', alpha: 0.46, rot: -0.02 + 0.04 * u, track: -2 });
    M.type('strange', { x: bx + dx * 0.5, y: by + dy * 0.5, size: ws, mode: 'whisper', alpha: 0.32, z: 0.5, blur: 11, rot: -0.02 });

    /* the corners go under */
    var vg = D.ctx().createRadialGradient(0, 0, 520, 0, 0, 1240);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,' + (0.20 + 0.10 * u) + ')');
    D.ctx().save();
    D.ctx().fillStyle = vg;
    D.ctx().fillRect(-960, -540, 1920, 1080);
    D.ctx().restore();

    M.lyric(cue, p, { y: 330, size: 56, fit: 1460 });
  });
})(window.EM);
