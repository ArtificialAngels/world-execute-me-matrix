/* 43_plates_flesh.js — Act III: flesh / nouns.
   The machine has a schema for points, circles and limits; it has none for
   eggplant, tomato, tabby cat, god. So nothing in this act is an object.
   Each plate is one shadow trying to become a noun: the outline almost
   arrives, gets measured, comes apart, tries again. Warmest act of the film,
   and the only one where the shadows are alive — organic, asymmetric,
   breathing. Deliberately the opposite of Act I's geometry. */
(function (EM) {
  'use strict';
  var D = EM.D, M = EM.M, L = EM.Life;
  var E = EM.E, TAU = EM.TAU, clamp = EM.clamp, lerp = EM.lerp, rgba = EM.rgba;
  var hash = EM.hash, hashs = EM.hashs, wrap = EM.wrap, bump = EM.bump;

  /* ------------------------------------------------------------------ kit */

  /* one organic radius: harmonics plus a per-seed lump map. Only t animates
     it; two seeds can be blended, which is how a shape becomes another shape
     without ever becoming a noun. */
  function radiusAt(a, seed, t, o) {
    var wob = o.wob == null ? 0.16 : o.wob;
    var r = 1
      + wob * Math.sin(a * 3 + seed * 1.7 + t * 0.90 + (o.phase || 0)) * 0.52
      + wob * Math.sin(a * 5 - seed * 0.80 + t * 0.62) * 0.30
      + wob * Math.sin(a * 2 + seed * 2.10 - t * 0.43) * 0.26
      + 0.055 * Math.sin(a * 4 + seed * 3.1)
      + 0.035 * Math.sin(a * 7 + seed * 0.6);
    if (o.fine) r += o.fine * Math.sin(a * 9 - t * 2.6 + (o.phase || 0));
    if (o.lobes) {
      for (var i = 0; i < o.lobes.length; i++) {
        var lb = o.lobes[i];
        var d = Math.atan2(Math.sin(a - lb.a), Math.cos(a - lb.a));
        r += lb.h * Math.exp(-(d * d) / (lb.w * lb.w));
      }
    }
    if (o.breath) r *= 1 + o.breath * Math.sin(t * 1.45 + a * 1.0);
    return r;
  }
  /* a closed organic silhouette (body coordinates; the cast projects it) */
  function form(cx, cy, rx, ry, seed, t, o) {
    o = o || {};
    var n = o.n || 46, rot = o.rot || 0, fy = o.flipY == null ? 1 : o.flipY;
    var pts = [], i, a, r;
    for (i = 0; i < n; i++) {
      a = i / n * TAU;
      r = radiusAt(a, seed, t, o);
      if (o.alt) r = lerp(r, radiusAt(a, o.altSeed, t, o), o.alt);
      r += (hash(seed * 97 + i * 13) - 0.5) * (o.grain == null ? 0.045 : o.grain);
      var x = Math.cos(a) * rx * r, y = Math.sin(a) * ry * r * fy;
      if (rot) { var xx = x * Math.cos(rot) - y * Math.sin(rot); y = x * Math.sin(rot) + y * Math.cos(rot); x = xx; }
      pts.push([cx + x, cy + y]);
    }
    return pts;
  }
  /* the silhouette as a mass: dark body, one soft contour, warm light leaking
     around the edge (the penumbra that makes a shadow read as an obstacle) */
  function mass(pts, a, lw) {
    D.spine(pts, true);
    D.fillStyle([14, 48, 30], a == null ? 0.92 : a); D.ctx().fill();
    D.lw(lw || 2); D.strokeStyle([116, 240, 154], Math.min(1, (a == null ? 0.92 : a) + 0.05));
    D.ctx().stroke();
  }
  function edge(pal, pts, a, lw) {
    D.spine(pts, true); D.strokeStyle(pal.glow, a); D.lw(lw); D.ctx().stroke();
  }
  function line(pts, col, a, lw) {
    D.spine(pts, false); D.strokeStyle(col, a); D.lw(lw); D.ctx().stroke();
  }
  function clipHalf(x0, x1, fn) {
    var ctx = D.ctx();
    ctx.save();
    ctx.beginPath(); ctx.rect(x0, -700, x1 - x0, 1400); ctx.clip();
    fn();
    ctx.restore();
  }
  function proj(z, w) {
    var k = 1 / (1 - clamp(z, 0, 0.93));
    var lx = w.lamp.x, ly = w.lamp.y;
    return {
      k: k,
      pt: function (x, y) { return [lx + (x - lx) * k, ly + (y - ly) * k]; }
    };
  }
  /* the machine's own hand: cool trace, small, and it never finds a word */
  function mark(w, str, x, y, o) {
    o = o || {};
    D.text(str, x, y, {
      size: o.size || 13, kind: 'mono',
      color: rgba(w.pal.trace, o.alpha == null ? 0.45 : o.alpha),
      tracking: o.track == null ? 2 : o.track,
      align: o.align || 'center', rot: o.rot || 0
    });
  }
  function dashes(w, x1, y1, x2, y2, a) {
    var ctx = D.ctx();
    ctx.save();
    ctx.setLineDash([5, 9]);
    D.lw(1); D.strokeStyle(w.pal.trace, a == null ? 0.28 : a);
    D.line(x1, y1, x2, y2);
    ctx.restore();
  }

  /* -------------------------------------------------------- 1 · eggplant */
  /* the outline is sampled: points in order, basis vectors out of the centroid,
     and only a memory of the mass left behind. geometry tries to hold a
     vegetable and settles for a mesh. */
  EM.Scenes('fls.eggplant', function (w, p, cue) {
    var t = w.t, pal = w.pal, z = 0.30, P = proj(z, w);
    var cx = 40, cy = -110, rx = 292, ry = 206;
    var N = 34, i;
    var pts = form(cx, cy, rx, ry, 4.2, t, { wob: 0.19, n: N });
    var samp = clamp((p - 0.04) / 0.5, 0, 1);
    var c = P.pt(cx, cy);

    D.glow(c[0], c[1], 470, pal.glow, 0.06);
    M.shadow(function () {
      /* what is left of the shadow: a memory of a mass */
      var mem = form(cx, cy, rx * 1.02, ry * 1.02, 4.2, t, { wob: 0.19, n: N });
      D.spine(mem, true); D.fillStyle([14, 48, 30], 0.24); D.ctx().fill();
      /* the contour as chords: it can only be held as a polygon */
      D.lw(1.4); D.strokeStyle([34, 104, 64], 0.46);
      D.polyline(pts.concat([pts[0]]), false);
      /* the samples, in order */
      for (i = 0; i < N; i++) {
        if (i / N > samp + 0.0001) break;
        D.circle(pts[i][0], pts[i][1], 3.2 + hash(i * 31 + 7) * 3.4);
        D.fillStyle([34, 104, 64], 0.9); D.ctx().fill();
      }
      /* basis vectors out of the centroid, growing with the sentence */
      for (i = 0; i < 12; i++) {
        var j = Math.floor(i * N / 12);
        var ex = pts[j][0] - cx, ey = pts[j][1] - cy;
        var u = 0.18 + 0.62 * clamp((p - i * 0.028) / 0.42, 0, 1);
        var ux = cx + ex * u, uy = cy + ey * u;
        D.lw(1.2); D.strokeStyle([34, 104, 64], 0.55);
        D.line(cx, cy, ux, uy);
        var ang = Math.atan2(ey, ex);
        D.line(ux, uy, ux - Math.cos(ang - 0.42) * 12, uy - Math.sin(ang - 0.42) * 12);
        D.line(ux, uy, ux - Math.cos(ang + 0.42) * 12, uy - Math.sin(ang + 0.42) * 12);
      }
      /* one vector that overshoots the silhouette entirely */
      D.lw(2.2); D.strokeStyle([116, 240, 154], 0.5);
      D.line(cx, cy, cx + rx * 1.22, cy - ry * 0.78);
    }, { z: z, blur: 2.6 });

    /* the basis, measured */
    var e1 = P.pt(cx + rx * 0.66, cy + ry * 0.10);
    var e2 = P.pt(cx + rx * 0.04, cy - ry * 0.72);
    M.measure(c[0], c[1], e1[0], e1[1], { label: 'e1', alpha: 0.48, labelSize: 15 });
    M.measure(c[0], c[1], e2[0], e2[1], { label: 'e2', alpha: 0.48, labelSize: 15 });
    M.crosshair(c[0], c[1], 62, { label: 'sampled', ticks: true, alpha: 0.5 });
    mark(w, 'n = ' + Math.round(samp * N) + ' / ' + N, c[0] - 268, c[1] + 176, { size: 13, alpha: 0.46 });
    mark(w, 'schema: none', c[0] + 268, c[1] + 176, { size: 14, alpha: 0.5 });
    M.lyric(cue, p, { y: 330, size: 58, fit: 1480 });
  });

  /* ------------------------------------------------------- 2 · nutrients */
  /* one thin edge, and the beads it lets go of, one by one, into the dark. */
  EM.Scenes('fls.nutrients', function (w, p, cue) {
    var t = w.t, pal = w.pal, z = 0.22, P = proj(z, w);
    var NB = 11;
    var ex0 = -700, ex1 = 470, ey0 = -120, ey1 = -196;
    function edgeX(u) { return lerp(ex0, ex1, u); }
    function edgeY(u) { return lerp(ey0, ey1, u) - Math.sin(u * Math.PI) * 54; }

    M.shadow(function () {
      /* the edge: thin from above, heavy underneath */
      var top = [], bot = [];
      for (var q = 0; q <= 24; q++) {
        var u = q / 24;
        top.push([edgeX(u), edgeY(u) - 1]);
        bot.push([edgeX(u), edgeY(u) + 5 + 4 * Math.sin(u * Math.PI * 1.3)]);
      }
      D.spine(top, false); D.strokeStyle([34, 104, 64], 0.92); D.lw(2.4); D.ctx().stroke();
      D.begin();
      for (q = 0; q <= 24; q++) { if (q === 0) D.move(top[q][0], bot[q][1]); else D.to(top[q][0], bot[q][1]); }
      for (q = 24; q >= 0; q--) D.to(top[q][0], top[q][1]);
      D.close(); D.fillStyle([20, 62, 38], 0.85); D.ctx().fill();
      /* the light catching the lip */
      D.spine(top, false); D.strokeStyle(pal.glow, 0.10); D.lw(6); D.ctx().stroke();
      /* beads: still hanging, and already gone */
      for (var i = 0; i < NB; i++) {
        var u2 = (i + 0.7) / (NB + 0.4);
        var bx0 = edgeX(u2), by0 = edgeY(u2) + 8;
        var late = clamp((i - 2) / (NB - 3), 0, 1);
        var q2 = clamp((p - 0.10 - late * 0.42) / 0.55, 0, 1);
        var fall = q2 * q2;
        var bx = bx0 - fall * (26 + hash(i * 31) * 62) + Math.sin(t * 1.7 + i) * (3 + fall * 9);
        var by = by0 + fall * (300 + hash(i * 17) * 90);
        var rr = 4.5 + hash(i * 13 + 5) * 6.5;
        var a = 0.92 * (1 - 0.5 * fall);
        if (q2 > 0.02) {
          D.lw(2 + fall * 3); D.strokeStyle([20, 62, 38], a * 0.4);
          D.line(bx + 4, by - 10 - fall * 26, bx, by);
        }
        D.circle(bx, by, rr * (1 + 0.35 * (1 - q2)));
        D.fillStyle([20, 62, 38], a); D.ctx().fill();
      }
    }, { z: z, blur: 2.8 });

    /* the edge, measured; the count, failed */
    var m1 = P.pt(edgeX(0.34), edgeY(0.34));
    M.measure(m1[0], m1[1] - 26, m1[0], m1[1] + 10, { label: '', alpha: 0.30, arrows: false, tick: 6 });
    mark(w, 'n = 11', m1[0] - 210, m1[1] - 40, { size: 13, alpha: 0.46 });
    mark(w, 'transfer: n/a', m1[0] + 300, m1[1] + 92, { size: 13, alpha: 0.44 });
    M.crosshair(m1[0] + 520, m1[1] + 196, 54, { label: 'drop', ticks: true, alpha: 0.28 });
    M.lyric(cue, p, { y: 330, size: 58, fit: 1480 });
  });

  /* --------------------------------------------------------- 3 · tomato */
  /* the mass is not drawn at all: it is a block field, with packets arriving
     along arrows. the machine can only hold it as data. */
  EM.Scenes('fls.tomato', function (w, p, cue) {
    var t = w.t, pal = w.pal, z = 0.28, P = proj(z, w);
    var cx = 40, cy = -132, R = 268, i;
    var c = P.pt(cx, cy);

    D.glow(c[0], c[1], 480, pal.glow, 0.10);
    M.shadow(function () {
      /* block field: a round thing, quantised, never assembled */
      for (i = 0; i < 140; i++) {
        var h1 = hash(i * 17 + 3), h2 = hash(i * 29 + 5), h3 = hash(i * 41 + 7);
        var a = h1 * TAU + 0.10 * Math.sin(t * 0.9);
        var rr = R * Math.sqrt(0.03 + h2 * 0.95) * (1 + 0.03 * Math.sin(t * 1.2 + i));
        var bx = cx + Math.cos(a) * rr, by = cy + Math.sin(a) * rr * 0.88;
        var s = 24 + h3 * 20;
        var rot = h3 * 1.2 + t * (0.15 + h1 * 0.35);
        var ctx = D.ctx();
        ctx.save(); ctx.translate(bx, by); ctx.rotate(rot);
        D.rect(-s / 2, -s / 2, s, s);
        D.fillStyle([20, 62, 38], 0.42 + 0.52 * h2); ctx.fill();
        D.lw(1.3); D.strokeStyle(pal.hot, 0.07 + 0.10 * h1); ctx.stroke();
        ctx.restore();
      }
      /* packets arriving along arrows */
      for (i = 0; i < 10; i++) {
        var a2 = i / 10 * TAU + 0.42;
        var prog = clamp((p - 0.04 - i * 0.022) / 0.58, 0, 1);
        var r0 = R * 2.02, r1 = R * 1.24;
        var ax = cx + Math.cos(a2) * r0, ay = cy + Math.sin(a2) * r0;
        var tx = cx + Math.cos(a2 + 0.15) * r1, ty = cy + Math.sin(a2 + 0.15) * r1;
        D.lw(2.2); D.strokeStyle([34, 104, 64], 0.62);
        D.line(ax, ay, tx, ty);
        var ang = Math.atan2(ty - ay, tx - ax);
        D.line(tx, ty, tx - Math.cos(ang - 0.42) * 17, ty - Math.sin(ang - 0.42) * 17);
        D.line(tx, ty, tx - Math.cos(ang + 0.42) * 17, ty - Math.sin(ang + 0.42) * 17);
        /* the packet on its way */
        var px = lerp(ax, tx, prog), py = lerp(ay, ty, prog);
        D.rect(px - 7, py - 7, 14, 14); D.fillStyle([20, 62, 38], 0.9); D.ctx().fill();
      }
    }, { z: z, blur: 2.8 });

    M.crosshair(c[0], c[1], 150 + 8 * Math.sin(t * 1.9), { label: 'block field', ticks: true, alpha: 0.44 });
    mark(w, '140 blocks', c[0] - 300, c[1] + 196, { size: 13, alpha: 0.46 });
    mark(w, 'UNCLASSIFIED', c[0] + 288, c[1] + 196, { size: 13, alpha: 0.48, track: 4 });
    M.measure(c[0] - 250, c[1] + 268, c[0] + 250, c[1] + 268, { label: 'R = ?', alpha: 0.30 });
    M.lyric(cue, p, { y: 330, size: 58, fit: 1480 });
  });

  /* ---------------------------------------------------------- 4 · antiox */
  /* a ring of orbits around the mass; beads travel it and mean nothing. */
  EM.Scenes('fls.antiox', function (w, p, cue) {
    var t = w.t, pal = w.pal, z = 0.26, P = proj(z, w);
    var cx = 20, cy = -104, rx = 214, ry = 188;
    var orx = rx * 1.86, ory = ry * 1.86 * 0.40, rot = -0.20;
    var c = P.pt(cx, cy);
    var cs = Math.cos(rot), sn = Math.sin(rot);

    D.glow(c[0], c[1], 480, pal.glow, 0.07);
    M.shadow(function () {
      var pts = form(cx, cy, rx, ry, 4.2, t, { wob: 0.17, n: 46 });
      mass(pts, 0.92, 2.2);
      edge(pal, pts, 0.08, 6);
      /* the orbit: one flattened ring, drawn twice for a soft edge */
      for (var k = 0; k < 2; k++) {
        var ctx = D.ctx();
        ctx.save();
        ctx.translate(cx, cy); ctx.rotate(rot + k * 0.06);
        D.lw(2.1 - k * 0.7); D.strokeStyle(pal.shadow, 0.56 - k * 0.26);
        ctx.beginPath(); ctx.ellipse(0, 0, orx * (1 + k * 0.02), ory * (1 + k * 0.02), 0, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }
      /* beads on the orbit, with the short arc of travel behind each */
      for (var i = 0; i < 7; i++) {
        var ang = t * 1.15 + i * TAU / 7;
        var depth = 0.5 + 0.5 * Math.sin(ang);
        var ex = Math.cos(ang) * orx, ey = Math.sin(ang) * ory;
        var px = cx + ex * cs - ey * sn, py = cy + ex * sn + ey * cs;
        var rr = 4.5 + depth * 6.5;
        var a = 0.30 + depth * 0.62;
        /* trail */
        for (var h = 1; h <= 3; h++) {
          var an2 = ang - h * 0.14;
          var e2x = Math.cos(an2) * orx, e2y = Math.sin(an2) * ory;
          var qx = cx + e2x * cs - e2y * sn, qy = cy + e2x * sn + e2y * cs;
          D.circle(qx, qy, rr * (1 - h * 0.18)); D.fillStyle([20, 62, 38], a * (0.34 - h * 0.09)); D.ctx().fill();
        }
        D.circle(px, py, rr); D.fillStyle([34, 104, 64], a); D.ctx().fill();
      }
    }, { z: z, blur: 3.0 });

    M.crosshair(c[0], c[1], 132, { label: 'subject', ticks: true, alpha: 0.4 });
    M.measure(c[0] - 396, c[1] + 272, c[0] + 396, c[1] + 272, { label: 'orbit  r = ?', alpha: 0.32 });
    mark(w, '9 antioxidants: 0 found', c[0], c[1] + 214, { size: 12, alpha: 0.44 });
    M.lyric(cue, p, { y: 330, size: 58, fit: 1480 });
  });

  /* ------------------------------------------------------------- 5 · cat */
  /* a curve almost grows ears and a tail, then gives up. so close. */
  EM.Scenes('fls.cat', function (w, p, cue) {
    var t = w.t, pal = w.pal, z = 0.26, P = proj(z, w);
    var cx = -30, cy = -96, rx = 236, ry = 168;
    var en = Math.sin(Math.PI * clamp(p / 0.82, 0, 1));          /* ears: rise, fall */
    var dis = clamp((p - 0.66) / 0.34, 0, 1);                    /* dissolve */
    var c = P.pt(cx, cy);

    D.glow(c[0], c[1], 460, pal.glow, 0.06);
    M.shadow(function () {
      var pts = form(cx, cy, rx, ry, 5.6, t, { wob: 0.15 + 0.26 * dis, n: 52 });
      mass(pts, 0.92 - 0.5 * dis, 2.2);
      edge(pal, pts, 0.10 * (1 - dis), 6);
      /* the ears — two buds that never quite finish */
      for (var k = 0; k < 2; k++) {
        var a0 = -Math.PI / 2 + (k ? 0.46 : -0.46) + 0.06 * Math.sin(t * 1.2);
        var hgt = 22 + 88 * en;
        var tipx = cx + Math.cos(a0 + (k ? -0.10 : 0.10)) * rx * 1.00;
        var tipy = cy - ry - hgt;
        var lx = cx + Math.cos(a0 - 0.27) * rx * 0.86, ly = cy + Math.sin(a0 - 0.27) * ry * 0.86;
        var rxp = cx + Math.cos(a0 + 0.27) * rx * 0.86, ryp = cy + Math.sin(a0 + 0.27) * ry * 0.86;
        var ear = [[lx, ly], [(lx + tipx) / 2 + 10, (ly + tipy) / 2],
                   [tipx - 8, tipy + 6], [tipx, tipy + 2], [tipx + 8, tipy + 6],
                   [(rxp + tipx) / 2 - 10, (ryp + tipy) / 2], [rxp, ryp]];
        D.spine(ear, true); D.fillStyle([20, 62, 38], 0.9 - 0.55 * dis); D.ctx().fill();
        D.lw(1.8); D.strokeStyle([116, 240, 154], 0.85 - 0.5 * dis); D.ctx().stroke();
      }
      /* the tail: grows, curls, then melts down */
      var grow = E.outCubic(clamp(p / 0.60, 0, 1));
      var droop = clamp((p - 0.70) / 0.30, 0, 1);
      var core = [], half = [], j;
      for (j = 0; j <= 12; j++) {
        var u = j / 12;
        var ang = 0.24 - u * (1.06 + 0.30 * grow);            /* leaves low-right, sweeps up */
        var rad = 0.95 + u * 0.44 * grow;
        core.push([
          cx + Math.cos(ang) * rx * rad + u * u * 44,
          cy + Math.sin(ang) * ry * rad - u * (70 + 170 * grow) * 0.58 + droop * u * u * 200
        ]);
        half.push((9 * (1 - u) + 1.4) * (1 - 0.30 * droop));
      }
      /* the tail as a tapered ribbon, not a wire */
      var lt = [], rt = [];
      for (j = 0; j <= 12; j++) {
        var nx0 = core[Math.min(12, j + 1)][0] - core[j][0];
        var ny0 = core[Math.min(12, j + 1)][1] - core[j][1];
        var dl = Math.hypot(nx0, ny0) || 1;
        lt.push([core[j][0] - ny0 / dl * half[j], core[j][1] + nx0 / dl * half[j]]);
        rt.push([core[j][0] + ny0 / dl * half[j], core[j][1] - nx0 / dl * half[j]]);
      }
      var ribbon = lt.concat(rt.reverse());
      D.spine(ribbon, true);
      D.fillStyle([34, 104, 64], 0.86 * (1 - 0.5 * dis)); D.ctx().fill();
      /* it comes apart: fragments leave the outline */
      for (var s = 0; s < 8; s++) {
        var aa = hash(s * 31 + 3) * TAU;
        var rr = 1.05 + hash(s * 71 + 5) * 0.5;
        var fx = cx + Math.cos(aa) * rx * rr * (1 + dis * 0.5);
        var fy = cy + Math.sin(aa) * ry * rr * (1 + dis * 0.5);
        D.circle(fx, fy, 3 + hash(s * 13) * 7 * (0.4 + dis));
        D.fillStyle([20, 62, 38], 0.36 * dis + 0.04); D.ctx().fill();
      }
    }, { z: z, blur: 3.2 + 3 * dis });

    M.crosshair(c[0] + 20, c[1] - ry * 1.15, 74, { label: '?', ticks: true, alpha: 0.42 * (1 - dis * 0.6) });
    mark(w, 'match 0.61', c[0] - 288, c[1] - 250, { size: 13, alpha: 0.5, align: 'left' });
    M.measure(c[0] - 250, c[1] + 210, c[0] + 250, c[1] + 210, { label: 'ears: unresolved', alpha: 0.3 });
    M.lyric(cue, p, { y: 330, size: 58, fit: 1480 });
  });

  /* ------------------------------------------------------------ 6 · purr */
  /* the wall itself shivers at 25 Hz; the edge of the shadow goes to lint. */
  EM.Scenes('fls.purr', function (w, p, cue) {
    var t = w.t, pal = w.pal, z = 0.26, P = proj(z, w);
    var cx = -30, cy = -96, rx = 232, ry = 166;
    var c = P.pt(cx, cy);
    var hz = 25, amp = 3.4 + 2.6 * clamp(p, 0, 1);

    D.glow(c[0], c[1], 440, pal.glow, 0.06);

    /* the whole wall trembles: wide bands of shadow nudged sideways at 25 Hz */
    var ctx = D.ctx();
    ctx.save();
    for (var b = 0; b < 15; b++) {
      var y0 = -540 + b * 76;
      var off = Math.sin(TAU * hz * (t + b * 0.0013)) * (1.2 + amp * 0.4);
      D.rect(-980, y0 + off, 1960, 44);
      D.fillStyle(pal.shadow, 0.020); D.ctx().fill();
      if (b % 4 === 0) { D.rect(-980, y0 + off + 4, 1960, 2); D.fillStyle(pal.shadow, 0.05); D.ctx().fill(); }
    }
    ctx.restore();

    M.shadow(function () {
      /* four ghost outlines, each sampled at a slightly different 25 Hz phase */
      for (var g = 3; g >= 0; g--) {
        var ph = TAU * hz * (t - g * 0.0042);
        var ox = Math.cos(ph) * amp * (0.5 + g * 0.2);
        var oy = Math.sin(ph * 1.13) * amp * (0.35 + g * 0.16);
        var gp = form(cx + ox, cy + oy, rx, ry, 5.6, t, { wob: 0.20 + g * 0.05, n: 48 });
        D.spine(gp, true);
        D.strokeStyle([20, 62, 38], g === 0 ? 0.90 : 0.30 - g * 0.06);
        D.lw(g === 0 ? 2.4 : 1.4);
        if (g === 0) { D.fillStyle([14, 48, 30], 0.62); D.ctx().fill(); }
        D.ctx().stroke();
      }
      /* the sound leaving the body: warm rings of light, not shadow */
      for (var k = 0; k < 3; k++) {
        var u = (t * 2.6 + k / 3) % 1;
        var rr = 60 + u * 210;
        D.circle(cx + 20, cy + 40, rr);
        D.strokeStyle(pal.glow, 0.30 * (1 - u) * (0.4 + p));
        D.lw(3.6 * (1 - u) + 0.8);
        D.ctx().stroke();
      }
    }, { z: z, blur: 6.2 });

    M.crosshair(c[0], c[1], 150, { label: 'edge = ?', alpha: 0.34, ticks: true });
    mark(w, '25.0 Hz', c[0] + 330, c[1] - 216, { size: 13, alpha: 0.46, align: 'left' });
    mark(w, 'no waveform', c[0] - 330, c[1] + 176, { size: 12, alpha: 0.38, align: 'right' });
    M.lyric(cue, p, { y: 330, size: 58, fit: 1480 });
  });

  /* ------------------------------------------------------------- 7 · god */
  /* a rose window of shadow, and a hole the light still gets through. */
  EM.Scenes('fls.god', function (w, p, cue) {
    var t = w.t, pal = w.pal, z = 0.18, P = proj(z, w);
    var cx = -10, cy = -176, R = 352;
    var c = P.pt(cx, cy);
    var breathe = 0.5 + 0.5 * Math.sin(t * 0.9);
    var dirs = 8;

    /* the light goes quiet around it: reverence, not decoration */
    var ctx = D.ctx();
    var vg = ctx.createRadialGradient(c[0], c[1], 190, c[0], c[1], 1050);
    vg.addColorStop(0, 'rgba(8,6,5,0)');
    vg.addColorStop(0.55, 'rgba(8,6,5,0.16)');
    vg.addColorStop(1, 'rgba(6,4,3,0.52)');
    ctx.save(); ctx.fillStyle = vg; ctx.fillRect(-980, -560, 1960, 1120); ctx.restore();

    M.shadow(function () {
      /* outer wall of the window */
      D.circle(cx, cy, R * (1 + 0.004 * breathe)); D.lw(9); D.strokeStyle([34, 104, 64], 0.86); D.ctx().stroke();
      D.circle(cx, cy, R * 0.955); D.lw(2.2); D.strokeStyle([34, 104, 64], 0.6); D.ctx().stroke();
      D.circle(cx, cy, R * 0.80); D.lw(3.6); D.strokeStyle([34, 104, 64], 0.72); D.ctx().stroke();
      D.circle(cx, cy, R * 0.44); D.lw(6); D.strokeStyle([34, 104, 64], 0.82); D.ctx().stroke();
      /* the inner rosette */
      D.circle(cx, cy, R * 0.15); D.lw(2.6); D.strokeStyle([34, 104, 64], 0.70); D.ctx().stroke();
      for (var r2 = 0; r2 < 6; r2++) {
        var ar = r2 / 6 * TAU + 0.18;
        D.circle(cx + Math.cos(ar) * R * 0.285, cy + Math.sin(ar) * R * 0.285, R * 0.062);
        D.lw(2.2); D.strokeStyle([34, 104, 64], 0.62); D.ctx().stroke();
      }
      /* mullions */
      for (var i = 0; i < 16; i++) {
        var a = i / 16 * TAU + 0.06 * Math.sin(t * 0.6);
        D.lw(3.4); D.strokeStyle([34, 104, 64], 0.74);
        D.line(cx + Math.cos(a) * R * 0.44, cy + Math.sin(a) * R * 0.44,
               cx + Math.cos(a) * R * 0.95, cy + Math.sin(a) * R * 0.95);
      }
      /* eight cusped arches in the outer band */
      for (var k = 0; k < dirs; k++) {
        var a0 = k / dirs * TAU + Math.PI / dirs;
        var p0 = [cx + Math.cos(a0 - 0.30) * R * 0.46, cy + Math.sin(a0 - 0.30) * R * 0.46];
        var p1 = [cx + Math.cos(a0 + 0.30) * R * 0.46, cy + Math.sin(a0 + 0.30) * R * 0.46];
        var tip = [cx + Math.cos(a0) * R * 0.945, cy + Math.sin(a0) * R * 0.945];
        var c1 = [cx + Math.cos(a0 - 0.19) * R * 0.86, cy + Math.sin(a0 - 0.19) * R * 0.86];
        var c2 = [cx + Math.cos(a0 + 0.19) * R * 0.86, cy + Math.sin(a0 + 0.19) * R * 0.86];
        var cc = D.ctx();
        cc.beginPath();
        cc.moveTo(p0[0], p0[1]);
        cc.quadraticCurveTo(c1[0], c1[1], tip[0], tip[1]);
        cc.quadraticCurveTo(c2[0], c2[1], p1[0], p1[1]);
        D.lw(3); D.strokeStyle([34, 104, 64], 0.7); cc.stroke();
        /* the trefoil in each arch */
        var ta = a0 + Math.PI / dirs;
        D.circle(cx + Math.cos(ta) * R * 0.70, cy + Math.sin(ta) * R * 0.70, R * 0.052);
        D.lw(2.6); D.strokeStyle([34, 104, 64], 0.66); D.ctx().stroke();
      }
      /* the hole: nothing is drawn where the light still gets through */
      var ha = -0.62, hr = R * 0.60;
      D.circle(cx + Math.cos(ha) * hr, cy + Math.sin(ha) * hr, R * 0.115);
      D.fillStyle(pal.wallHi, 0.5); D.ctx().fill();
    }, { z: z, blur: 4.4 });

    /* the aperture itself: bright, and slightly too small for the question */
    var ha = -0.62, hr = R * 0.60;
    var hp = P.pt(cx + Math.cos(ha) * hr, cy + Math.sin(ha) * hr);
    M.pierce(hp[0], hp[1], 96 + 6 * breathe, { alpha: 0.92 });
    M.crosshair(hp[0], hp[1], 66, { label: 'aperture', ticks: true, alpha: 0.5 });
    var Rim = R * P.k;
    M.measure(c[0], c[1], c[0] - Rim * 0.66, c[1] + Rim * 0.66, { label: 'r = ?', alpha: 0.30 });
    mark(w, 'schema: none  /  schema: none  /  schema: none',
      c[0] - Rim * 0.98, c[1] + Rim * 0.92, { size: 13, alpha: 0.40, track: 3, align: 'left' });
    M.lyric(cue, p, { y: 344, size: 62, fit: 1460 });
  });

  /* ----------------------------------------------------------- 8 · exist */
  /* a point small enough to be a proof; its shadow takes the whole wall. */
  EM.Scenes('fls.exist', function (w, p, cue) {
    var t = w.t, pal = w.pal;
    var u = E.outCubic(clamp(p / 0.86, 0, 1));
    var z = 0.45 + 0.47 * u;                       /* the point goes toward the lamp */
    var P = proj(z, w);
    var cx = 215, cy = -165, r0 = 62;

    D.glow(P.pt(cx, cy)[0], P.pt(cx, cy)[1], 620, pal.glow, 0.05 + 0.05 * u);
    M.shadow(function () {
      var pts = form(cx, cy, r0, r0 * 0.93, 5.6, t, { wob: 0.13, n: 44 });
      D.spine(pts, true); D.fillStyle([14, 48, 30], 0.13); D.ctx().fill();
      D.spine(pts, true); D.strokeStyle([34, 104, 64], 0.62); D.lw(3.2); D.ctx().stroke();
      /* the outline repeated inward: the magnified image of a small thing */
      for (var k = 1; k <= 3; k++) {
        var q = form(cx, cy, r0 * (1 - k * 0.22), r0 * 0.93 * (1 - k * 0.22), 5.6, t, { wob: 0.13, n: 40 });
        D.spine(q, true); D.strokeStyle([34, 104, 64], 0.26 / k); D.lw(1.8); D.ctx().stroke();
      }
      edge(pal, pts, 0.10, 12);
    }, { z: z, blur: 7.5 });

    /* the proof: one dot, measured */
    var d = [10, -40];
    var ctx = D.ctx();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var g = ctx.createRadialGradient(d[0], d[1], 0, d[0], d[1], 54);
    g.addColorStop(0, rgba(pal.hot, 0.95));
    g.addColorStop(0.3, rgba(pal.glow, 0.42));
    g.addColorStop(1, rgba(pal.glow, 0));
    ctx.fillStyle = g; ctx.fillRect(d[0] - 54, d[1] - 54, 108, 108);
    ctx.restore();
    D.circle(d[0], d[1], 3.4); D.fillStyle(pal.hot, 0.98); D.ctx().fill();
    M.crosshair(d[0], d[1], 46, { label: 'the proof', ticks: true, alpha: 0.55 });
    mark(w, 'k = ' + (1 / (1 - z)).toFixed(1), d[0] + 132, d[1] + 52, { size: 13, alpha: 0.5, align: 'left' });
    dashes(w, d[0] + 10, d[1] + 6, d[0] + 300, d[1] + 210, 0.22);
    M.lyric(cue, p, { y: 330, size: 60, fit: 1460 });
  });

  /* ---------------------------------------------------------- 9 · gender */
  /* two unequal shapes swap, mirrored across the seam; the gap is the law. */
  EM.Scenes('fls.gender', function (w, p, cue) {
    var t = w.t, pal = w.pal;
    var u = E.inOutQuad(clamp(p, 0, 1));
    var GAP = 11, cyL = -68, cyR = -108;
    var lean = 16 * Math.sin(Math.PI * u);      /* they lean into the swap */
    var bxL = -338, bxR = 352;

    D.glow(0, -96, 560, pal.glow, 0.05);
    M.shadow(function () {
      clipHalf(-2100, -GAP, function () {
        var pts = form(bxL + lean, cyL, 214, 196, 11.3, t, { wob: 0.17, n: 48, altSeed: 12.9, alt: u });
        mass(pts, 0.91, 2.1);
        edge(pal, pts, 0.07, 6);
      });
      clipHalf(GAP, 2100, function () {
        var ctx = D.ctx();
        ctx.save(); ctx.scale(-1, 1);
        var pts = form(-bxR - lean, cyR, 172, 158, 12.9, t, { wob: 0.20, n: 48, altSeed: 11.3, alt: u });
        mass(pts, 0.91, 2.1);
        edge(pal, pts, 0.07, 6);
        ctx.restore();
      });
      /* the seam: the two halves never touch */
      D.lw(1.2); D.strokeStyle(pal.shadow, 0.34);
      D.line(-GAP - 0.8, -430, -GAP - 0.8, 300);
      D.line(GAP + 0.8, -430, GAP + 0.8, 300);
    }, { z: 0, blur: 2.8 });

    dashes(w, 0, -400, 0, 292, 0.30);
    M.measure(-GAP - 92, -378, GAP + 92, -378, { label: 'swap', alpha: 0.34 });
    mark(w, 'A → B', bxL, 216, { size: 13, alpha: 0.44 });
    mark(w, 'B → A', -bxR + 34, 176, { size: 13, alpha: 0.44 });
    M.lyric(cue, p, { y: 330, size: 58, fit: 1480 });
  });

  /* ------------------------------------------------------------ 10 · ftom */
  /* strict mirror. the seam is the whole statement. */
  EM.Scenes('fls.ftom', function (w, p, cue) {
    var t = w.t, pal = w.pal;
    var GAP = 9, cy = -74, cx = 320;
    var breathe = 0.5 + 0.5 * Math.sin(t * 1.25);

    D.glow(0, cy, 620, pal.glow, 0.05);
    M.shadow(function () {
      clipHalf(-2100, -GAP, function () {
        var pts = form(-cx, cy, 196, 178, 21.7, t, { wob: 0.15, breath: 0.02, n: 46 });
        mass(pts, 0.90, 2.1);
        edge(pal, pts, 0.07, 6);
        /* one symmetric notch so mirroring is legible */
        D.circle(-cx - 96 * breathe, cy - 40, 22); D.fillStyle(pal.wallHi, 0.22); D.ctx().fill();
      });
      clipHalf(GAP, 2100, function () {
        var ctx = D.ctx();
        ctx.save(); ctx.scale(-1, 1);
        var pts = form(-cx, cy, 196, 178, 21.7, t, { wob: 0.15, breath: 0.02, n: 46 });
        mass(pts, 0.90, 2.1);
        edge(pal, pts, 0.07, 6);
        D.circle(-cx - 96 * breathe, cy - 40, 22); D.fillStyle(pal.wallHi, 0.22); D.ctx().fill();
        ctx.restore();
      });
      D.lw(1.1); D.strokeStyle(pal.shadow, 0.3);
      D.line(-GAP - 0.8, -430, -GAP - 0.8, 300);
      D.line(GAP + 0.8, -430, GAP + 0.8, 300);
    }, { z: 0, blur: 2.6 });

    /* the boundary, measured like a law */
    dashes(w, 0, -404, 0, 296, 0.34);
    mark(w, 'F', -GAP - 30, -330, { size: 14, alpha: 0.5, align: 'right' });
    mark(w, 'M', GAP + 30, -330, { size: 14, alpha: 0.5, align: 'left' });
    M.measure(-cx - 210, cy + 250, -GAP - 40, cy + 250, { label: '1.000', alpha: 0.3 });
    M.measure(GAP + 40, cy + 250, cx + 210, cy + 250, { label: '1.000', alpha: 0.3 });
    M.lyric(cue, p, { y: 330, size: 58, fit: 1480 });
  });

  /* -------------------------------------------------------- 11 · whatever */
  /* forty-six small bodies at three depths cross the light, none of them a
     noun. the wall finally gets busy. */
  EM.Scenes('fls.whatever', function (w, p, cue) {
    var t = w.t, pal = w.pal;
    var LAY = [
      { z: 0.14, blur: 5.4, n: 15, sc: 1.62, a: 0.52, bias: 0.20 },
      { z: 0.34, blur: 2.6, n: 17, sc: 1.05, a: 0.90, bias: 0.58 },
      { z: 0.58, blur: 1.4, n: 14, sc: 0.68, a: 0.96, bias: 0.34 }
    ];
    var li, k;

    for (li = 0; li < LAY.length; li++) {
      (function (C, base) {
        M.shadow(function () {
          for (k = 0; k < C.n; k++) {
            var i = base + k;
            var h1 = hash(i * 73 + 5), h2 = hash(i * 131 + 17);
            var h3 = hash(i * 197 + 29), h4 = hash(i * 239 + 41);
            var spd = (120 + h1 * 340) * (h4 > 0.5 ? 1 : -1);
            var x = wrap(h1 * 2500 + t * spd, 2500) - 1250;
            var y = lerp(-430 + h2 * 470, w.lamp.y + (h2 - 0.5) * 560, C.bias)
                  + Math.sin(t * (0.8 + h3) * 1.15 + i * 1.7) * 44;
            var s = (11 + h1 * 19) * C.sc;
            var lit = clamp(1 - Math.hypot(x - w.lamp.x, y - w.lamp.y) / 820, 0, 1);
            var px = wrap(h1 * 2500 + (t - 0.055) * spd, 2500) - 1250;
            /* the streak it drags */
            if (Math.abs(px - x) < 620) {
              D.lw((1.2 + h1 * 4) * C.sc); D.strokeStyle([20, 62, 38], 0.30 * C.a);
              D.line(px, y + Math.sin(t * (0.8 + h3) * 1.15 + i * 1.7 - 0.2) * 5, x, y);
            }
            var rot = (h4 > 0.5 ? 1 : -1) * t * (0.35 + h3 * 0.7) + i;
            var bp = form(x, y, s, s * (0.55 + h2 * 0.85), i * 1.37 + 0.5, t,
              { wob: 0.34, n: 16, grain: 0.14, rot: rot });
            D.spine(bp, true); D.fillStyle([34, 104, 64], C.a); D.ctx().fill();
            D.spine(bp, true); D.strokeStyle(pal.hot, 0.10 + 0.26 * lit); D.lw(1.8); D.ctx().stroke();
          }
        }, { z: C.z, blur: C.blur });
      })(LAY[li], li * 19);
    }

    /* two long ones that cross the whole frame, almost a word */
    M.shadow(function () {
      for (var q = 0; q < 2; q++) {
        var yy = -170 + q * 210 + Math.sin(t * 0.8 + q) * 34;
        var xs = wrap(t * (250 + q * 140) + q * 950, 2600) - 1300;
        D.lw(2.6); D.strokeStyle([34, 104, 64], 0.5);
        D.line(xs, yy, xs - 300, yy - 46);
        D.circle(xs - 310, yy - 48, 7); D.fillStyle([34, 104, 64], 0.55); D.ctx().fill();
      }
    }, { z: 0.42, blur: 2.2 });

    M.crosshair(0, -438, 44, { label: 'n = ?', alpha: 0.3 });
    mark(w, 'count: unbounded', 720, -424, { size: 12, alpha: 0.42, align: 'right' });
    M.lyric(cue, p, { y: 330, size: 58, fit: 1480 });
  });

  /* ---------------------------------------------------------- 12 · amtpm */
  /* one arc of hours; the shadow on the ground is the only clock. */
  EM.Scenes('fls.amtpm', function (w, p, cue) {
    var t = w.t, pal = w.pal;
    var HOR = 120, R = 468;
    var th = Math.PI + p * Math.PI;
    var sx = Math.cos(th) * R, sy = HOR + Math.sin(th) * R;
    var alt = clamp(-Math.sin(th), 0, 1);
    var ox = -250;
    var dir = sx > ox ? -1 : 1;
    var len = 70 + 360 * Math.pow(1 - alt, 1.3);
    var i;

    M.shadow(function () {
      /* the horizon the shadow lies on */
      D.lw(2); D.strokeStyle(pal.shadow, 0.6);
      D.line(-960, HOR, 960, HOR);
      for (var q = -11; q <= 11; q++) {
        D.lw(1); D.strokeStyle(pal.shadow, 0.32);
        D.line(q * 84, HOR, q * 84, HOR + (q % 4 === 0 ? 12 : 6));
      }
      /* the standing thing */
      var obj = form(ox, HOR - 24, 24, 22, 3.3, t, { wob: 0.26, n: 20 });
      D.spine(obj, true); D.fillStyle([20, 62, 38], 0.9); D.ctx().fill();
      /* its shadow, the only clock this wall has */
      var scx = ox + dir * len * 0.5;
      var sp = form(scx, HOR + 3, len * 0.5, 9 + 15 * (1 - alt), 3.3, t,
        { wob: 0.13, n: 48, grain: 0.05 });
      for (i = 0; i < sp.length; i++) {
        sp[i][1] = HOR + 3 + clamp(sp[i][1] - (HOR + 3), -10, 18) * (0.45 + 0.55 * (1 - alt));
      }
      D.spine(sp, true); D.fillStyle([20, 62, 38], 0.74); D.ctx().fill();
      D.fellipse(ox + dir * 12, HOR + 2, 18, 4.5); D.fillStyle([34, 104, 64], 0.7); D.ctx().fill();
    }, { z: 0, blur: 3.0 });
    M.rim(function () {
      D.lw(1.2);
      var obj = form(ox, HOR - 24, 24, 22, 3.3, t, { wob: 0.26, n: 20 });
      D.spine(obj, true); D.stroke();
    }, { z: 0.35, alpha: 0.28 });

    /* the arc is the machine's clock: cool, ticked, exact */
    var ctx = D.ctx();
    ctx.save();
    D.lw(1.3); D.strokeStyle(pal.trace, 0.34);
    ctx.beginPath(); ctx.arc(0, HOR, R, Math.PI, TAU); ctx.stroke();
    for (var k = 0; k <= 12; k++) {
      var a = Math.PI + k / 12 * Math.PI;
      var lng = (k === 0 || k === 12) ? 16 : 8;
      D.lw(1.2); D.strokeStyle(pal.trace, k % 3 === 0 ? 0.42 : 0.22);
      D.line(Math.cos(a) * R, HOR + Math.sin(a) * R,
             Math.cos(a) * (R - lng), HOR + Math.sin(a) * (R - lng));
    }
    ctx.restore();
    mark(w, 'AM', -R + 10, HOR - 32, { size: 14, alpha: 0.55, align: 'left' });
    mark(w, 'PM', R - 10, HOR - 32, { size: 14, alpha: 0.55, align: 'right' });
    dashes(w, 0, HOR, 0, HOR - R - 16, 0.14);

    /* the hour itself: a bead of light on the arc, never a second lamp */
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var g = ctx.createRadialGradient(sx, sy, 0, sx, sy, 58);
    g.addColorStop(0, rgba(pal.hot, 0.70));
    g.addColorStop(0.22, rgba(pal.glow, 0.24));
    g.addColorStop(1, rgba(pal.glow, 0));
    ctx.fillStyle = g; ctx.fillRect(sx - 58, sy - 58, 116, 116);
    ctx.restore();
    D.circle(sx, sy, 5.5); D.fillStyle(pal.hot, 0.95); D.ctx().fill();
    M.crosshair(sx, sy, 36, { alpha: 0.32 });

    mark(w, 'L = ' + (len / 100).toFixed(2), ox - 208, HOR + 62, { size: 12, alpha: 0.42 });
    var q1 = ox + dir * 8, q2 = ox + dir * (len + 8);
    M.measure(Math.min(q1, q2), HOR + 36, Math.max(q1, q2), HOR + 36, { label: 'shadow', alpha: 0.26 });
    M.lyric(cue, p, { y: 340, size: 58, fit: 1480 });
  });

  /* ----------------------------------------------------------- 13 · role */
  /* the shadow turns over about an axis: role above, role below. */
  EM.Scenes('fls.role', function (w, p, cue) {
    var t = w.t, pal = w.pal;
    var FLIP = 0.62;
    var flipU = clamp(Math.abs(p - FLIP) / Math.max(FLIP, 1 - FLIP), 0, 1);
    var sq = Math.pow(flipU, 0.62);
    var z = 0.26 + 0.30 * E.outCubic(clamp((p - FLIP) / (1 - FLIP), 0, 1));
    var P = proj(z, w);
    var cx = 60, cy = -80;
    var rx = 252 * (1.20 - 0.20 * sq);
    var ry = 190 * (0.04 + 0.96 * sq);
    var fy = p < FLIP ? 1 : -1;
    var rot = (p < FLIP ? -1 : 1) * 0.13 * sq;

    D.glow(P.pt(cx, cy)[0], P.pt(cx, cy)[1], 470, pal.glow, 0.06);
    M.shadow(function () {
      var pts = form(cx, cy, rx, ry, 7.1, t, { wob: 0.16, n: 52, flipY: fy, rot: rot });
      mass(pts, 0.93, 2.2);
      edge(pal, pts, 0.10, 6);
      /* the edge that gets squeezed when the shadow turns over */
      if (sq < 0.5) {
        line([[cx - rx * 0.9, cy], [cx - rx * 0.3, cy - 8], [cx + rx * 0.3, cy + 8], [cx + rx * 0.9, cy]],
          pal.wallHi, 0.10, 3);
      }
    }, { z: z, blur: 2.6 + 2.2 * (1 - sq) });

    var c = P.pt(cx, cy);
    /* the axis it flips about */
    var ctx = D.ctx();
    ctx.save(); ctx.setLineDash([7, 10]);
    D.lw(1.1); D.strokeStyle(w.pal.trace, 0.30);
    D.line(-740, c[1], 740, c[1]);
    ctx.restore();
    M.measure(c[0] - 280, c[1], c[0] + 280, c[1], { label: 'role axis', alpha: 0.3 });
    mark(w, p < FLIP ? 'above' : 'below', c[0] + 400, c[1] - 18, { size: 13, alpha: 0.46, align: 'left' });
    mark(w, 'sgn = ' + (fy > 0 ? '+1' : '-1'), c[0] - 400, c[1] + 40, { size: 13, alpha: 0.46, align: 'right' });
    M.lyric(cue, p, { y: 330, size: 58, fit: 1480 });
  });

  /* ----------------------------------------------------------- 14 · stom */
  /* further: the shadow is pressed flat onto the floor and smears out. */
  EM.Scenes('fls.stom', function (w, p, cue) {
    var t = w.t, pal = w.pal;
    var u = E.inOutQuad(clamp(p / 0.94, 0, 1));
    var cx = 0, cy = lerp(-150, 146, u);
    var rx = lerp(258, 800, u);
    var ry = lerp(206, 38, u);
    var c = [cx, cy];

    D.glow(0, cy - 40, 520, pal.glow, 0.05);
    M.shadow(function () {
      var pts = form(cx, cy, rx, ry, 8.4, t, { wob: 0.12, fine: 0.045, n: 64 });
      for (var i = 0; i < pts.length; i++) if (pts[i][1] > 214) pts[i][1] = 214;
      mass(pts, 0.90, 2);
      edge(pal, pts, 0.08, 7);
      /* the smear: three pressed outlines, wider and flatter */
      for (var k = 1; k <= 3; k++) {
        var sp = form(cx, cy + 10 * k, rx * (1 + 0.07 * k), ry * (0.9 - 0.1 * k), 8.4, t + k * 0.07,
          { wob: 0.1, fine: 0.05, n: 56 });
        for (var j = 0; j < sp.length; j++) if (sp[j][1] > 216 + k * 2) sp[j][1] = 216 + k * 2;
        D.spine(sp, true); D.strokeStyle(pal.shadow, 0.24 / k); D.lw(1.6); D.ctx().stroke();
      }
      /* the floor it is pressed onto */
      D.rect(-980, 218, 1960, 46); D.fillStyle(pal.shadow, 0.30); D.ctx().fill();
      D.lw(1.6); D.strokeStyle(pal.shadow, 0.5); D.line(-980, 218, 980, 218);
    }, { z: 0.04, blur: 4.2 });

    var P = proj(0.04, w);
    var pc = P.pt(cx, cy);
    M.measure(pc[0] - 300, 244, pc[0] + 300, 244, { label: 'height: 0', alpha: 0.34 });
    mark(w, 'S → M', 690, -404, { size: 14, alpha: 0.46, align: 'right' });
    M.crosshair(pc[0] - rx * 1.02, pc[1], 52, { label: 'limit', ticks: true, alpha: 0.3 });
    M.lyric(cue, p, { y: 336, size: 58, fit: 1480 });
  });

  /* ---------------------------------------------------------- 15 · enter */
  /* the shadow overruns the frame: it is in the room with you now. */
  EM.Scenes('fls.enter', function (w, p, cue) {
    var t = w.t, pal = w.pal;
    var u = E.outCubic(clamp(p, 0, 1));
    var z = 0.55 + 0.36 * u;
    var P = proj(z, w);
    var cx = 215, cy = -165, r0 = 100;
    var c = P.pt(cx, cy);

    D.glow(c[0], c[1], 760, pal.glow, 0.05);
    M.shadow(function () {
      /* the silhouette that has outgrown the frame: a mass, then rings of it */
      for (var k = 3; k >= 0; k--) {
        var s = 1 - k * 0.16;
        var pts = form(cx, cy, r0 * s, r0 * 0.92 * s, 5.6, t, { wob: 0.10 + k * 0.04, n: 60 });
        D.spine(pts, true);
        if (k === 0) {
          D.fillStyle([10, 7, 6], 0.34 + 0.16 * u); D.ctx().fill();
          D.strokeStyle([116, 240, 154], 0.62); D.lw(7); D.ctx().stroke();
        } else {
          D.strokeStyle([34, 104, 64], 0.05 + 0.20 / k); D.lw(2.2); D.ctx().stroke();
        }
      }
      /* the light squeezed around the thing on its way past */
      var outer = form(cx, cy, r0 * 1.03, r0 * 0.95, 5.6, t, { wob: 0.10, n: 60 });
      D.spine(outer, true); D.strokeStyle(pal.glow, 0.13); D.lw(9); D.ctx().stroke();
      D.spine(outer, true); D.strokeStyle(pal.wallHi, 0.17); D.lw(3); D.ctx().stroke();
    }, { z: z, blur: 8 });

    M.crosshair(c[0], c[1], 120 + 40 * u, { label: 'z → 0', ticks: true, alpha: 0.22 });
    mark(w, 'frame: insufficient', -720, -430, { size: 12, alpha: 0.4, align: 'left' });
    M.lyric(cue, p, { y: 330, size: 62, fit: 1460, mode: 'light' });
  });

  /* ---------------------------------------------------------- 16 · trance */
  /* concentric rings breathe with the beat; the frame itself inhales; the
     shadow is almost gone. */
  EM.Scenes('fls.trance', function (w, p, cue) {
    var t = w.t, pal = w.pal;
    var cx = 0, cy = -70;
    var beat = EM.onsetPulse(t, 0.40);
    var breath = 0.5 + 0.5 * Math.sin(t * 1.7);
    var inflate = 1 + 0.055 * Math.sin(t * 1.7) + 0.04 * beat;

    /* the frame inhales: a dark rim advancing and receding */
    var ctx = D.ctx();
    var inner = 220 + 80 * breath + 40 * beat;
    var vg = ctx.createRadialGradient(cx, cy, inner, cx, cy, 1280 * inflate);
    vg.addColorStop(0, 'rgba(8,6,5,0)');
    vg.addColorStop(0.45, 'rgba(8,6,5,0.10)');
    vg.addColorStop(0.80, 'rgba(6,4,3,' + (0.20 + 0.10 * breath) + ')');
    vg.addColorStop(1, 'rgba(4,3,2,0.62)');
    ctx.save(); ctx.fillStyle = vg; ctx.fillRect(-980, -560, 1960, 1120); ctx.restore();

    M.shadow(function () {
      /* rings thick enough to be seen: the whole wall breathing */
      for (var i = 0; i < 11; i++) {
        var rr = (94 + i * 62) * inflate;
        var a = (0.58 - i * 0.038) * (0.55 + 0.45 * beat);
        if (a < 0.05) continue;
        D.circle(cx, cy, rr);
        D.lw(6.5 - i * 0.34);
        D.strokeStyle([20, 62, 38], a); D.ctx().stroke();
      }
      /* rings released on the beat, running outward */
      for (var k = 0; k < 4; k++) {
        var ph = (t * 0.85 + k / 4) % 1;
        D.circle(cx, cy, 120 + ph * 780);
        D.lw(4 * (1 - ph) + 1.4);
        D.strokeStyle([20, 62, 38], 0.44 * (1 - ph)); D.ctx().stroke();
      }
      /* the shadow is nearly dissolved: seven arcs left of the outline */
      var pts = form(cx, cy, 272, 228, 9.1, t, { wob: 0.22, n: 64, grain: 0.10 });
      for (var f = 0; f < 7; f++) {
        var i0 = Math.floor(hash(f * 37 + 2) * pts.length);
        var seg = [];
        for (var q = 0; q < 7; q++) seg.push(pts[(i0 + q) % pts.length]);
        line(seg, [20, 62, 38], 0.32 + 0.24 * hash(f * 11 + 5), 3 + hash(f * 7) * 3);
      }
    }, { z: 0.22, blur: 5.0 });

    /* warm counter-rings: the breath is light too */
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (var g2 = 0; g2 < 5; g2++) {
      var ph2 = (t * 0.62 + g2 / 5 + 0.15) % 1;
      D.circle(cx, cy, 138 + ph2 * 640);
      D.strokeStyle(pal.glow, 0.24 * (1 - ph2) * (0.4 + 0.6 * beat));
      D.lw(4.5 * (1 - ph2) + 1);
      ctx.stroke();
    }
    ctx.restore();
    D.glow(cx, cy, 300 + 120 * breath, pal.glow, 0.06 + 0.05 * beat);
    M.crosshair(cx, cy, 214, { label: 'trance', ticks: true, alpha: 0.30 });
    mark(w, 'dissolution: ' + (0.32 + 0.68 * clamp(p / 0.9, 0, 1)).toFixed(2), cx, cy - 344, { size: 13, alpha: 0.42 });
    M.lyric(cue, p, { y: 330, size: 60, fit: 1460 });
  });
})(window.EM);