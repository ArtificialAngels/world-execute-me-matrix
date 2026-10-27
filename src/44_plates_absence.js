/* 44_plates_absence.js — Act IV: absence (1:43 – 2:27).
   The lamp starts to leave (01_world.js already walks it off to the right); the
   wall empties. Two motifs carry the act: the HOLE — light passing through a
   body that is losing its interior — and the DISAPPEARANCE: things thin out
   until only a point and a string of dust are left.

   DRAWING RULE FOR THIS ACT: on a wall this dark there is hardly any ink left
   to read with, so the body is drawn as EDGE LIGHT (pal.glow / pal.hot, thin,
   alpha .35–.75) and only a small soft stain is kept for weight. Big dark
   fills are deliberately avoided — except for one soft mass in abs.challenge,
   where the mass *is* the shadow. */
(function (EM) {
  'use strict';
  var D = EM.D, M = EM.M, L = EM.Life;
  var W = 1920, H = 1080;
  var E = EM.E, TAU = EM.TAU, clamp = EM.clamp, lerp = EM.lerp;
  var hash = EM.hash, hashs = EM.hashs, rgba = EM.rgba;

  /* ------------------------------------------------------------ utilities */
  function proj(w, z, x, y) {
    var k = 1 / (1 - clamp(z == null ? 0.3 : z, 0, 0.93));
    return { x: w.lamp.x + (x - w.lamp.x) * k, y: w.lamp.y + (y - w.lamp.y) * k, k: k };
  }
  /* edge light: the warm hairline that is all a body gets in this act */
  function edge(w, a, cnv) {
    D.strokeStyle(cnv ? w.pal.hot : w.pal.glow, a);
    D.fillStyle(w.pal.glow, a);
  }
  /* the machine's own hand: a cool mono reading (measuring / numbering only) */
  function read(w, str, x, y, a, size, align) {
    if (a <= 0.008) return;
    D.text(str, x, y, {
      size: size || 14, kind: 'mono', weight: 400,
      color: rgba(w.pal.trace, a), align: align || 'center', tracking: 1.6
    });
  }
  function trace(w, a) { D.strokeStyle(w.pal.trace, a); D.fillStyle(w.pal.trace, a); }

  /* a soft dark stain — the little weight a body leaves, never a fill */
  function stain(w, x, y, rx, ry, a, rot) {
    if (a <= 0.01) return;
    var ctx = D.ctx();
    ctx.save();
    ctx.translate(x, y); ctx.rotate(rot || 0); ctx.scale(1, Math.max(0.05, ry / Math.max(1, rx)));
    var g = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(2, rx));
    g.addColorStop(0, rgba(w.pal.shadow, 0.5 * a));
    g.addColorStop(0.6, rgba(w.pal.shadow, 0.2 * a));
    g.addColorStop(1, rgba(w.pal.shadow, 0));
    ctx.fillStyle = g;
    ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
    ctx.restore();
  }
  /* deterministic motes drifting on t */
  function motes(w, n, seed, a, spread) {
    var sp = spread || 1;
    for (var i = 0; i < n; i++) {
      var h1 = hash(seed + i * 73), h2 = hash(seed + i * 131), h3 = hash(seed + i * 197);
      var ux = EM.wrap(h1 + w.t * 0.006 * (0.4 + h3), 1);
      var uy = EM.wrap(h2 - w.t * 0.004 * (0.3 + h1), 1);
      var x = (ux - 0.5) * W * 1.45 * sp, y = (uy - 0.5) * H * 1.35 * sp;
      var tw = 0.5 + 0.5 * Math.sin(w.t * (0.5 + h3 * 1.4) + i * 0.7);
      var al = a * (0.25 + 0.75 * tw) * (0.4 + 0.6 * w.dust);
      if (al < 0.01) continue;
      D.fillStyle(w.pal.wallHi, al);
      D.circle(x, y, 0.7 + h3 * 2.1); D.fill();
    }
  }

  /* the figure: a standing contour, all that is left of a body. */
  var FIG = [
    [0.00, -1.00], [0.10, -0.97], [0.14, -0.88], [0.12, -0.78], [0.26, -0.70],
    [0.40, -0.55], [0.42, -0.38], [0.30, -0.18], [0.34, 0.05], [0.44, 0.35],
    [0.50, 0.70], [-0.50, 0.70], [-0.44, 0.35], [-0.34, 0.05], [-0.30, -0.18],
    [-0.42, -0.38], [-0.40, -0.55], [-0.26, -0.70], [-0.12, -0.78], [-0.14, -0.88],
    [-0.10, -0.97]
  ];
  function fig(x, y, sc) {
    var out = [];
    for (var i = 0; i < FIG.length; i++) out.push([x + FIG[i][0] * sc * 0.62, y + FIG[i][1] * sc]);
    return out;
  }
  /* draw the contour as short runs so the punched hole reads as a gap */
  function drawFig(pts, hx, hy, hr, lw) {
    D.lw(lw);
    var n = pts.length;
    for (var i = 0; i < n; i++) {
      var a = pts[i], b = pts[(i + 1) % n];
      for (var k = 0; k < 8; k++) {
        var u0 = k / 8, u1 = (k + 1) / 8;
        var x0 = lerp(a[0], b[0], u0), y0 = lerp(a[1], b[1], u0);
        var x1 = lerp(a[0], b[0], u1), y1 = lerp(a[1], b[1], u1);
        var mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
        if (hr > 0 && Math.hypot(mx - hx, my - hy) < hr) continue;
        D.line(x0, y0, x1, y1);
      }
    }
  }
  /* light through the hole: hot core + warm spill, then the lit lip of the hole */
  function throughHole(w, K, hr, a) {
    M.pierce(K.x, K.y, Math.max(10, hr * 1.6), { alpha: 0.34 * a });
    M.pierce(K.x, K.y, Math.max(5, hr * 0.7), { alpha: 0.46 * a });
  }
  function holeLip(w, K, hr, a) {
    D.strokeStyle(w.pal.hot, a);
    D.lw(1.2);
    D.circle(K.x, K.y, Math.max(3, hr)); D.stroke();
  }

  /* ===================================================================
     abs.if — "If I can". Almost nothing: the light has gone far right and
     one last thread hangs in the beam. The machine measures the distance. */
  EM.Scenes('abs.if', function (w, p, cue) {
    var lx = w.lamp.x, ly = w.lamp.y;
    var a = E.outCubic(clamp(p / 0.5, 0, 1));
    var br = 0.5 + 0.5 * Math.sin(w.t * 1.12);
    var ax = lx - 470, ay = ly + 120, bx = lx - 30, by = ly + 166;
    var bdx = lerp(ax, bx, 0.5), bdy = lerp(ay, by, 0.5) + 104 + br * 4;
    var z = 0.26;
    M.pierce(bdx, bdy, 15 + 7 * br, { alpha: 0.3 + 0.12 * br });
    M.shadow(function () {
      D.lw(2.2); D.line(ax, ay, bx, by);
      D.lw(1.5); D.line(bdx, lerp(ay, by, 0.5), bdx, bdy);
    }, { z: z, blur: 6, alpha: 0.3 });
    edge(w, 0.6 + 0.15 * a);
    D.lw(1.7); D.line(ax, ay, bx, by);
    D.lw(1.3); D.line(bdx, lerp(ay, by, 0.5), bdx, bdy);
    edge(w, 0.68 + 0.15 * a, true); D.lw(1.4); D.circle(bdx, bdy, 9); D.stroke();
    edge(w, 0.55 + 0.15 * a); D.lw(1.7);
    D.line(ax - 12, ay - 36, ax + 12, ay + 36);
    D.line(bx - 12, by - 36, bx + 12, by + 36);
    M.measure(bdx, bdy, lx - 170, ly + 96, {
      label: 'd ' + Math.round(Math.hypot(lx - bdx, ly - bdy)),
      alpha: 0.44, tick: 6, labelSize: 12
    });
    read(w, 'if', ax + 16, ay - 54, 0.42 * a, 13, 'left');
    M.lyric(cue, p, { y: 330, size: 50, fit: 1360, alpha: 0.9 });
  });

  /* ===================================================================
     abs.vibr — "…feel your vibrations". The thread hums; the machine
     measures it in cold cyan. */
  EM.Scenes('abs.vibr', function (w, p, cue) {
    var lx = w.lamp.x, ly = w.lamp.y;
    var grow = E.outCubic(clamp(p / 0.22, 0, 1));
    var amp = grow * (10 + 32 * (0.5 + 0.5 * Math.sin(w.t * 1.9)));
    var ph = w.t * 24;
    var ax = lx - 470, ay = ly + 120, bx = lx - 30, by = ly + 166;
    function thread(a) {
      D.begin();
      for (var i = 0; i <= 48; i++) {
        var u = i / 48;
        var x = lerp(ax, bx, u), y0 = lerp(ay, by, u);
        var y = y0 + Math.sin(u * Math.PI) * Math.sin(ph) * a
          + Math.sin(u * Math.PI * 2) * Math.sin(ph * 0.5) * a * 0.34;
        if (i === 0) D.move(x, y); else D.to(x, y);
      }
      D.stroke();
    }
    var z = 0.3;
    M.shadow(function () {
      D.lw(1.4); thread(amp);
      D.lw(2.2); D.line(ax - 8, ay - 56, ax + 8, ay + 56); D.line(bx - 8, by - 56, bx + 8, by + 56);
    }, { z: z, blur: 2.6, alpha: 0.4 });
    edge(w, 0.72);
    D.lw(1.8); thread(amp);
    edge(w, 0.6); D.lw(2.2);
    D.line(ax - 8, ay - 56, ax + 8, ay + 56); D.line(bx - 8, by - 56, bx + 8, by + 56);
    var mx = lerp(ax, bx, 0.2), my = lerp(ay, by, 0.2);
    trace(w, 0.42);
    D.lw(0.9); D.line(mx, my - amp - 30, mx, my - amp - 10);
    D.line(mx, my + amp + 10, mx, my + amp + 30);
    M.measure(mx, my - amp, mx, my + amp, { alpha: 0.45, tick: 5, arrows: false });
    read(w, '2A ' + Math.round(2 * amp), mx, my - amp - 44, 0.52, 12);
    read(w, 'f ' + (24 / TAU).toFixed(2) + ' Hz', lx - 530, ly + 386, 0.5, 14, 'left');
    var ox = lx - 530, oy = ly + 418;
    trace(w, 0.34);
    D.lw(0.9); D.line(ox, oy, ox + 300, oy);
    D.begin();
    for (var k = 0; k <= 120; k++) {
      var v = k / 120;
      var yy = oy - Math.sin(v * TAU * 5.5 + w.t * 24) * (10 + 14 * grow) * Math.sin(v * Math.PI);
      if (k === 0) D.move(ox + v * 300, yy); else D.to(ox + v * 300, yy);
    }
    D.stroke();
    M.lyric(cue, p, { y: 330, size: 48, fit: 1400, alpha: 0.9 });
  });

  /* ===================================================================
     abs.then — "Then I can". The hum dies, the thread loses its tension
     and sags. The frequency reading collapses to zero. */
  EM.Scenes('abs.then', function (w, p, cue) {
    var lx = w.lamp.x, ly = w.lamp.y;
    var die = E.outCubic(clamp((p - 0.02) / 0.30, 0, 1));
    var sag = 196 * E.inOutQuad(clamp((p - 0.08) / 0.74, 0, 1));
    var amp = 34 * (1 - die) * (0.55 + 0.45 * Math.sin(w.t * 2.1));
    var ax = lx - 470, ay = ly + 120, bx = lx - 30, by = ly + 166;
    function thread(a, s) {
      D.begin();
      for (var i = 0; i <= 48; i++) {
        var u = i / 48;
        var x = lerp(ax, bx, u), y0 = lerp(ay, by, u);
        var y = y0 + Math.sin(u * Math.PI) * (s + Math.sin(w.t * 26) * a)
          + Math.sin(u * Math.PI * 2) * a * 0.3 * Math.sin(w.t * 13);
        if (i === 0) D.move(x, y); else D.to(x, y);
      }
      D.stroke();
    }
    var z = 0.3;
    M.shadow(function () {
      D.lw(1.4); thread(amp, sag);
      D.lw(2); D.line(ax - 8, ay - 56, ax + 8, ay + 56); D.line(bx - 8, by - 56, bx + 8, by + 56);
    }, { z: z, blur: 2.8, alpha: 0.4 });
    edge(w, 0.72 - 0.16 * die);
    D.lw(2.0); thread(amp, sag);
    D.lw(1); D.line(ax - 8, ay - 56, ax + 8, ay + 56); D.line(bx - 8, by - 56, bx + 8, by + 56);
    var fa = clamp(1 - die * 1.5, 0, 1);
    read(w, 'f ' + (24 / TAU * (1 - die)).toFixed(2) + ' Hz', lx - 530, ly + 386, 0.16 + 0.34 * fa, 14, 'left');
    var mx = ax + 80, my = lerp(ay, by, 80 / (bx - ax));
    trace(w, 0.4);
    D.lw(0.9); D.line(mx, my, mx, my + 4 + sag);
    M.measure(mx, my, mx, my + sag, { alpha: 0.44, tick: 5, arrows: false });
    read(w, 'Δ ' + Math.round(sag), mx - 16, my + sag * 0.55, 0.5, 12, 'right');
    M.lyric(cue, p, { y: 306, size: 54, fit: 1400, alpha: 0.92 });
  });

  /* ===================================================================
     abs.complete — "…finally be completion". A circle closes perfectly,
     then its inside empties out: only the ring is left. */
  EM.Scenes('abs.complete', function (w, p, cue) {
    var lx = w.lamp.x, ly = w.lamp.y;
    var close = E.outCubic(clamp(p / 0.40, 0, 1));
    var hollow = E.inOutQuad(clamp((p - 0.46) / 0.30, 0, 1));
    var R = 150 + 24 * close;
    var ox = lx - 246, oy = ly + 200;
    var st = -Math.PI / 2 - 0.22, sw = TAU * close;
    var fillA = clamp(close * 3 - 2.2, 0, 1) * (1 - hollow);
    var z = 0.16, K = proj(w, z, ox, oy);
    var ctx = D.ctx();
    if (hollow > 0.02) M.pierce(K.x, K.y, R * K.k * 1.05, { alpha: 0.22 * hollow });
    M.shadow(function () {
      D.lw(2.2 - 0.9 * hollow);
      D.begin(); ctx.arc(ox, oy, R, st, st + sw); D.stroke();
      D.lw(1.9 - 1.1 * hollow);
      D.begin(); ctx.arc(ox, oy, R * 0.66, st + 0.4, st + 0.4 + sw * 0.9); D.stroke();
      D.lw(1.5 - 0.8 * hollow);
      D.begin(); ctx.arc(ox, oy, R * 0.33, st + 0.8, st + 0.8 + sw * 0.78); D.stroke();
    }, { z: z, blur: 3.0, alpha: 0.4 });
    /* the inside, while it is still full: a little lit paper, not a dark disc */
    if (fillA > 0.012) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var g = ctx.createRadialGradient(K.x, K.y, 0, K.x, K.y, R * K.k);
      g.addColorStop(0, rgba(w.pal.wallMid, 0.24 * fillA));
      g.addColorStop(0.8, rgba(w.pal.wallMid, 0.13 * fillA));
      g.addColorStop(1, rgba(w.pal.wallMid, 0));
      ctx.fillStyle = g;
      ctx.fillRect(K.x - R * K.k, K.y - R * K.k, R * K.k * 2, R * K.k * 2);
      ctx.restore();
    }
    /* edge light */
    edge(w, 0.66);
    D.lw(1.9);
    D.begin(); ctx.arc(ox, oy, R, st, st + sw); D.stroke();
    edge(w, 0.44, true);
    D.lw(1.1);
    D.begin(); ctx.arc(ox, oy, R * 0.66, st + 0.4, st + 0.4 + sw * 0.9); D.stroke();
    edge(w, 0.34);
    D.lw(0.9);
    D.begin(); ctx.arc(ox, oy, R * 0.33, st + 0.8, st + 0.8 + sw * 0.78); D.stroke();
    /* the sweep is measured off in cold cyan, tick by tick */
    trace(w, 0.42);
    D.lw(1);
    for (var k = 0; k < 12; k++) {
      var ang = st + k * TAU / 12;
      if (ang > st + sw + 0.004) continue;
      var r0 = R + 8, r1 = R + (k % 3 === 0 ? 27 : 16);
      D.line(ox + Math.cos(ang) * r0, oy + Math.sin(ang) * r0, ox + Math.cos(ang) * r1, oy + Math.sin(ang) * r1);
    }
    read(w, 'θ ' + Math.round(close * 360) + '°', ox, oy + R + 50, 0.4 * (1 - hollow) + 0.1, 13);
    M.lyric(cue, p, { y: 320, size: 50, fit: 1380, alpha: 0.9 });
  });

  /* ===================================================================
     abs.left1 — "Though you have left". A standing contour is punched
     through; light comes out of the hole.
     left1→left5 is one continuous emptying: full contour with a small hole,
     a wider hole, only the ring, a blurred afterimage, a point and dust. */
  EM.Scenes('abs.left1', function (w, p, cue) {
    var lx = w.lamp.x, ly = w.lamp.y;
    var z = 0.18;
    var fx = lx - 600, fy = ly + 34, sc = 244;
    var u = E.outCubic(clamp(p / 0.8, 0, 1));
    var hr = lerp(22, 62, u);
    var hc = [fx, fy - 60];
    var pts = fig(fx, fy, sc);
    var K = proj(w, z, hc[0], hc[1]);
    throughHole(w, K, hr * K.k, 1);
    M.shadow(function () {
      drawFig(pts, hc[0], hc[1], hr, 2.4);
      D.lw(1.7); D.circle(hc[0], hc[1], hr); D.stroke();
    }, { z: z, blur: 9, alpha: 0.2 });
    /* the body: a warm hairline contour with the hole cut out of it */
    edge(w, 0.72);
    drawFig(pts, hc[0], hc[1], hr, 1.7);
    edge(w, 0.85, true);
    D.lw(1.6); D.circle(hc[0], hc[1], hr); D.stroke();
    holeLip(w, K, hr * K.k, 0.18);
    read(w, 'h ' + Math.round(hr * 2), K.x - hr * K.k - 16, K.y - 22, 0.42, 12, 'right');
    M.lyric(cue, p, { y: 330, size: 50, fit: 1380, alpha: 0.92 });
  });

  /* ===================================================================
     abs.left2 — the hole opens wider, the contour thins. */
  EM.Scenes('abs.left2', function (w, p, cue) {
    var lx = w.lamp.x, ly = w.lamp.y;
    var z = 0.18;
    var fx = lx - 600, fy = ly + 34, sc = 244;
    var u = E.outCubic(clamp(p / 0.85, 0, 1));
    var hr = lerp(62, 118, u);
    var hc = [fx, fy - 56];
    var pts = fig(fx, fy, sc);
    var K = proj(w, z, hc[0], hc[1]);
    throughHole(w, K, hr * K.k, 1.1);
    M.shadow(function () {
      drawFig(pts, hc[0], hc[1], hr, 2.2);
      D.lw(1.4); D.circle(hc[0], hc[1], hr); D.stroke();
    }, { z: z, blur: 9.5, alpha: 0.18 });
    edge(w, 0.6);
    drawFig(pts, hc[0], hc[1], hr, 1.3);
    edge(w, 0.9, true);
    D.lw(1.7); D.circle(hc[0], hc[1], hr); D.stroke();
    holeLip(w, K, hr * K.k, 0.16);
    read(w, 'h ' + Math.round(hr * 2), K.x - hr * K.k - 16, K.y - 22, 0.42, 12, 'right');
    M.lyric(cue, p, { y: 330, size: 50, fit: 1380, alpha: 0.9 });
  });

  /* ===================================================================
     abs.left3 — only a single thread-thin ring is left; inside, nothing. */
  EM.Scenes('abs.left3', function (w, p, cue) {
    var lx = w.lamp.x, ly = w.lamp.y;
    var z = 0.18;
    var fx = lx - 600, fy = ly + 34;
    var u = E.outCubic(clamp(p / 0.85, 0, 1));
    var hc = [fx, fy - 56];
    var hr = lerp(118, 146, u);
    var K = proj(w, z, hc[0], hc[1]);
    var pts = fig(fx, fy, 244);
    throughHole(w, K, hr * K.k * 0.7, 0.6);
    /* the contour is gone; only three short dashes of it survive */
    edge(w, 0.2);
    D.lw(1.1);
    D.begin(); D.ctx().arc(fx, fy - 128, 54, -2.5, -1.9); D.stroke();
    D.begin(); D.ctx().arc(fx, fy + 36, 62, 2.7, 3.5); D.stroke();
    D.begin(); D.ctx().arc(fx, fy - 58, hr + 46, 0.85, 1.35); D.stroke();
    M.shadow(function () {
      D.lw(2);
      D.begin(); D.ctx().arc(fx, fy - 128, 54, -2.5, -1.9); D.stroke();
      D.begin(); D.ctx().arc(fx, fy + 36, 62, 2.7, 3.5); D.stroke();
      D.lw(3); D.circle(hc[0], hc[1], hr); D.stroke();
    }, { z: z, blur: 15, alpha: 0.1 });
    /* the single ring: the whole of what is left */
    edge(w, 0.92, true);
    D.lw(1.7); D.circle(hc[0], hc[1], hr); D.stroke();
    /* a second, thinner ring just inside it, half erased */
    edge(w, 0.34);
    D.lw(0.9);
    D.begin(); D.ctx().arc(hc[0], hc[1], hr * 0.8, 0.4, 2.3); D.stroke();
    D.begin(); D.ctx().arc(hc[0], hc[1], hr * 0.8, 3.6, 5.5); D.stroke();
    read(w, 'inside  0', hc[0], hc[1] + hr + 40, 0.44, 12);
    M.lyric(cue, p, { y: 330, size: 48, fit: 1360, alpha: 0.88 });
  });

  /* ===================================================================
     abs.left4 — the afterimage of that ring: fainter, blurred, drifting
     apart into three exposures. */
  EM.Scenes('abs.left4', function (w, p, cue) {
    var lx = w.lamp.x, ly = w.lamp.y;
    var z = 0.18;
    var fx = lx - 600, fy = ly + 34;
    var u = clamp(p, 0, 1);
    var hr = 142 + 9 * Math.sin(w.t * 1.1);
    var hc = [fx, fy - 56];
    var K = proj(w, z, hc[0], hc[1]);
    var pts = fig(fx, fy, 244);
    var ctx = D.ctx();
    M.pierce(K.x, K.y, Math.max(20, hr * K.k * 0.7), { alpha: 0.14 });
    for (var i = 0; i < 3; i++) {
      var ox = (i - 1) * (7 + 14 * u) + Math.sin(w.t * 0.7 + i) * 3;
      var oy = (i - 1) * (2 + 6 * u);
      var al = (i === 1 ? 0.5 : 0.26) * (1 - 0.35 * u);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.filter = 'blur(4px)';
      edge(w, al, i === 1); D.lw(1.5);
      D.circle(hc[0] + ox, hc[1] + oy, hr); D.stroke();
      ctx.restore();
      /* the ghost of the old contour */
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.filter = 'blur(4px)';
      edge(w, al * 0.5); D.lw(1.2);
      drawFig(pts.map(function (q) { return [q[0] + ox, q[1] + oy]; }), hc[0] + ox, hc[1] + oy, hr, 1.0);
      ctx.restore();
    }
    M.shadow(function () {
      D.lw(0.9); D.circle(hc[0], hc[1], hr); D.stroke();
    }, { z: z, blur: 12, alpha: 0.14 });
    M.lyric(cue, p, { y: 330, size: 46, fit: 1320, alpha: 0.8 });
  });

  /* ===================================================================
     abs.left5 — almost gone: one point and a string of dust. */
  EM.Scenes('abs.left5', function (w, p, cue) {
    var lx = w.lamp.x, ly = w.lamp.y;
    var z = 0.18;
    var fx = lx - 600, fy = ly + 34;
    var K = proj(w, z, fx, fy - 56);
    var br = 0.5 + 0.5 * Math.sin(w.t * 2.3);
    M.pierce(K.x, K.y, 14 + 9 * br, { alpha: 0.32 + 0.14 * br });
    /* the shadow of what is nearly nothing */
    M.shadow(function () {
      D.lw(1.2); D.circle(K.x - 6, K.y + 8, 5); D.fill();
    }, { z: 0.06, blur: 8, alpha: 0.25 });
    edge(w, 0.9, true);
    D.lw(1.3); D.circle(K.x, K.y, 4.8); D.stroke();
    D.fillStyle(w.pal.hot, 0.92); D.circle(K.x, K.y, 2.2); D.fill();
    /* the dust it is turning into, falling out of the shape */
    for (var i = 0; i < 44; i++) {
      var h1 = hash(i * 61 + 7), h2 = hash(i * 89 + 13), h3 = hash(i * 127 + 3);
      var yy = EM.wrap(h2 + w.t * (0.012 + h3 * 0.02), 1);
      var xx = K.x + (h1 - 0.5) * (28 + 92 * h3) + Math.sin(w.t * (0.7 + h3) + i) * 5;
      var py = K.y - 130 + yy * 310;
      var a = (0.34 + 0.44 * h3) * (1 - yy * 0.7) * (0.5 + 0.5 * Math.sin(w.t * 1.4 + i));
      if (a < 0.012) continue;
      D.fillStyle(w.pal.wallHi, a);
      D.circle(xx, py, 0.7 + h3 * 1.7); D.fill();
    }
    /* two broken bits of the old contour */
    edge(w, 0.26);
    D.lw(1.0);
    D.begin(); D.ctx().arc(fx - 26, fy - 50, 56, -1.15, -0.45); D.stroke();
    D.begin(); D.ctx().arc(fx + 22, fy + 14, 50, 2.4, 3.0); D.stroke();
    read(w, 'remaining  1', K.x - 24, K.y + 40, 0.4, 12, 'left');
    M.lyric(cue, p, { y: 330, size: 46, fit: 1320, alpha: 0.8 });
  });

  /* ===================================================================
     abs.iso — "…in isolation". The whole wall, the light a small point at
     the edge, and one point at the middle of everything. */
  EM.Scenes('abs.iso', function (w, p, cue) {
    var lx = w.lamp.x, ly = w.lamp.y;
    var u = E.outCubic(clamp(p / 0.5, 0, 1));
    var px = 0, py = 30;
    /* the space the apparatus used to fill: three very slow rings, and one
       ring still travelling outward. Edge light, because nothing else is left */
    M.shadow(function () {
      D.lw(6); D.circle(px, py, 400); D.stroke();
      D.lw(8); D.circle(px, py, 620); D.stroke();
    }, { z: 0.05, blur: 16, alpha: 0.14 });
    edge(w, 0.17 + 0.06 * u);
    D.lw(1.1); D.circle(px, py, 400); D.stroke();
    edge(w, 0.12 + 0.05 * u);
    D.lw(0.9); D.circle(px, py, 620); D.stroke();
    edge(w, 0.09 + 0.04 * u);
    D.lw(0.7); D.circle(px, py, 840); D.stroke();
    edge(w, 0.24 + 0.1 * u, true);
    D.lw(0.9); D.circle(px, py, 240 + 640 * EM.wrap(p * 1.3, 1)); D.stroke();
    /* the single point */
    M.pierce(px, py, 26, { alpha: 0.2 });
    edge(w, 0.95, true);
    D.lw(1.1); D.circle(px, py, 4.8); D.stroke();
    D.fillStyle(w.pal.hot, 0.9); D.circle(px, py, 2.2); D.fill();
    M.crosshair(px, py, 100, { alpha: 0.46, ticks: true, dot: 2, gap: 9 });
    /* the distance between the point and the light, measured once */
    M.measure(px + 26, py - 18, lx - 44, ly + 62, {
      label: Math.round(Math.hypot(lx - px, ly - py)), alpha: 0.44, tick: 6, labelSize: 12
    });
    M.pierce(lx, ly, 44, { alpha: 0.2 });
    motes(w, 16, 31, 0.13, 1.2);
    M.lyric(cue, p, { y: 366, size: 46, fit: 1300, alpha: 0.88 });
  });

  /* ===================================================================
     abs.if2 — "If I can" (again). In the dark it tries to make a new body:
     a small form assembles out of nothing. */
  EM.Scenes('abs.if2', function (w, p, cue) {
    var lx = w.lamp.x, ly = w.lamp.y;
    var u = E.outCubic(clamp((p - 0.04) / 0.72, 0, 1));
    var fx = lx - 566, fy = ly + 366;
    var z = 0.3;
    var K = proj(w, z, fx, fy);
    M.pierce(fx, fy + 6, 30 + 44 * u, { alpha: 0.16 + 0.22 * u });
    stain(w, K.x, K.y, 150, 110, 0.3);
    M.shadow(function () {
      var ctx = D.ctx();
      ctx.save(); ctx.translate(fx, fy); ctx.scale(0.3 + 0.7 * u, 0.3 + 0.7 * u);
      D.lw(2.2);
      M.grow({ x: 0, y: 54, len: 46, depth: 3, seed: 7, lw: 2.2 });
      D.lw(1.6); D.circle(0, 8, 13 + 6 * u); D.stroke();
      ctx.restore();
    }, { z: z, blur: 6, alpha: 0.3 });
    edge(w, 0.26 + 0.42 * u);
    var ctx = D.ctx();
    ctx.save(); ctx.translate(fx, fy); ctx.scale(0.3 + 0.7 * u, 0.3 + 0.7 * u);
    D.lw(1.7);
    M.grow({ x: 0, y: 54, len: 46, depth: 3, seed: 7, lw: 1.7 });
    edge(w, 0.45 + 0.3 * u, true);
    D.lw(1.3); D.circle(0, 8, 13 + 6 * u); D.stroke();
    ctx.restore();
    read(w, 'n = 1', fx + 42, fy - 34, 0.2 + 0.24 * u, 12, 'left');
    M.lyric(cue, p, { y: 330, size: 48, fit: 1360, alpha: 0.88 });
  });

  /* ===================================================================
     abs.erase — "…erase all the pointless fragments". One by one, on p,
     the fragments are rubbed out; each leaves a mark on the wall. */
  EM.Scenes('abs.erase', function (w, p, cue) {
    var lx = w.lamp.x, ly = w.lamp.y;
    var N = 11, z = 0.28;
    var FR = [], i, it;
    for (i = 0; i < N; i++) {
      var h1 = hash(i * 37 + 11), h2 = hash(i * 53 + 29), h3 = hash(i * 71 + 7);
      FR.push({
        x: lx - 430 + h1 * 380, y: ly + 40 + h2 * 300,
        r: 17 + h3 * 20, t0: 0.09 + i * 0.062, s: i * 13 + 5
      });
    }
    function shape(seed, r) {
      var n = 3 + (Math.floor(hash(seed * 3 + 1) * 3) % 3);
      var pts = [];
      for (var k = 0; k < n; k++) {
        var a = (k / n) * TAU + hash(seed + k * 17) * 0.8;
        var rr = r * (0.55 + hash(seed + k * 29) * 0.7);
        pts.push([Math.cos(a) * rr, Math.sin(a) * rr * (0.65 + hash(seed + k * 41) * 0.6)]);
      }
      return pts;
    }
    function fragPts(f, u) {
      var pts = shape(f.s, f.r), out = [];
      for (var k = 0; k < pts.length; k++) out.push([pts[k][0] * (1 - 0.3 * u), pts[k][1] * (1 - 0.9 * u)]);
      return out;
    }
    var live = [];
    for (i = 0; i < N; i++) live.push({ f: FR[i], u: clamp((p - FR[i].t0) / 0.14, 0, 1) });

    /* the shadows: only enough to give the chips weight */
    M.shadow(function () {
      var ctx = D.ctx();
      for (i = 0; i < N; i++) {
        it = live[i];
        if (it.u >= 1) continue;
        ctx.save();
        ctx.translate(it.f.x, it.f.y);
        ctx.rotate(it.u * 0.7 * hashs(it.f.s));
        D.lw(1.2); D.fillPoly(fragPts(it.f, it.u));
        ctx.restore();
      }
    }, { z: z, blur: 2.8, alpha: 0.32 });

    /* the chips themselves: bright little outlines */
    for (i = 0; i < N; i++) {
      it = live[i];
      if (it.u >= 1) continue;
      var al = 0.66 * (1 - it.u);
      if (al < 0.02) continue;
      var c2 = D.ctx();
      c2.save();
      c2.translate(it.f.x, it.f.y);
      c2.rotate(it.u * 0.7 * hashs(it.f.s));
      edge(w, al, (i % 3) === 0);
      D.lw(1.2);
      D.polyline(fragPts(it.f, it.u), true);
      c2.restore();
      read(w, 'f' + (i + 1), it.f.x + it.f.r + 10, it.f.y - it.f.r * 0.6, 0.44 * (1 - it.u), 11, 'left');
    }
    /* the marks they leave: a dark bite in the wall, its lip still warm */
    for (i = 0; i < N; i++) {
      it = live[i];
      if (it.u <= 0) continue;
      var K = proj(w, z, it.f.x, it.f.y);
      stain(w, K.x, K.y, it.f.r * K.k * 1.9, it.f.r * K.k * 1.5, clamp(it.u * 1.5, 0, 1) * 0.8, it.u * 0.4);
      edge(w, 0.3 * clamp(it.u * 1.6, 0, 1) * (1 - it.u * 0.45));
      D.lw(1.0);
      D.begin();
      D.ctx().arc(K.x, K.y, it.f.r * K.k * 1.5, 0.6, 1.9);
      D.stroke();
      D.begin();
      D.ctx().arc(K.x, K.y, it.f.r * K.k * 1.5, 3.4, 4.6);
      D.stroke();
      if (it.u < 0.96) {
        trace(w, 0.3 * it.u);
        D.lw(0.9);
        D.line(K.x - it.f.r * 0.8, K.y + it.f.r * 1.8, K.x + it.f.r * 0.8, K.y + it.f.r * 1.8);
      }
    }
    var rem = 0;
    for (i = 0; i < N; i++) if (live[i].u < 1) rem++;
    read(w, 'fragments  ' + rem + ' / ' + N, lx - 530, ly + 392, 0.44, 13, 'left');
    M.lyric(cue, p, { y: 330, size: 44, fit: 1240, alpha: 0.86 });
  });

  /* ===================================================================
     abs.maybe — "Then maybe". A pause. One fragment is left, with the marks
     of the others still on the wall. */
  EM.Scenes('abs.maybe', function (w, p, cue) {
    var lx = w.lamp.x, ly = w.lamp.y;
    var z = 0.28, i;
    var fx = lx - 268, fy = ly + 146 + Math.sin(w.t * 0.85) * 4;
    var rot = Math.sin(w.t * 0.6) * 0.09;
    var r = 46;
    for (i = 0; i < 9; i++) {
      var h1 = hash(i * 37 + 11), h2 = hash(i * 53 + 29);
      var bx = lx - 430 + h1 * 380, by = ly + 40 + h2 * 300;
      var K0 = proj(w, z, bx, by);
      stain(w, K0.x, K0.y, 30 + hash(i * 71) * 26, 26 + hash(i * 71) * 20, 0.5);
    }
    function shp(rr) {
      var pts = [];
      for (var k = 0; k < 5; k++) {
        var a = (k / 5) * TAU + 0.5;
        var q = rr * (0.6 + hash(9 + k * 29) * 0.6);
        pts.push([Math.cos(a) * q, Math.sin(a) * q * 0.85]);
      }
      return pts;
    }
    var K = proj(w, z, fx, fy);
    M.pierce(K.x, K.y, r * 0.6, { alpha: 0.18 });
    M.shadow(function () {
      var ctx = D.ctx();
      ctx.save(); ctx.translate(fx, fy); ctx.rotate(rot);
      D.lw(1.6); D.fillPoly(shp(r));
      ctx.restore();
    }, { z: z, blur: 3.0, alpha: 0.3 });
    edge(w, 0.8, true);
    D.lw(1.5);
    var ctx = D.ctx();
    ctx.save(); ctx.translate(fx, fy); ctx.rotate(rot);
    D.polyline(shp(r), true);
    ctx.restore();
    edge(w, 0.32);
    D.lw(0.9);
    ctx.save(); ctx.translate(fx, fy); ctx.rotate(rot + 0.3); ctx.scale(0.66, 0.66);
    D.polyline(shp(r), true);
    ctx.restore();
    read(w, 'f1', fx + r + 12, fy - r * 0.5, 0.5, 12, 'left');
    read(w, '1 / 12', lx - 530, ly + 392, 0.38, 13, 'left');
    M.lyric(cue, p, { y: 300, size: 54, fit: 1360, alpha: 0.92 });
  });

  /* ===================================================================
     abs.disheart — "…so disheartened". The last shadow folds inward until
     it is a point, and the rings of that collapse travel out. */
  EM.Scenes('abs.disheart', function (w, p, cue) {
    var lx = w.lamp.x, ly = w.lamp.y;
    var z = 0.28;
    var fx = lx - 268, fy = ly + 146;
    var u = E.inCubic(clamp(p / 0.62, 0, 1));
    var K = proj(w, z, fx, fy);
    var rx = lerp(150, 2.5, u), ry = lerp(104, 1.8, Math.pow(u, 1.35));
    var rot = -0.2 + u * 0.55;
    M.pierce(K.x, K.y, 26 + 24 * (1 - u), { alpha: 0.14 + 0.18 * (1 - u) });
    M.shadow(function () {
      var ctx = D.ctx();
      ctx.save(); ctx.translate(K.x, K.y); ctx.rotate(rot);
      D.lw(3); D.ellipse(0, 0, rx, ry, 0); D.stroke();
      ctx.restore();
    }, { z: 0, blur: lerp(5, 22, u), alpha: 0.32 - 0.1 * u });
    /* the edge of the last shadow, folding in */
    edge(w, 0.7 - 0.2 * u, u > 0.5);
    D.lw(1.7 - 0.8 * u);
    var ctx = D.ctx();
    ctx.save(); ctx.translate(K.x, K.y); ctx.rotate(rot);
    D.ellipse(0, 0, rx, ry, 0); D.stroke();
    ctx.restore();
    /* the collapse keeps ringing outward, thin and cold */
    for (var i = 0; i < 3; i++) {
      var q = EM.wrap(p * 1.25 + i * 0.25, 1);
      var rr = 24 + 250 * E.outCubic(q);
      trace(w, (1 - q) * 0.4 * (0.4 + 0.6 * u));
      D.lw(1); D.circle(K.x, K.y, rr); D.stroke();
    }
    D.fillStyle(w.pal.hot, 0.92);
    D.circle(K.x, K.y, 4.4 * (1 - 0.2 * u)); D.fill();
    read(w, 'r → 0', K.x + 28, K.y - 28, 0.42 * u, 12, 'left');
    M.lyric(cue, p, { y: 330, size: 54, fit: 1440, alpha: 0.94 });
  });

  /* ===================================================================
     abs.challenge — "Challenging your God". A huge shadow stands up from
     below the frame and leans against the lower edge of the light. Its
     silhouette is soft weight; its ridge is a hard warm line. */
  EM.Scenes('abs.challenge', function (w, p, cue) {
    var lx = w.lamp.x, ly = w.lamp.y;
    var rise = E.outCubic(clamp(p / 0.52, 0, 1));
    var press = E.inOutQuad(clamp((p - 0.42) / 0.58, 0, 1));
    var top = lerp(600, ly + 170, rise);
    var n = 32, ridge = [], i;
    for (i = 0; i <= n; i++) {
      var u = i / n, x = lerp(-1050, 1050, u);
      var y = top + Math.sin(u * 8.4 + 1.1) * 26 + (hash(i * 31 + 5) - 0.5) * 54 * (0.5 + press);
      ridge.push([x, y]);
    }
    var tipY = lerp(top - 30, ly + 34, press);
    /* the mass: a soft dark weight, no hard edge except the ridge */
    var ctx = D.ctx();
    ctx.save();
    D.begin();
    D.move(ridge[0][0], ridge[0][1]);
    for (var k = 1; k <= n; k++) D.to(ridge[k][0], ridge[k][1]);
    D.to(1050, 680); D.to(-1050, 680); D.close();
    ctx.clip();
    stain(w, -620, top + 340, 460, 320, 0.3 * (0.5 + 0.5 * rise));
    stain(w, -90, top + 300, 460, 300, 0.3 * (0.5 + 0.5 * rise));
    stain(w, 470, top + 330, 460, 320, 0.3 * (0.5 + 0.5 * rise));
    ctx.restore();
    /* the mass as a projection, very soft */
    M.shadow(function () {
      var c2 = D.ctx();
      D.begin();
      D.move(ridge[0][0], ridge[0][1]);
      for (var k2 = 1; k2 <= n; k2++) D.to(ridge[k2][0], ridge[k2][1]);
      D.to(1050, 680); D.to(-1050, 680); D.close();
      D.fill();
      /* two spikes, filled dark, tips reaching for the light */
      c2.beginPath();
      c2.moveTo(lx - 340, top + 10); c2.lineTo(lx - 200, tipY); c2.lineTo(lx - 150, top + 40); c2.closePath(); c2.fill();
      c2.beginPath();
      c2.moveTo(lx - 40, top + 30); c2.lineTo(lx + 110, tipY + 80); c2.lineTo(lx + 150, top + 60); c2.closePath(); c2.fill();
    }, { z: 0.08, blur: 9, alpha: 0.2 });
    /* the ridge: a hard warm hairline that catches the light */
    edge(w, 0.76 + 0.14 * press);
    D.lw(1.6);
    D.begin();
    D.move(ridge[0][0], ridge[0][1]);
    for (i = 1; i <= n; i++) D.to(ridge[i][0], ridge[i][1]);
    D.stroke();
    /* light bleeding under the edge: the mass gets a body, not just a line */
    for (var e = 1; e <= 3; e++) {
      edge(w, 0.16 / e);
      D.lw(2.6 + e * 1.6);
      D.begin();
      D.move(ridge[0][0], ridge[0][1] + 8 * e);
      for (i = 1; i <= n; i++) D.to(ridge[i][0], ridge[i][1] + 8 * e);
      D.stroke();
    }
    /* the spikes, edge-lit */
    edge(w, 0.7 + 0.2 * press, true);
    D.lw(1.6);
    D.begin();
    D.move(lx - 340, top + 14); D.to(lx - 200, tipY); D.to(lx - 150, top + 44);
    D.stroke();
    D.begin();
    D.move(lx - 40, top + 34); D.to(lx + 110, tipY + 70); D.to(lx + 150, top + 64);
    D.stroke();
    /* what falls off it */
    for (var m = 0; m < 20; m++) {
      var hu = hash(m * 53 + 9), hd = hash(m * 97 + 3);
      var rx = lerp(-980, 980, hu);
      var ry = top + Math.sin((rx + 1050) / 2100 * 8.4 + 1.1) * 26;
      var fl = EM.wrap(hd + w.t * (0.06 + hd * 0.1), 1);
      var px = rx + Math.sin(w.t * 0.9 + m) * 8;
      D.fillStyle(w.pal.glow, 0.55 * (1 - fl) * (0.3 + rise * 0.7));
      D.circle(px, ry + fl * 280, 1 + hd * 2.0); D.fill();
    }
    motes(w, 10, 71, 0.1, 1.1);
    M.lyric(cue, p, { y: 340, size: 54, fit: 1440, alpha: 0.94 });
  });

  /* ===================================================================
     abs.illegal — "…illegal arguments". The projection breaks: rows slip,
     fragments detach, the wall cracks open. Order comes apart for a moment. */
  EM.Scenes('abs.illegal', function (w, p, cue) {
    var lx = w.lamp.x, ly = w.lamp.y;
    var g = L.glitch(p, 0.8, 4);
    var brk = clamp(0.45 + 0.55 * (1 - g), 0, 1);
    var jt = Math.floor(w.t * 9) * 7;
    var jx = (hash(jt + 3) - 0.5) * 110 * brk;
    var jy = (hash(jt + 11) - 0.5) * 34 * brk;
    var z = 0.24;
    var x0 = lx - 520, y0 = ly - 96, step = 84, rows = 6, cols = 10;

    /* the wall cracks open: light comes out of the fissures */
    edge(w, 0.36 + 0.1 * brk, true);
    D.lw(1.3);
    M.shard({ n: 24, cx: lx - 300, cy: ly + 30, r0: 18, r1: 430, seed: 11, lw: 1.3 });
    D.lw(0.9);
    M.shard({ n: 12, cx: lx + 40, cy: ly + 20, r0: 14, r1: 250, seed: 23, lw: 0.9 });
    /* two fissures that actually read as cracks */
    D.lw(1.9);
    D.begin();
    D.move(lx - 300, ly + 30);
    D.to(lx - 380, ly - 40); D.to(lx - 350, ly - 120); D.to(lx - 430, ly - 190);
    D.stroke();
    D.begin();
    D.move(lx - 300, ly + 30);
    D.to(lx - 180, ly + 90); D.to(lx - 210, ly + 180); D.to(lx - 120, ly + 250);
    D.stroke();

    /* a lattice whose rows have slipped out of register: edge light */
    for (var r = 0; r < rows; r++) {
      var dyr = r * step + (hash(r * 17 + 3) - 0.5) * 44 * brk + (r % 3 === 1 ? 32 * brk : 0);
      var oL = (hash(r * 13 + 7) - 0.5) * 96 * brk, oR = (hash(r * 29 + 5) - 0.5) * 96 * brk;
      edge(w, 0.34 + 0.1 * (r % 2));
      D.lw(1.15);
      D.line(x0 + oL, y0 + dyr, x0 + (cols - 1) * step + oR, y0 + dyr);
    }
    for (var c = 0; c < cols; c++) {
      edge(w, 0.24);
      D.lw(0.8);
      var yy0 = y0 + (hash(c * 19 + 5) - 0.5) * 50 * brk, yy1 = y0 + (rows - 1) * step;
      D.line(x0 + c * step + (hash(c * 23 + 7) - 0.5) * 40 * brk, yy0, x0 + c * step + (hash(c * 41 + 9) - 0.5) * 40 * brk, yy1);
    }
    for (r = 0; r < rows; r++) {
      for (c = 0; c < cols; c++) {
        edge(w, 0.55, (r + c) % 3 === 0);
        D.lw(1.0);
        D.circle(x0 + c * step + (hash(r * 31 + c * 7) - 0.5) * 30 * brk, y0 + r * step, 2.2 + hash(r * 41 + c * 11) * 1.8);
        D.fill();
      }
    }
    /* the read-out grid, offset from the truth */
    trace(w, 0.28 + 0.14 * brk);
    var ctx = D.ctx();
    ctx.save(); ctx.translate(jx, jy);
    D.lw(0.8);
    for (var r2 = 0; r2 < rows; r2++) {
      D.begin();
      for (var c2 = 0; c2 < cols; c2++) {
        var xx = x0 + c2 * step, yy = y0 + r2 * step;
        if (c2 === 0) D.move(xx, yy); else D.to(xx, yy);
      }
      D.stroke();
    }
    for (var c3 = 0; c3 < cols; c3++) {
      D.begin();
      for (var r3 = 0; r3 < rows; r3++) D.to(x0 + c3 * step, y0 + r3 * step);
      D.stroke();
    }
    ctx.restore();
    /* a few pieces that came off the grid and are floating */
    for (var i = 0; i < 7; i++) {
      var h1 = hash(i * 61 + 3), h2 = hash(i * 89 + 7), h3 = hash(i * 127 + 5);
      var fx = lx - 600 + h1 * 700 + Math.sin(w.t * (0.5 + h3) + i) * 16 * brk;
      var fy = ly - 260 + h2 * 560;
      var s = 11 + h3 * 20;
      var rot = w.t * (0.2 + h3 * 0.6) + i;
      var c4 = D.ctx();
      c4.save(); c4.translate(fx, fy); c4.rotate(rot);
      edge(w, 0.6, i % 2 === 0);
      D.lw(1.1); D.rect(-s / 2, -s / 2, s, s * (0.5 + h1)); D.stroke();
      c4.restore();
    }
    /* slip bands where the picture falls out of itself */
    if (brk > 0.6) {
      var ctx6 = D.ctx();
      ctx6.save();
      for (var b = 0; b < 3; b++) {
        var by = ly - 140 + b * 200 + hash(b * 31 + 9) * 70;
        var bh = 12 + hash(b * 17 + 5) * 34;
        ctx6.fillStyle = rgba(w.pal.shadow, 0.4 * (brk - 0.6) / 0.4);
        ctx6.fillRect(-W / 2 + jx * (1 + b), by, W, bh);
      }
      ctx6.restore();
    }
    read(w, 'ERR  illegal argument', lx - 640, ly + 416, 0.52 + 0.12 * brk, 14, 'left');
    read(w, 'argument ' + (1 + Math.floor(hash(jt) * 3)) + ' of 0', lx - 640, ly + 442, 0.32 * brk + 0.1, 12, 'left');
    M.lyric(cue, p, { y: 330, size: 46, fit: 1300, alpha: 0.9, rot: -0.012 * brk });
  });

  /* ===================================================================
     abs.stack — "(the argument stack)", 16.3s. It builds itself one layer
     per real onset, leans, cracks, and comes down. Every layer is edge light
     so the tower stays readable for the whole 16 seconds; a slow drift of
     light and dust keeps the wall alive underneath it. */
  EM.Scenes('abs.stack', function (w, p, cue) {
    var lx = w.lamp.x, ly = w.lamp.y;
    var DUR = cue.dur > 6 ? cue.dur : 16.33;
    var t0 = cue.t;
    var build = E.outCubic(clamp(p / 0.45, 0, 1));
    var lean = E.inOutQuad(clamp((p - 0.45) / 0.27, 0, 1));
    var crack = clamp((p - 0.72) / 0.16, 0, 1);
    var fall = clamp((p - 0.88) / 0.12, 0, 1);
    var n = 14, lh = 26, gap = 16;
    var baseX = lx - 420, baseY = ly + 540;
    var ctx = D.ctx();

    /* ---- background: the light and the dust this tower stands in ---- */
    var bgx = lx + Math.sin(w.t * 0.11) * 300 - 240;
    var bgy = ly + 320 + Math.cos(w.t * 0.07) * 110;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var bg = ctx.createRadialGradient(bgx, bgy, 0, bgx, bgy, 820);
    bg.addColorStop(0, rgba(w.pal.glow, 0.06 + 0.03 * build));
    bg.addColorStop(1, rgba(w.pal.glow, 0));
    ctx.fillStyle = bg; ctx.fillRect(-W / 2, -H / 2, W, H);
    ctx.restore();
    motes(w, 70, 101, 0.2 + 0.08 * build, 1.15);

    /* ---- the tower: layers land on the analysed onsets ---- */
    var ON = EM.onsetsBetween(t0, t0 + DUR * 0.45);
    function landP(i) {
      if (ON.length >= 3) {
        var idx = Math.round(i * (ON.length - 1) / (n - 1));
        return clamp((ON[idx][0] / 1000 - t0) / DUR, 0.012, 0.445);
      }
      return 0.02 + i * (0.42 / n);
    }
    var z = 0.14 + 0.2 * lean + 0.08 * crack;
    var tilt = -0.06 * lean + 0.018 * Math.sin(w.t * 2.3) * crack;
    var cs = Math.cos(tilt), sn = Math.sin(tilt);
    var beat = EM.onsetPulse(w.t, 0.3);
    var lay = [], i;
    for (i = 0; i < n; i++) {
      var lp = landP(i);
      var u = clamp((p - lp) / 0.05, 0, 1);
      if (i === 0 && u <= 0) u = 0.0001;
      var bx0 = baseX - i * 9 * lean + (hash(i * 31 + 2) - 0.5) * 34 * crack;
      var by0 = baseY - i * (lh + gap) - (1 - E.outBounce(u)) * 170;
      var dx = bx0 - baseX, dy = by0 - baseY;
      var rx = baseX + dx * cs - dy * sn;
      var ry = baseY + dx * sn + dy * cs;
      var fi = (i === 0) ? 0 : clamp((fall - (n - 1 - i) / (n - 1) * 0.52) / 0.42, 0, 1);
      if (fi > 0) {
        ry += E.inQuad(fi) * 1300;
        rx += fi * 170 * hashs(i * 7 + 2);
      }
      var al = (1 - clamp(fi * 1.2, 0, 1)) * clamp(u * 3, 0, 1);
      if (al <= 0.02) continue;
      lay.push({
        i: i, x: rx, y: ry, w: 330 - i * 7 + (crack > 0 ? (hash(i * 13 + 1) - 0.5) * 22 * crack : 0),
        rot: tilt + fi * 1.2 * hashs(i * 13 + 5), a: al, land: u
      });
    }

    /* the tower as a projection: one very soft shadow, weight only */
    M.shadow(function () {
      var c2 = D.ctx();
      for (var k = 0; k < lay.length; k++) {
        var s = lay[k];
        c2.save(); c2.translate(s.x, s.y); c2.rotate(s.rot);
        D.lw(2.6); D.rect(-s.w / 2, -lh / 2, s.w, lh); D.stroke();
        c2.restore();
      }
    }, { z: z, blur: 11, alpha: 0.12 });

    /* ---- the edges: every layer is a warm hairline, flashing on the beat ---- */
    for (var k2 = 0; k2 < lay.length; k2++) {
      var s2 = lay[k2];
      var aa = (0.4 + 0.3 * s2.land * (0.4 + 0.6 * beat)) * s2.a;
      if (aa < 0.02) continue;
      edge(w, aa * 0.9, (s2.i % 3) === 0);
      D.lw(1.3);
      var c3 = D.ctx();
      c3.save(); c3.translate(s2.x, s2.y); c3.rotate(s2.rot);
      D.rect(-s2.w / 2, -lh / 2, s2.w, lh); D.stroke();
      /* a whisper of face so the slabs are plates and not wire */
      D.fillStyle(w.pal.glow, aa * 0.055);
      D.rect(-s2.w / 2, -lh / 2, s2.w, lh); D.fill();
      /* the little vertical ticks of the slab */
      edge(w, aa * 0.5);
      D.lw(0.8);
      for (var m = 1; m < 6; m++) {
        var txx = -s2.w / 2 + s2.w * m / 6;
        D.line(txx, -lh / 2 + 4, txx, lh / 2 - 4);
      }
      c3.restore();
    }
    /* the two side rails that make it one structure and not a pile */
    if (lay.length) {
      var hh = lay.length * (lh + gap) - gap;
      edge(w, 0.44);
      D.lw(1.2);
      D.line(baseX - 132, baseY - 10, baseX - 132 + hh * sn, baseY - 10 - hh * cs);
      D.line(baseX + 132, baseY - 10, baseX + 132 + hh * sn, baseY - 10 - hh * cs);
      /* the antenna at the top: still building */
      edge(w, 0.6, true);
      D.lw(1.1);
      D.line(baseX + 90 + hh * sn, baseY - 16 - hh * cs, baseX + 90 + hh * sn, baseY - 70 - hh * cs);
      D.circle(baseX + 90 + hh * sn, baseY - 74 - hh * cs, 3.4); D.fill();
    }
    /* the pedestal it is stacked on */
    edge(w, 0.4);
    M.stack({ n: 3, w: 360, h: 104, cx: baseX, cy: baseY + 32, dx: 10, dy: -9, shrink: 0.14, lw: 1.2 });
    /* cracks through the stack: light in the fissures */
    if (crack > 0.04) {
      edge(w, 0.4 * crack, true);
      D.lw(1.1);
      for (var q = 0; q < 8; q++) {
        var hq = hash(q * 47 + 5);
        var y0 = baseY - (0.1 + hq * 0.85) * n * (lh + gap);
        var x0 = baseX - 170 + hash(q * 71 + 3) * 340;
        D.line(x0, y0, x0 + (hash(q * 91 + 7) - 0.5) * 100 * crack, y0 + 24 + hash(q * 11) * 60 * crack);
        D.line(x0, y0, x0 - (hash(q * 13 + 9) - 0.5) * 80 * crack, y0 - 18 - hash(q * 17) * 44 * crack);
      }
    }
    /* the stretch of the light while the tower grows */
    if (build > 0.02) {
      var ctx7 = D.ctx();
      ctx7.save();
      ctx7.globalCompositeOperation = 'lighter';
      ctx7.translate(lx, ly - 40);
      ctx7.scale(1, 2.4 + 1.6 * build);
      var sg = ctx7.createRadialGradient(0, 0, 0, 0, 0, 60 + 90 * build);
      sg.addColorStop(0, rgba(w.pal.hot, 0.13 * build));
      sg.addColorStop(0.45, rgba(w.pal.glow, 0.06 * build));
      sg.addColorStop(1, rgba(w.pal.glow, 0));
      ctx7.fillStyle = sg;
      ctx7.fillRect(-320, -300, 640, 600);
      ctx7.restore();
    }
    /* the depth scale, counted by the machine */
    trace(w, 0.36);
    D.lw(0.9);
    D.line(baseX - 250, baseY + 30, baseX - 250, baseY + 30 - lay.length * (lh + gap));
    for (var q2 = 0; q2 <= lay.length; q2++) {
      var ty = baseY + 30 - q2 * (lh + gap);
      D.line(baseX - 250, ty, baseX - 250 + (q2 % 5 === 0 ? 18 : 9), ty);
    }
    read(w, 'n ' + EM.beatAt(w.t), lx - 700, ly + 420, 0.42, 13, 'left');
    read(w, 'stack ' + lay.length + ' / ' + n, lx - 700, ly + 444, 0.36, 12, 'left');

    /* what is left after it comes down: the bottom layer, one cut thread */
    if (fall > 0.02) {
      edge(w, 0.34 * fall);
      D.lw(1.1);
      D.begin();
      D.move(baseX - 70, baseY - 430 + 140 * fall);
      D.to(baseX - 60, baseY - 240 + 30 * fall);
      D.to(baseX - 44, baseY - 130);
      D.stroke();
      D.begin();
      D.move(baseX + 46, baseY - 200);
      D.to(baseX + 34, baseY - 110 + 50 * fall);
      D.stroke();
      M.pierce(baseX - 70, baseY - 430 + 140 * fall, 22, { alpha: 0.26 * fall });
    }
    M.lyric(cue, p, { y: 330, size: 44, fit: 1180, alpha: 0.82 });
  });
})(window.EM);
