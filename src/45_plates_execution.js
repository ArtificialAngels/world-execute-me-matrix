/* 45_plates_execution.js — Act V: the execution.
   One die, sixteen blows, one wall that keeps every one of them.
   Every plate is a single hard cut: the blow lands inside the line, the die
   lifts away, the burn stays. Red belongs to this act only.

   Note on randomness: EM.hash() is only exact for small keys (it squares and
   cubes its argument, so anything past ~348 loses its low bits and returns 0).
   Everything here therefore draws from R(seed, k), which keeps every key < 190. */
(function (EM) {
  'use strict';
  var D = EM.D, M = EM.M, L = EM.Life, W = 1920, H = 1080;
  var E = EM.E, TAU = EM.TAU, clamp = EM.clamp, lerp = EM.lerp, hash = EM.hash;

  function R(seed, k) { return hash(1 + (seed * 97 + k * 43) % 187); }
  function Rs(seed, k) { return R(seed, k) * 2 - 1; }
  function shA(w, a) { return EM.rgba(w.pal.shadow, a == null ? 1 : a); }
  function trA(w, a) { return EM.rgba(w.pal.trace, a == null ? 1 : a); }

  /* ---------------------------------------------------------- projection
     A shape is authored as it should sit on the wall; wp() pulls each vertex
     back along the lamp's ray so the cast lands exactly there. Depth still
     works: blur, and the enlargement of anything given real depth. */
  function zon(zn) { return 1 / (1 - clamp(zn, 0, 0.92)); }
  function wp(w, x, y, zn) {
    var k = zon(zn);
    return [w.lamp.x + (x - w.lamp.x) / k, w.lamp.y + (y - w.lamp.y) / k];
  }
  function wPoly(w, pts, zn) {
    var out = [], i;
    for (i = 0; i < pts.length; i++) out.push(wp(w, pts[i][0], pts[i][1], zn));
    return out;
  }

  /* ------------------------------------------------------------- machine
     The only cool cyan in the act: the counter, the numerals, the measure. */
  function ttext(w, str, x, y, o) {
    o = o || {};
    var a = o.a == null ? 0.5 : o.a;
    if (a <= 0.008 || !str) return;
    D.text(str, x, y, {
      size: o.size || 15, kind: 'mono', weight: o.weight || 400,
      color: trA(w, a), align: o.align || 'center',
      tracking: o.track == null ? 2.2 : o.track
    });
  }
  function tally(w, lit, a) {
    if (a <= 0.008) return;
    var y = 498, gap = 34, x0 = -884, i;
    for (i = 0; i < 16; i++) {
      var on = i < lit, cur = (i === lit - 1);
      var x = x0 + i * gap;
      D.circle(x, y, cur ? 4.2 : (on ? 2.8 : 2.1));
      if (on) D.fill(w.pal.trace, (cur ? 0.9 : 0.42) * a);
      else D.stroke(w.pal.trace, 0.11 * a);
      if (cur) { D.circle(x, y, 8.4); D.stroke(w.pal.trace, 0.30 * a); }
    }
  }
  function call(w, n, a) {
    if (a <= 0.008) return;
    ttext(w, 'CALL ' + n + ' / 16', 878, -462, { size: 16, a: a * 0.66, align: 'right', track: 2.6 });
  }
  function progress(w, lit, a) { tally(w, lit, a); call(w, lit, a); }

  /* --------------------------------------------------------------- light */
  function flare(w, x, y, r, a, col) {
    if (a <= 0.006 || r <= 2) return;
    var ctx = D.ctx();
    var g = ctx.createRadialGradient(x, y, 0, x, y, r);
    var c = col || w.pal.hot;
    g.addColorStop(0, EM.rgba(c, a));
    g.addColorStop(0.4, EM.rgba(c, a * 0.30));
    g.addColorStop(1, EM.rgba(c, 0));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.restore();
  }
  function darkenFrame(w, x, y, r0, r1, a) {
    if (a <= 0.006) return;
    var ctx = D.ctx();
    var g = ctx.createRadialGradient(x, y, r0, x, y, r1);
    g.addColorStop(0, 'rgba(4,3,3,0)');
    g.addColorStop(0.5, 'rgba(4,3,3,' + (a * 0.45) + ')');
    g.addColorStop(1, 'rgba(4,3,3,' + a + ')');
    ctx.save();
    ctx.fillStyle = g;
    ctx.fillRect(-W / 2, -H / 2, W, H);
    ctx.restore();
  }
  function embers(w, cx, cy, rx, ry, seed, a, n) {
    if (a <= 0.012) return;
    var ctx = D.ctx();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < n; i++) {
      var ang = R(seed, i * 3) * TAU;
      var j = 0.5 + 0.55 * R(seed, i * 3 + 1);
      D.circle(cx + Math.cos(ang) * rx * j, cy + Math.sin(ang) * ry * j, 1.4 + R(seed, i * 3 + 2) * 3.4);
      D.fill(w.pal.red, a * (0.3 + 0.7 * R(seed, i * 3 + 2)));
    }
    ctx.restore();
  }

  /* --------------------------------------------------------------- burns */
  /* one ragged silhouette, drawn twice: a soft heat halo and a hard core */
  function blobPts(cx, cy, rx, ry, seed, n) {
    var pts = [], i;
    n = n || 11;
    for (i = 0; i < n; i++) {
      var ang = (i / n) * TAU;
      var j = 0.64 + 0.66 * R(seed, i * 2) + 0.16 * Math.sin(ang * 3 + seed * 0.7);
      pts.push([cx + Math.cos(ang) * rx * j, cy + Math.sin(ang) * ry * j]);
    }
    return pts;
  }
  function fillPts(pts) {
    var i;
    D.begin();
    for (i = 0; i < pts.length; i++) { if (i === 0) D.move(pts[i][0], pts[i][1]); else D.to(pts[i][0], pts[i][1]); }
    D.close();
    D.fill();
  }
  function charTex(cx, cy, rx, ry, seed, a, n) {
    M.shadow(function () {
      for (var i = 0; i < n; i++) {
        var ang = R(seed, i * 4) * TAU;
        var d = Math.sqrt(R(seed, i * 4 + 1)) * 0.92;
        var x = cx + Math.cos(ang) * rx * d, y = cy + Math.sin(ang) * ry * d;
        var rr = 3 + R(seed, i * 4 + 2) * 15;
        var pts = [], q;
        for (q = 0; q < 4; q++) {
          var a2 = (q / 4) * TAU + R(seed, i * 4 + 3) * 1.3;
          var j2 = 0.55 + R(seed, i * 4 + q) * 0.8;
          pts.push([x + Math.cos(a2) * rr * j2, y + Math.sin(a2) * rr * j2]);
        }
        D.fillPoly(pts);
      }
    }, { z: 0.05, blur: 1.6, ink: a });
  }
  function splat(w, cx, cy, rx, ry, seed, a) {
    if (a <= 0.01) return;
    var pts = blobPts(cx, cy, rx, ry, seed, 11);
    M.shadow(function () { fillPts(pts); }, { z: 0.05, blur: 13, ink: a * 0.5 });
    M.shadow(function () { fillPts(pts); }, { z: 0.05, blur: 2.6, ink: a });
    charTex(cx, cy, rx, ry, seed + 6, a * 0.55, 9);
  }
  /* a jagged rectangle outline: the seal's own box, cut by hand */
  function jagRect(cx, cy, hw, hh, seed, k) {
    var pts = [], n = 6, s, i;
    for (s = 0; s < 4; s++) {
      for (i = 0; i < n; i++) {
        var u = i / n, x, y;
        if (s === 0) { x = lerp(-hw, hw, u); y = -hh; }
        else if (s === 1) { x = hw; y = lerp(-hh, hh, u); }
        else if (s === 2) { x = lerp(hw, -hw, u); y = hh; }
        else { x = -hw; y = lerp(hh, -hh, u); }
        pts.push([cx + x + (R(seed, k + s * 9 + i) - 0.5) * 26,
                  cy + y + (R(seed, k + s * 9 + i + 3) - 0.5) * 26]);
      }
    }
    return pts;
  }
  function ringPath(out, inn) {
    var i;
    D.begin();
    for (i = 0; i < out.length; i++) { if (i === 0) D.move(out[i][0], out[i][1]); else D.to(out[i][0], out[i][1]); }
    D.close();
    for (i = inn.length - 1; i >= 0; i--) { if (i === inn.length - 1) D.move(inn[i][0], inn[i][1]); else D.to(inn[i][0], inn[i][1]); }
    D.close();
    D.fill();
  }
  /* the charred border a die leaves: dark outside the seal, clean under it */
  function charBorder(w, cx, cy, hw, hh, seed, a) {
    if (a <= 0.01) return;
    var out = jagRect(cx, cy, hw + 30 + 30 * R(seed, 31), hh + 26 + 24 * R(seed, 32), seed, 1);
    var inn = jagRect(cx, cy, hw + 5, hh + 5, seed + 3, 40);
    M.shadow(function () { ringPath(out, inn); }, { z: 0.05, blur: 13, ink: a * 0.40 });
    var mid = jagRect(cx, cy, hw + 19 + 15 * R(seed, 33), hh + 16 + 12 * R(seed, 34), seed + 1, 60);
    var hole = jagRect(cx, cy, hw + 4, hh + 4, seed + 4, 80);
    M.shadow(function () { ringPath(mid, hole); }, { z: 0.05, blur: 2.6, ink: a });
    charTex(cx, cy, hw + 26, hh + 22, seed + 9, a * 0.5, 12);
  }
  function crackNet(w, seed, n, a, spanX, spanY, cy) {
    if (a <= 0.01) return;
    M.shadow(function () {
      for (var i = 0; i < n; i++) {
        var x = (R(seed, i * 4) - 0.5) * spanX;
        var y = (cy || 0) + (R(seed, i * 4 + 1) - 0.5) * spanY;
        var ang = R(seed, i * 4 + 2) * TAU;
        var len = 110 + R(seed, i * 4 + 3) * 300;
        D.lw(1.8 + R(seed, i * 4 + 1) * 2.8);
        D.begin(); D.move(x, y);
        D.to(x + Math.cos(ang) * len * 0.58, y + Math.sin(ang) * len * 0.58);
        D.to(x + Math.cos(ang + 0.34) * len, y + Math.sin(ang + 0.34) * len);
        D.stroke();
      }
    }, { z: 0.05, blur: 2.2, ink: a });
  }
  /* the wall around the imprint, and the cracks that run out of it */
  function scorch(w, cx, cy, hw, hh, heat, p, seed) {
    var spread = E.outCubic(p);
    charBorder(w, cx, cy, hw, hh, seed, 0.74 + 0.24 * heat);
    /* burns this blow threw out, and older ones already on the wall */
    var ns = 3 + Math.round(heat * 3), i;
    for (i = 0; i < ns; i++) {
      var ang = R(seed, 7 + i * 3) * TAU;
      var dist = (1.15 + 1.5 * R(seed, 8 + i * 3)) * hw * (0.62 + 0.5 * spread);
      splat(w, cx + Math.cos(ang) * dist, cy + Math.sin(ang) * dist * 0.72,
        hw * (0.15 + 0.2 * R(seed, 9 + i * 3)), hh * (0.55 + 0.8 * R(seed, 9 + i * 3)),
        seed + 11 + i, 0.30 + 0.22 * heat);
    }
    M.shadow(function () {
      var n = 8 + Math.round(heat * 8);
      for (var q = 0; q < n; q++) {
        var sd = q % 4, u2 = R(seed, 31 + q * 4);
        var px, py;
        if (sd === 0) { px = cx + lerp(-hw, hw, u2); py = cy - hh; }
        else if (sd === 1) { px = cx + hw; py = cy + lerp(-hh, hh, u2); }
        else if (sd === 2) { px = cx + lerp(hw, -hw, u2); py = cy + hh; }
        else { px = cx - hw; py = cy + lerp(hh, -hh, u2); }
        var a2 = Math.atan2(py - cy, px - cx) + (R(seed, 32 + q * 4) - 0.5) * 0.8;
        var len = (0.5 + 1.05 * R(seed, 33 + q * 4)) * hw * (0.35 + 0.65 * spread);
        D.lw(1.8 + R(seed, 34 + q * 4) * 2.6);
        D.begin(); D.move(px, py);
        var qx = px, qy = py, s2;
        for (s2 = 1; s2 <= 3; s2++) {
          var aa = a2 + (R(seed, 35 + q * 4 + s2) - 0.5) * 0.75;
          qx += Math.cos(aa) * len / 3; qy += Math.sin(aa) * len / 3;
          D.to(qx, qy);
        }
        D.stroke();
      }
    }, { z: 0.06, blur: 2.4, ink: 0.55 + 0.24 * heat });
  }
  /* the shock of the blow: a ragged ring running out across the wall */
  function shockRing(w, cx, cy, rx, ry, p, heat, pulse) {
    var a = Math.pow(clamp(1 - p / 0.62, 0, 1), 2.0) * (0.62 + 0.34 * heat) + pulse * 0.24;
    if (a <= 0.012) return;
    var g = 0.72 + 1.9 * E.outCubic(clamp(p / 0.8, 0, 1));
    var pts = blobPts(cx, cy, rx * g, ry * g * 1.3, 3, 16);
    var pts2 = blobPts(cx, cy, rx * g * 1.14, ry * g * 1.5, 5, 16);
    M.shadow(function () {
      D.lw(3.2); D.polyline(pts, true);
      D.lw(1.4); D.polyline(pts2, true);
    }, { z: 0.07, blur: 2.2, ink: a });
  }

  /* --------------------------------------------------------------- press
     The die: a slab on two rods, pressed down onto the wall. It breaks up
     with heat — one slab, then two pieces, then a shattered die. */
  function press(w, o) {
    var zn = o.zn == null ? 0.22 : o.zn;
    var blur = o.blur == null ? 4 : o.blur;
    var bx = o.bx, hw = o.hw, edgeY = o.edgeY;
    var frag = o.frag || 0, heat = o.heat || 0, seed = o.seed || 1;
    var i;
    M.shadow(function () {
      /* two guide rods and the shaft, up out of frame */
      for (i = 0; i < 2; i++) {
        var sx = i ? 1 : -1, rx = bx + sx * (hw * 1.26);
        D.fillPoly(wPoly(w, [[rx - 13, edgeY - 190], [rx + 13, edgeY - 190], [rx + 13, -1900], [rx - 13, -1900]], zn));
      }
      D.fillPoly(wPoly(w, [[bx - hw * 0.2, edgeY - 380], [bx + hw * 0.2, edgeY - 380],
        [bx + hw * 0.2, -1900], [bx - hw * 0.2, -1900]], zn));
      var pieces = frag ? frag + 2 : 1;
      for (i = 0; i < pieces; i++) {
        var xa = bx - hw + 2 * hw * (i / pieces) + (i ? 6 + heat * 14 : 0);
        var xb = bx - hw + 2 * hw * ((i + 1) / pieces) - (i < pieces - 1 ? 6 + heat * 14 : 0);
        var dy = frag ? Rs(seed, i * 2) * 46 * heat : 0;
        var top = edgeY - 340 + dy, lip = edgeY + dy;
        /* the wedge the die is cut from, then the die face under it */
        D.fillPoly(wPoly(w, [
          [xa + (xb - xa) * 0.10, top], [xb - (xb - xa) * 0.10, top],
          [xb, lip - 70], [xa, lip - 70]
        ], zn));
        D.fillPoly(wPoly(w, [
          [xa - 16, lip - 76], [xb + 16, lip - 76], [xb + 16, lip - 12],
          [xb + 4, lip], [xa - 4, lip], [xa - 16, lip - 12]
        ], zn));
      }
    }, { z: zn, blur: blur, ink: o.ink == null ? 0.94 : o.ink, alpha: o.a });
  }

  /* the lit lip of the die: the one edge that catches the lamp */
  function pressRim(w, bx, hw, edgeY, a) {
    M.rim(function () {
      D.lw(1.6);
      D.line(bx - hw - 16, edgeY - 2, bx + hw + 16, edgeY - 2);
    }, { z: 0.22, alpha: a });
  }

  /* --------------------------------------------------------------- stamp
     The word is the lyric in these plates: a seal pressed into the wall. */
  function seal(w, cue, p, o) {
    var a = L.vis(p, L.ramp(cue)) * (o.a == null ? 1 : o.a);
    if (a <= 0.006) return;
    var ctx = D.ctx();
    var size = o.size;
    var wd = o.wordW;
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.rotate(o.rot || 0);
    if (o.frame !== false) {
      var bwd = wd / 2 + 26, bht = size * 0.60;
      D.lw(3);
      D.strokeStyle(shA(w, 0.5 * a));
      var k;
      for (k = 0; k < 3; k++) {
        var u0 = k * 0.33, u1 = k * 0.33 + 0.31;
        D.line(lerp(-bwd, bwd, u0), -bht, lerp(-bwd, bwd, u1), -bht);
        D.line(lerp(-bwd, bwd, u0), bht, lerp(-bwd, bwd, u1), bht);
      }
      D.lw(2.4);
      D.line(-bwd, -bht, -bwd, -bht * 0.35); D.line(-bwd, bht * 0.35, -bwd, bht);
      D.line(bwd, -bht, bwd, -bht * 0.35); D.line(bwd, bht * 0.35, bwd, bht);
      D.lw(4.4);
      D.line(-bwd - 8, -bht, -bwd + 26, -bht); D.line(-bwd, -bht - 8, -bwd, -bht + 26);
      D.line(bwd - 26, bht, bwd + 8, bht); D.line(bwd, bht - 26, bwd, bht + 8);
    }
    ctx.restore();
    /* the word, with a hot edge while the cut is fresh */
    ctx.save();
    if (o.hot > 0.01) {
      ctx.shadowColor = EM.rgba(w.pal.red, clamp(0.85 * o.hot, 0, 0.95));
      ctx.shadowBlur = 24 + 42 * o.hot;
    }
    M.lyric(cue, p, {
      x: o.x, y: o.y, size: size, rot: o.rot, mode: 'stamp',
      track: -2, fit: 1400, alpha: o.a == null ? 1 : o.a
    });
    ctx.restore();
    /* the die slipped: a second, lighter strike */
    if (o.double > 0.02) {
      M.lyric(cue, p, {
        x: o.x + o.double, y: o.y - o.double * 0.7, size: size * 0.99, rot: o.rot,
        mode: 'stamp', track: -2, fit: 1400, alpha: (o.a == null ? 1 : o.a) * 0.30
      });
    }
  }

  /* ---------------------------------------------------------------- hit */
  /* i = 0..15: the sixteen calls. heat = the body failing as they land. */
  function execPlate(i) {
    var heat = i / 15, seed = 3 + i * 9;
    return function (w, p, cue) {
      var wc = EM.World.at(cue.t);
      var lx = wc.lamp.x;
      var side = lx > 40 ? -1 : (lx < -40 ? 1 : (R(seed, 0) > 0.5 ? 1 : -1));

      var pulse = EM.onsetPulse(w.t, 0.2);
      var kick = clamp(Math.pow(clamp(1 - p / 0.6, 0, 1), 2.0) + pulse * 0.55, 0, 1.25);
      var land = E.inCubic(clamp(p / 0.16, 0, 1));
      var lift = E.outCubic(clamp((p - 0.18) / 0.62, 0, 1));

      /* stamped on the far side of the lamp, so the light rims the die and
         never sits inside the word */
      var wx = clamp(side * (196 + Rs(seed, 1) * 76) - lx * 0.22, -500, 500);
      var wy = 258 + Rs(seed, 2) * 44 + heat * 30;
      var size = 150 + 74 * heat + Rs(seed, 3) * 12;
      var rot = Rs(seed, 4) * 0.07 + side * 0.016 * (0.4 + heat);
      var wordW = D.textWidth(cue.text, size, { kind: 'cond', weight: 700 });
      var bwd = wordW / 2 + 26, bht = size * 0.60;

      var ctx = D.ctx();
      ctx.save();
      if (kick > 0.03) ctx.translate(Math.sin(w.t * 61.3) * kick * 9, Math.cos(w.t * 47.7) * kick * 6);

      /* 1. the wall keeps the mark */
      scorch(w, wx, wy, bwd, bht, heat, p, seed);
      shockRing(w, wx, wy, bwd * 1.03, bht * 1.35, p, heat, pulse);
      /* 2. the flash of the blow (and what makes the word sit out) */
      flare(w, wx, wy, bwd * (1.15 + 0.7 * kick), 0.07 + 0.15 * kick + 0.05 * heat, w.pal.hot);

      /* 3. the die and its afterimages as the stroke goes through the wall */
      var gap = 128 - 120 * land;
      var edgeY = wy - bht - 22 - gap - lift * 300;
      var hw = 246 + 66 * heat + R(seed, 5) * 40;
      var bx = wx * 0.92, g;
      var zn = 0.20 + kick * 0.13;
      var ghosts = heat > 0.22 ? (heat > 0.62 ? 2 : 1) : 0;
      for (g = ghosts; g >= 0; g--) {
        press(w, {
          bx: bx, hw: hw * (1 + g * 0.02), edgeY: edgeY - g * (34 + 46 * heat),
          h: 620, zn: zn + g * 0.055, blur: 3 + 3 * heat + g * 3 + kick * 4,
          heat: heat, seed: seed + g * 3, frag: heat > 0.34 ? (heat > 0.62 ? 2 : 1) : 0,
          a: g === 0 ? 1 : (0.16 / g) * (0.45 + 0.55 * kick)
        });
      }
      pressRim(w, bx, hw, edgeY, 0.30 + 0.25 * kick);

      /* 4. the word, and the strikes that missed */
      var ghostN = heat > 0.30 ? (heat > 0.60 ? 2 : 1) : 0;
      if (ghostN && kick > 0.04) {
        for (g = 1; g <= ghostN; g++) {
          M.type(cue.text, {
            x: wx + Rs(seed, 6 + g) * 30, y: wy - g * 26,
            size: size * (1 + g * 0.02), mode: 'cast', z: 0.5 + g * 0.08, blur: 6 + g * 3,
            track: -2, alpha: 0.09 * kick * (1 / g)
          });
        }
      }
      seal(w, cue, p, {
        x: wx, y: wy, size: size, rot: rot, wordW: wordW,
        hot: heat * (1 - p * 0.5) * (0.45 + 0.55 * kick),
        double: heat > 0.40 ? 4 + 7 * heat : 0
      });

      /* 5. the cut is still hot */
      embers(w, wx, wy, bwd * 1.1, bht * 1.5, seed + 17,
        clamp(0.95 - p * 1.2, 0, 1) * (0.20 + 0.8 * heat), 10 + Math.round(heat * 6));

      /* 6. no lamp to overload any more: the hit is pure signal */

      /* 7. the machine counts */
      progress(w, i + 1, 0.5 + 0.4 * heat);
      ctx.restore();
    };
  }

  var i;
  for (i = 0; i <= 15; i++) {
    if (i >= 12 && i <= 14) continue;            /* the count is spoken there */
    EM.Scenes('exe.hit' + EM.pad(i + 1, 2), execPlate(i));
  }

  /* --------------------------------------------------------- exe.n1..n3
     The machine counts the blows out loud: two holes, two numerals, one cold
     measurement. No die, no flash — the rhythm is in the marks, not the body. */
  var NUMERALS = [['1', '2'], ['3', '4'], ['5', '6']];
  function numPlate(k) {
    var nums = NUMERALS[k], seed = 41 + k * 9;
    return function (w, p, cue) {
      /* the wall has been taking it: a field of burns, and cracks between */
      var bi;
      for (bi = 0; bi < 6 + k * 2; bi++) {
        splat(w, (R(seed, bi * 3) - 0.5) * 1900, (R(seed, bi * 3 + 1) - 0.5) * 980,
          74 + R(seed, bi * 3 + 2) * 130, 52 + R(seed, bi * 3 + 2) * 90, seed + bi, 0.46);
      }
      crackNet(w, seed + 7, 16, 0.32, 1900, 1000, 0);

      var mx = [-306 + k * 30, 300 - k * 20], my = [-30 + k * 22, 112 - k * 18];
      var land = [clamp(p / 0.14, 0, 1), clamp((p - 0.14) / 0.16, 0, 1)];
      var lit = 12 + k * 2;
      for (var m = 0; m < 2; m++) {
        var u = land[m];
        if (u <= 0.004) continue;
        lit++;
        var x = mx[m] + Rs(seed, 20 + m) * 14;
        var y = my[m] + Rs(seed, 22 + m) * 14;
        /* the hole is punched through the wall, and the wall is burnt around it */
        splat(w, x, y, 116 * u, 96 * u, seed + 30 + m, 0.62 * u);
        M.shadow(function () {
          var pts = [], q;
          for (q = 0; q < 12; q++) {
            var ang = (q / 12) * TAU;
            var rr = (30 + 10 * R(seed, 40 + m * 5 + q % 5)) * u;
            pts.push([x + Math.cos(ang) * rr, y + Math.sin(ang) * rr * 0.94]);
          }
          D.fillPoly(pts);
        }, { z: 0.1, blur: 2.2, ink: 0.95 * u });
        /* the lit lip: a hole has an edge that catches the lamp */
        M.shadow(function () {
          D.lw(2.2); D.circle(x, y, 40 * u); D.stroke();
        }, { z: 0.1, blur: 1.6, ink: 0.5 * u });
        var ctx = D.ctx();
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        D.lw(1.4); D.circle(x, y, 43 * u);
        D.stroke(EM.rgba(w.pal.hot, 0.26 * u));
        ctx.restore();
        /* cracks out of the hole */
        M.shadow(function () {
          for (var q2 = 0; q2 < 4; q2++) {
            var a2 = R(seed, 50 + m * 7 + q2) * TAU;
            var len = (60 + R(seed, 51 + m * 7 + q2) * 150) * u;
            D.lw(2.2 * u);
            D.line(x + Math.cos(a2) * 30, y + Math.sin(a2) * 30,
              x + Math.cos(a2 + 0.2) * len, y + Math.sin(a2 + 0.2) * len);
          }
        }, { z: 0.1, blur: 2.6, ink: 0.55 * u });
        /* a tally notch cut beside the hole */
        M.shadow(function () {
          D.lw(8 * u);
          D.line(x - 96, y - 78, x + 44, y - 96);
        }, { z: 0.1, blur: 2.4, ink: 0.68 * u });
        /* numeral, cool and exact */
        var nx = x + (m ? 88 : -88), ny = y - 106;
        D.lw(1);
        D.line(nx, ny + 34, x + (m ? -22 : 22), y - 26);
        D.stroke(trA(w, 0.28 * u));
        ttext(w, nums[m], nx, ny, { size: 48 + 12 * u, a: 0.86 * u, track: 3 });
      }
      if (land[1] > 0.05) {
        M.measure(mx[0] - 140, my[1] + 190, mx[1] + 140, my[1] + 190,
          { label: nums[0] + ' \u2014 ' + nums[1], alpha: 0.36 * land[1] });
      }
      M.lyric(cue, p, { y: 330, size: 58, fit: 1460, mode: 'ink' });
      progress(w, Math.min(16, lit), 0.72);
    };
  }
  EM.Scenes('exe.n1', numPlate(0));
  EM.Scenes('exe.n2', numPlate(1));
  EM.Scenes('exe.n3', numPlate(2));

  /* -------------------------------------------------------------- exe.if
     Close on the whole burnt wall. The next blow is already being lowered. */
  EM.Scenes('exe.if', function (w, p, cue) {
    var seed = 61;
    var j;
    for (j = 0; j < 14; j++) {
      splat(w, (R(seed, j * 4) - 0.5) * 2050, (R(seed, j * 4 + 1) - 0.5) * 1100,
        80 + R(seed, j * 4 + 2) * 190, 58 + R(seed, j * 4 + 2) * 130, seed + j * 2, 0.52);
    }
    crackNet(w, seed + 11, 26, 0.40, 1950, 1100, 0);
    embers(w, -320, 120, 520, 320, seed + 13, 0.16, 8);
    embers(w, 430, -240, 380, 240, seed + 17, 0.11, 5);
    /* the die being lowered, still on its rods */
    var drop = E.inCubic(clamp(p / 0.95, 0, 1));
    var edgeY = lerp(-404, -206, drop);
    press(w, { bx: -30, hw: 470, edgeY: edgeY, h: 760, zn: 0.19, blur: 7, heat: 0.5, seed: seed, frag: 0, ink: 0.92 });
    pressRim(w, -30, 470, edgeY, 0.4);
    M.measure(-560, edgeY + 40, 560, edgeY + 40, { label: 'stroke', alpha: 0.30 });
    ttext(w, 'next', 570, edgeY + 40, { size: 13, a: 0.42, align: 'left', track: 3 });
    M.lyric(cue, p, { y: 330, size: 60, fit: 1460, mode: 'light' });
    progress(w, 16, 0.55);
  });

  /* ------------------------------------------------------------ exe.give
     Sixteen dies come down at once: a grid of executions. */
  EM.Scenes('exe.give', function (w, p, cue) {
    var seed = 67, cols = 4, rows = 4, gx = 336, gy = 232, cx = 0, cy = -76;
    var land = E.outCubic(clamp(p / 0.2, 0, 1));
    var beamY = lerp(-560, -478, land);
    var c;
    M.shadow(function () {
      D.rect(cx - gx * 1.74, beamY, gx * 3.48, 30); D.fill();
      D.rect(cx - gx * 1.74, beamY + 30, gx * 3.48, 6); D.fill();
      for (c = 0; c < cols; c++) {
        var x = cx + (c - 1.5) * gx;
        D.rect(x - 7, beamY + 36, 14, cy + 1.5 * gy + 30 - beamY - 36); D.fill();
      }
    }, { z: 0.16, blur: 4, ink: 0.9 });
    for (var r2 = 0; r2 < rows; r2++) for (var c2 = 0; c2 < cols; c2++) {
      var kk = r2 * cols + c2;
      var u = clamp((p - 0.03 - kk * 0.012) / 0.11, 0, 1);
      if (u <= 0.002) continue;
      var x2 = cx + (c2 - 1.5) * gx, y2 = cy + (r2 - 1.5) * gy;
      var squash = 1.42 - 0.42 * E.outCubic(u);
      splat(w, x2, y2, 96 * squash, 60 * squash, seed + kk * 2, 0.46 * u);
      M.shadow(function () {
        D.lw(1.4); D.circle(x2, y2, 68 * squash); D.stroke();
      }, { z: 0.06, blur: 5, ink: 0.4 * u });
      M.stamp('EXECUTION', x2, y2, {
        size: 47 * squash, alpha: 0.9 * (0.4 + 0.6 * u),
        rot: Rs(seed, kk * 3) * 0.05
      });
    }
    M.lyric(cue, p, { y: 372, size: 58, fit: 1440, mode: 'light' });
    progress(w, 16, 0.62);
  });

  /* ------------------------------------------------------------ exe.then
     The array collapses into one. */
  EM.Scenes('exe.then', function (w, p, cue) {
    var seed = 71, cols = 4, rows = 4, gx = 336, gy = 232, cx = 0, cy = -46;
    var conv = E.inCubic(clamp(p / 0.68, 0, 1));
    var fin = clamp((p - 0.52) / 0.42, 0, 1);
    var beamY = lerp(-478, -640, conv);
    M.shadow(function () {
      D.rect(cx - gx * 1.74, beamY, gx * 3.48, 28); D.fill();
    }, { z: 0.16, blur: 4, ink: 0.85 * (1 - conv) });
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
      var gx0 = cx + (c - 1.5) * gx, gy0 = cy + (r - 1.5) * gy;
      var x = lerp(gx0, cx, conv), y = lerp(gy0, cy + 34, conv);
      var sz = lerp(47, 168, conv);
      var a = 0.9 * (1 - conv) * (0.55 + 0.45 * clamp(p / 0.2, 0, 1));
      if (a < 0.012) continue;
      M.stamp('EXECUTION', x, y, { size: sz, alpha: a, rot: Rs(seed, (r * cols + c) * 3) * 0.04 * (1 - conv) });
    }
    if (fin > 0.002) {
      splat(w, cx, cy + 34, 520, 240, seed + 5, 0.2 * fin);
      M.stamp('EXECUTION', cx, cy + 34, { size: 176, alpha: 0.94 * fin, rot: -0.015 });
    }
    M.lyric(cue, p, { y: 372, size: 58, fit: 1440, mode: 'ink' });
    progress(w, 16, 0.6);
  });

  /* ------------------------------------------------------------ exe.only
     One seal, the size of the wall. Everything else goes out. */
  EM.Scenes('exe.only', function (w, p, cue) {
    var seed = 79;
    var grow = E.outExpo(clamp(p / 0.46, 0, 1));
    var size = lerp(184, 310, grow);
    var a = clamp(p / 0.16, 0, 1);
    var ctx = D.ctx();
    ctx.save();
    ctx.shadowColor = EM.rgba(w.pal.red, 0.62 * (1 - p * 0.45));
    ctx.shadowBlur = 28 + 34 * (1 - p * 0.6);
    M.stamp('EXECUTION', 0, 26, { size: size, alpha: 0.96 * a, rot: -0.018 });
    ctx.restore();
    /* the seal frame, cracked open */
    M.shadow(function () {
      var wd = size * 4.3, hh = size * 0.76, q;
      D.lw(3.6);
      for (q = 0; q < 5; q++) {
        var u0 = q / 5, u1 = (q + 1) / 5 - 0.04;
        D.line(lerp(-wd / 2, wd / 2, u0), -hh, lerp(-wd / 2, wd / 2, u1), -hh);
        D.line(lerp(-wd / 2, wd / 2, u0), hh, lerp(-wd / 2, wd / 2, u1), hh);
      }
      D.lw(2.8);
      D.line(-wd / 2, -hh, -wd / 2, -hh + 46); D.line(-wd / 2, hh - 46, -wd / 2, hh);
      D.line(wd / 2, -hh, wd / 2, -hh + 46); D.line(wd / 2, hh - 46, wd / 2, hh);
    }, { z: 0.08, blur: 3, ink: 0.52 * a });
    embers(w, 0, 26, size * 3.0, size * 0.9, seed, 0.42 * (1 - p * 0.5), 12);
    M.lyric(cue, p, { y: 340, size: 54, fit: 1400, mode: 'light' });
    progress(w, 16, 0.32);
  });

  /* ------------------------------------------------------------ exe.back
     A spoked burst crosses the frame: the last scan of a failing process. */
  EM.Scenes('exe.back', function (w, p, cue) {
    var ret = E.outCubic(clamp(p / 0.42, 0, 1));
    var L0 = { x: 0, y: 0 };
    /* the machine scans itself: eight rays from the centre, no light involved */
    M.shadow(function () {
      for (var i = 0; i < 8; i++) {
        var a0 = -1.1 + i * 0.285 + Math.sin(w.t * 0.5 + i * 1.7) * 0.014;
        var r0 = 96 + R(83, i * 2) * 120, r1 = r0 + 360 + R(83, i * 2 + 1) * 540;
        D.lw(2.6 + R(83, i * 2) * 1.8);
        D.line(L0.x + Math.cos(a0) * r0, L0.y + Math.sin(a0) * r0,
          L0.x + Math.cos(a0) * r1, L0.y + Math.sin(a0) * r1);
      }
    }, { z: 0.2, blur: 6, ink: 0.44 * ret });
    /* the object itself, in the beam */
    M.rim(function () {
      D.lw(1.2);
      for (var i2 = 0; i2 < 8; i2++) {
        var a1 = -1.1 + i2 * 0.285;
        D.line(L0.x + Math.cos(a1) * 12, L0.y + Math.sin(a1) * 12,
          L0.x + Math.cos(a1) * 30, L0.y + Math.sin(a1) * 30);
      }
      D.circle(L0.x, L0.y, 9); D.stroke();
    }, { z: 0.62, alpha: 0.4 * ret });
    M.lyric(cue, p, { y: 336, size: 58, fit: 1460, mode: 'ink' });
    progress(w, 16, 0.6);
  });

  /* ------------------------------------------------------------- exe.run
     The machine pulls its own trigger: the wire goes taut, then it goes. */
  EM.Scenes('exe.run', function (w, p, cue) {
    var seed = 89;
    var pull = E.outCubic(clamp(p / 0.52, 0, 1));
    var brk = clamp((p - 0.52) / 0.07, 0, 1);
    var after = clamp((p - 0.52) / 0.42, 0, 1);
    var y0 = -34, ax = -742, bx2 = 990, breakX = 188;
    var sag = (1 - pull) * 130;
    /* the shadow of the wire, then the wire's own catch-light */
    M.shadow(function () {
      if (brk < 0.5) {
        D.lw(3.4);
        D.spine([[ax, y0], [0, y0 + sag], [bx2, y0]]);
      } else {
        D.lw(3.4);
        D.spine([[ax, y0], [breakX - 260 + 70 * after, y0 - 120 * after], [breakX - 130, y0 - 34 * after]]);
        D.spine([[bx2, y0 + 4], [breakX + 280 - 50 * after, y0 + 190 * after], [breakX + 140, y0 + 60 * after]]);
      }
      /* the trigger housing, in the beam */
      D.lw(4); D.rect(ax - 34, y0 - 58, 68, 116); D.stroke();
      D.lw(2.6); D.circle(ax, y0, 17); D.stroke();
      /* the lever, pulled down by the wire, snapping back when it lets go */
      var lev = brk < 0.5 ? lerp(0.66, 1.30, pull) : lerp(1.30, 0.46, E.outCubic(after));
      D.lw(5);
      D.line(ax, y0, ax + Math.cos(lev) * 104, y0 + Math.sin(lev) * 104);
      D.circle(ax + Math.cos(lev) * 104, y0 + Math.sin(lev) * 104, 12); D.fill();
      /* the pin the wire runs over */
      D.lw(2.4); D.circle(ax + 104, y0 + 6, 12); D.stroke();
    }, { z: 0.28, blur: 4.6 });
    /* the wire as the object in the beam: a thin warm catch-light on top */
    M.rim(function () {
      D.lw(1.1);
      if (brk < 0.5) D.spine([[ax, y0 - 3], [0, y0 + sag - 3], [bx2, y0 - 3]]);
      else {
        D.spine([[ax, y0 - 3], [breakX - 260 + 70 * after, y0 - 123 * after], [breakX - 130, y0 - 37 * after]]);
        D.spine([[bx2, y0 + 1], [breakX + 280 - 50 * after, y0 + 187 * after], [breakX + 140, y0 + 57 * after]]);
      }
    }, { z: 0.28, alpha: 0.34 });
    ttext(w, 'T ' + (0.4 + 1.9 * pull).toFixed(2), ax + 150, y0 - 96, { size: 14, a: 0.34 + 0.36 * pull, align: 'left' });
    ttext(w, brk < 0.5 ? 'intact' : 'broken', bx2 - 20, y0 - 96, { size: 14, a: brk < 0.5 ? 0.26 : 0.66, align: 'right' });
    if (brk > 0.01) {
      M.pierce(breakX, y0 + 14, 14 + 44 * (1 - brk), { alpha: 0.7 * (1 - brk * 0.7) });
      flare(w, breakX, y0 + 14, 110 + 200 * (1 - brk), 0.20 * (1 - brk), w.pal.hot);
      embers(w, breakX, y0 + 14, 70, 60, seed, 0.8 * (1 - brk * 0.6), 7);
      ttext(w, 'cut', breakX, y0 + 128, { size: 15, a: 0.5 * (1 - brk * 0.5), track: 3 });
    }
    M.lyric(cue, p, { y: 330, size: 56, fit: 1460, mode: 'ink' });
    progress(w, 16, 0.52 + 0.2 * pull);
  });

  /* ------------------------------------------------------------ exe.trap
     The four sides close again; inside the frame it is all burn. */
  function sides(w, ap, zn, blur, a) {
    M.shadow(function () {
      D.fillPoly(wPoly(w, [[-1700, -1700], [1700, -1700], [1700, ap.y0], [-1700, ap.y0]], zn));
      D.fillPoly(wPoly(w, [[-1700, ap.y1], [1700, ap.y1], [1700, 1700], [-1700, 1700]], zn));
      D.fillPoly(wPoly(w, [[-1700, -1700], [ap.x0, -1700], [ap.x0, 1700], [-1700, 1700]], zn));
      D.fillPoly(wPoly(w, [[ap.x1, -1700], [1700, -1700], [1700, 1700], [ap.x1, 1700]], zn));
    }, { z: zn, blur: blur, ink: a });
  }
  function burntEdge(w, ap, a, seed) {
    if (a <= 0.01) return;
    M.shadow(function () {
      var pts = [[ap.x0, ap.y0], [ap.x1, ap.y0], [ap.x1, ap.y1], [ap.x0, ap.y1], [ap.x0, ap.y0]];
      var q, s;
      D.lw(3.4);
      for (q = 0; q < 4; q++) {
        var p1 = pts[q], p2 = pts[q + 1];
        D.begin();
        for (s = 0; s <= 10; s++) {
          var u = s / 10;
          var px = lerp(p1[0], p2[0], u) + (R(seed, q * 11 + s) - 0.5) * 14;
          var py = lerp(p1[1], p2[1], u) + (R(seed, q * 11 + s + 5) - 0.5) * 14;
          if (s === 0) D.move(px, py); else D.to(px, py);
        }
        D.stroke();
      }
    }, { z: 0.09, blur: 3, ink: 0.55 * a });
  }
  EM.Scenes('exe.trap', function (w, p, cue) {
    var seed = 97;
    var close = E.outCubic(clamp(p / 0.88, 0, 1));
    var ap = {
      x0: -960 + lerp(110, 340, close), x1: 960 - lerp(110, 340, close),
      y0: -540 + lerp(84, 316, close), y1: 540 - lerp(56, 166, close)
    };
    var j;
    for (j = 0; j < 6; j++) {
      splat(w, (R(seed, j * 3) - 0.5) * 1300, (R(seed, j * 3 + 1) - 0.5) * 620,
        110 + R(seed, j * 3 + 2) * 170, 80 + R(seed, j * 3 + 2) * 110, seed + j, 0.52);
    }
    crackNet(w, seed + 6, 18, 0.38, 1200, 640, 0);
    embers(w, ap.x0 + 260, ap.y0 + 210, 300, 200, seed + 11, 0.20, 6);
    sides(w, ap, 0.2, 4.5, 0.8);
    burntEdge(w, ap, 1, seed);
    (function () {
      var ctx = D.ctx();
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = EM.rgba(w.pal.glow, 0.22);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.rect(ap.x0, ap.y0, ap.x1 - ap.x0, ap.y1 - ap.y0);
      ctx.stroke();
      ctx.restore();
    })();
    M.measure(ap.x0, ap.y1 - 30, ap.x1, ap.y1 - 30, { label: Math.round(ap.x1 - ap.x0) + ' \u00d7 ' + Math.round(ap.y1 - ap.y0), alpha: 0.3 });
    M.lyric(cue, p, { y: 330, size: 58, fit: 1200, mode: 'light' });
    progress(w, 16, 0.66);
  });

  /* ----------------------------------------------------------- exe.trap2
     The frame closes to one slit of light, then the light goes. */
  EM.Scenes('exe.trap2', function (w, p, cue) {
    var seed = 103;
    var close = E.outCubic(clamp(p / 0.8, 0, 1));
    var slit = lerp(84, 8, close);
    var ap = {
      x0: -960 + lerp(120, 566, close), x1: 960 - lerp(120, 566, close),
      y0: -slit, y1: slit
    };
    var squeeze = Math.sin(clamp((p - 0.32) / 0.46, 0, 1) * Math.PI);
    var j;
    for (j = 0; j < 4; j++) {
      splat(w, (R(seed, j * 3) - 0.5) * 1300, (R(seed, j * 3 + 1) - 0.5) * 620,
        100 + R(seed, j * 3 + 2) * 150, 70 + R(seed, j * 3 + 2) * 100, seed + j, 0.46);
    }
    /* the light squeezed into one line */
    var ctx = D.ctx();
    var g = ctx.createLinearGradient(ap.x0, 0, ap.x1, 0);
    g.addColorStop(0, EM.rgba(w.pal.hot, 0));
    g.addColorStop(0.5, EM.rgba(w.pal.hot, 0.62 * (0.3 + 0.7 * squeeze)));
    g.addColorStop(1, EM.rgba(w.pal.hot, 0));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g;
    ctx.fillRect(ap.x0, ap.y0 - 5, ap.x1 - ap.x0, (ap.y1 - ap.y0) + 10);
    ctx.restore();
    /* the two edges of the slit are burning through */
    M.shadow(function () {
      D.lw(2.6);
      D.line(ap.x0, ap.y0, ap.x1, ap.y0);
      D.line(ap.x0, ap.y1, ap.x1, ap.y1);
    }, { z: 0.12, blur: 2.6, ink: 0.72 });
    embers(w, 0, 0, (ap.x1 - ap.x0) * 0.4, 26, seed + 9, 0.34 * squeeze, 10);
    sides(w, ap, 0.24, 5, 0.97);
    burntEdge(w, ap, 0.9, seed);
    var out = E.inCubic(clamp((p - 0.46) / 0.52, 0, 1));
    if (out > 0.004) {
      D.rect(-W / 2, -H / 2, W, H);
      D.fill([4, 3, 3], 0.86 * out);
    }
    M.lyric(cue, p, { y: 330, size: 56, fit: 1400, mode: 'light', alpha: 1 - 0.6 * out });
    progress(w, 16, 0.5 * (1 - out));
  });
})(window.EM);