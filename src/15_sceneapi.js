/* 15_sceneapi.js — plate registry + hand-off protocol + failure reporting. */
(function (EM) {
  'use strict';
  var clamp = EM.clamp, E = EM.E;

  var REG = Object.create(null), ORDER = [];
  function S(id, effects) {
    if (REG[id]) throw new Error('duplicate plate id: ' + id);
    var list = (typeof effects === 'function') ? [{ l: 0, e: effects }] : [].slice.call(effects);
    for (var i = 0; i < list.length; i++) {
      if (typeof list[i] === 'function') list[i] = { l: i * 10, e: list[i] };
      if (list[i].l == null) list[i].l = i * 10;
    }
    list.sort(function (a, b) { return a.l - b.l; });
    REG[id] = list; ORDER.push(id); return list;
  }

  function vis(p, a) {
    a = a == null ? 0.16 : a;
    if (p < 0) return 0;
    if (p < a) return E.outCubic(p / a);
    if (p > 1 - a * 0.8) return E.outCubic(clamp((1 - p) / (a * 0.8), 0, 1));
    return 1;
  }
  function ramp(cue) {
    if (!cue || !cue.dur) return 0.2;
    if (cue.dur < 0.8) return 0.42;
    if (cue.dur < 1.2) return 0.34;
    if (cue.dur < 2.6) return 0.26;
    if (cue.dur < 6) return 0.22;
    if (cue.dur < 14) return 0.16;
    return 0.10;
  }
  function stagger(p, k, n, span) {
    span = span == null ? 0.5 : span;
    var st = n > 1 ? (k / (n - 1)) * span : 0;
    return clamp((p - st) / (1 - span), 0, 1);
  }
  function between(p, from, to, fade) {
    fade = fade == null ? 0.06 : fade;
    if (p <= from || p >= to) return 0;
    return Math.min(clamp((p - from) / fade, 0, 1), clamp((to - p) / fade, 0, 1));
  }
  function glitch(p, amount, seed) {
    var v = 1;
    for (var i = 0; i < 3; i++) {
      var c = EM.hash(((seed || 0) * 977 + i * 131) | 0);
      var wdt = 0.02 + c * 0.05, d = Math.abs(p - c);
      if (d < wdt) v = Math.min(v, 1 - (amount || 0.6) * (1 - d / wdt));
    }
    return v;
  }

  var TAIL = 0.55;
  function tailAt(cue, t) {
    if (!cue || cue.i <= 0) return 0;
    var dt = t - cue.t;
    if (dt < 0) return 0;
    var q = clamp(dt / TAIL, 0, 1);
    if (q >= 1) return 0;
    return Math.pow(1 - q, 1.6) * 0.85;
  }
  function morphAt(cue, t) {
    if (!cue || cue.i <= 0 || cue.bleed === false) return 0;
    var dt = t - cue.t;
    if (dt < 0 || dt >= TAIL) return 0;
    return E.inOutQuad(1 - dt / TAIL);
  }

  EM.Life = { vis: vis, ramp: ramp, stagger: stagger, between: between, glitch: glitch, tail: tailAt, morph: morphAt, TAIL: TAIL };

  var faults = Object.create(null), faultCount = 0, faultSeq = [];
  function report(id, err) {
    var msg = (err && err.message) ? err.message : String(err);
    if (faults[id] === msg) return;
    faults[id] = msg; faultCount++; faultSeq.push({ id: id, message: msg });
    if (faultCount <= 14) console.error('[mv] plate "' + id + '" failed: ' + msg);
    if (EM.onFault) { try { EM.onFault(id, msg); } catch (e) {} }
  }

  function exec(list, w, p, t, cue, gain) {
    var ctx = EM.D.ctx();
    for (var i = 0; i < list.length; i++) {
      ctx.save();
      try {
        if (gain < 0.999) ctx.globalAlpha = gain;
        list[i].e(w, p, cue);
      } catch (err) { report(cue.scene, err); }
      ctx.restore();
      ctx.globalAlpha = 1; ctx.shadowBlur = 0;
      ctx.setLineDash([]); ctx.lineDashOffset = 0;
      ctx.filter = 'none'; ctx.globalCompositeOperation = 'source-over';
      ctx.lineWidth = 1.2;
    }
  }

  function draw(id, w, t, cue) {
    var list = REG[id];
    if (!list) return false;
    var p = cue.dur > 0 ? clamp((t - cue.t) / cue.dur, 0, 1) : 0;
    exec(list, w, p, t, cue, 1);
    return true;
  }

  /* ============================================================ transitions
     Every cue boundary is a transition, not a cut. The outgoing and incoming
     plates are rendered to two half-resolution buffers and composited by one
     of ten deterministic effects; duration and effect depend on the act, on
     the tempo of the incoming shot and on whether the act changes. The void /
     dust / title / post layers stay outside, so the frame never blinks — only
     the plate layer changes. Style comes from cue.i, motion only from t. */

  var XW = 960, XH = 540;
  var xf = { a: null, b: null, m: null, ca: null, cb: null, cm: null };
  function xbufs() {
    if (xf.a) return;
    xf.a = document.createElement('canvas'); xf.a.width = XW; xf.a.height = XH;
    xf.b = document.createElement('canvas'); xf.b.width = XW; xf.b.height = XH;
    xf.m = document.createElement('canvas'); xf.m.width = XW; xf.m.height = XH;
    xf.ca = xf.a.getContext('2d'); xf.cb = xf.b.getContext('2d'); xf.cm = xf.m.getContext('2d');
  }
  function stageCtx(c) {
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
    c.filter = 'none';
    c.shadowBlur = 0;
    c.clearRect(0, 0, XW, XH);
    c.setTransform(XW / 1920, 0, 0, XH / 1080, 0, 0);
    c.translate(960, 540);            /* stage origin at buffer centre */
  }
  function renderTo(c, cue, w, t, p) {
    stageCtx(c);
    EM.D.bind(c, 1920, 1080);
    var list = REG[cue.scene];
    if (list) exec(list, w, p, t, cue, 1);
    if (EM.Objects) EM.Objects.draw(cue, w, t, p);
    c.setTransform(1, 0, 0, 1, 0, 0);
  }
  function place(ctx, src, alpha, dx, dy) {
    if (alpha <= 0.002) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.drawImage(src, -960 + (dx || 0), -540 + (dy || 0), 1920, 1080);
    ctx.restore();
  }
  function actKey(scene) { return String(scene || '').split('.')[0]; }

  function fxFade(ctx, A, B, u) { place(ctx, A, 1 - u, 0, 0); place(ctx, B, u, 0, 0); }

  /* draw only a sub-rect of a half-res buffer, in stage coordinates.
     (drawing the whole buffer into a clipped tile costs 84x the pixels) */
  function sub(ctx, src, x, y, w, h, alpha) {
    if (alpha <= 0.002 || w <= 0 || h <= 0) return;
    var sx = (x + 960) * (XW / 1920), sy = (y + 540) * (XH / 1080);
    var sw = w * (XW / 1920), sh = h * (XH / 1080);
    ctx.save();
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.drawImage(src, sx, sy, sw, sh, x, y, w, h);
    ctx.restore();
  }

  function fxSlices(ctx, A, B, u) {
    var n = 18, h = 1080 / n, i;
    for (i = 0; i < n; i++) {
      var thr = EM.hash(i * 31 + 7);
      var e = E.outCubic(clamp((u * 1.25 - thr * 0.35) / 0.6, 0, 1));
      var y = -540 + i * h;
      sub(ctx, A, -960, y, 1920, h + 1, 1 - u);
      if (e > 0.002) {
        var slide = (1 - e) * (EM.hash(i * 57 + 11) - 0.5) * 90;
        sub(ctx, B, -960 + slide, y, 1920, h + 1, e);
      }
    }
  }

  function fxTiles(ctx, A, B, u) {
    var cols = 12, rows = 7, tw = 1920 / cols, th = 1080 / rows, r, c;
    for (r = 0; r < rows; r++) {
      for (c = 0; c < cols; c++) {
        var thr = EM.hash((r * cols + c) * 97 + 13);
        var e = E.outCubic(clamp((u * 1.3 - thr * 0.45) / 0.55, 0, 1));
        var x = -960 + c * tw, y = -540 + r * th;
        sub(ctx, A, x, y, tw + 1, th + 1, 1 - u);
        sub(ctx, B, x, y, tw + 1, th + 1, e);
      }
    }
  }

  function fxWipe(ctx, A, B, u, o) {
    var dir = o && o.dir != null ? o.dir : 0;       /* 0 L→R, 1 R→L, 2 T→B, 3 B→T */
    place(ctx, A, 1 - u, 0, 0);
    var wdt = 1920, hgt = 1080;
    ctx.save();
    ctx.beginPath();
    if (dir === 2) ctx.rect(-960, -540, wdt, hgt * u);
    else if (dir === 3) ctx.rect(-960, 540 - hgt * u, wdt, hgt * u);
    else if (dir === 1) ctx.rect(960 - wdt * u, -540, wdt * u, hgt);
    else ctx.rect(-960, -540, wdt * u, hgt);
    ctx.clip();
    place(ctx, B, 1, 0, 0);
    ctx.restore();
    /* the leading edge: one bright scan line */
    var ea = Math.sin(Math.PI * u) * 0.55;
    if (ea > 0.01) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = EM.rgba(EM.cur && EM.cur.pal ? EM.cur.pal.hot : [200, 255, 220], ea);
      if (dir === 2) ctx.fillRect(-960, -540 + hgt * u - 1.5, wdt, 3);
      else if (dir === 3) ctx.fillRect(-960, 540 - hgt * u - 1.5, wdt, 3);
      else if (dir === 1) ctx.fillRect(960 - wdt * u - 1.5, -540, 3, hgt);
      else ctx.fillRect(-960 + wdt * u - 1.5, -540, 3, hgt);
      ctx.restore();
    }
  }

  function fxBars(ctx, A, B, u) {
    var n = 14, w = 1920 / n, i;
    for (i = 0; i < n; i++) {
      var thr = EM.hash(i * 17 + 5);
      var e = E.outCubic(clamp((u * 1.2 - thr * 0.3) / 0.7, 0, 1));
      var dir = (i % 2) ? 1 : -1;
      var oy = dir * (1 - e) * 1080;
      sub(ctx, A, -960 + i * w, -540 + oy, w + 1, 1080, 1 - u);
      sub(ctx, B, -960 + i * w, -540, w + 1, 1080, e);
    }
  }

  function fxZoom(ctx, A, B, u) {
    ctx.save(); ctx.globalAlpha = Math.pow(1 - u, 1.15); ctx.scale(1 + 0.20 * u, 1 + 0.20 * u);
    ctx.drawImage(A, -960, -540, 1920, 1080); ctx.restore();
    ctx.save(); var s = 1.16 - 0.16 * u; ctx.globalAlpha = u; ctx.scale(s, s);
    ctx.drawImage(B, -960, -540, 1920, 1080); ctx.restore();
    if (u > 0.01 && u < 0.6) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.12 * (1 - u / 0.6);
      ctx.fillStyle = 'rgba(170,255,205,1)'; ctx.fillRect(-960, -540, 1920, 1080);
      ctx.restore();
    }
  }

  function fxRgb(ctx, A, B, u) {
    place(ctx, B, u, 0, 0);
    var a = 1 - u;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    place(ctx, A, 0.26 * a, -12 * u, 0);
    place(ctx, A, 0.16 * a, 16 * u, 0);
    ctx.restore();
    place(ctx, A, a * 0.9, 0, 0);
    /* a couple of torn bands */
    var bands = 5, i;
    for (i = 0; i < bands; i++) {
      var y = -540 + (EM.hash(i * 41 + 3) * 1080);
      var hh = 8 + EM.hash(i * 53 + 7) * 30;
      ctx.save();
      ctx.beginPath(); ctx.rect(-960, y, 1920, hh); ctx.clip();
      place(ctx, A, a, (EM.hash(i * 67 + 5) - 0.5) * 90, 0);
      ctx.restore();
    }
  }

  var XGLYPHS = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎ0123456789∑∫∂∇λπ∞';
  function fxGlyph(ctx, A, B, u) {
    place(ctx, A, 1 - u, 0, 0);
    place(ctx, B, u, 0, 0);
    var cols = 18, cw = 1920 / cols, c, k;
    var a0 = Math.sin(Math.PI * u);
    if (a0 <= 0.01) return;
    /* a dark wash first, so the falling glyphs have something to cut against */
    ctx.save();
    ctx.fillStyle = 'rgba(0,6,3,' + (0.42 * a0).toFixed(3) + ')';
    ctx.fillRect(-960, -540, 1920, 1080);
    ctx.font = '600 26px "MS Gothic", Consolas, monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.globalCompositeOperation = 'lighter';
    for (c = 0; c < cols; c++) {
      var speed = 0.7 + EM.hash(c * 37 + 9) * 1.7;
      var head = -540 + 1080 * EM.wrap(u * speed + EM.hash(c * 13 + 3), 1.15);
      for (k = 0; k < 13; k++) {
        var y = head - k * 32;
        if (y < -560 || y > 560) continue;
        var gi = Math.floor(EM.hash(c * 71 + k * 19 + Math.floor(u * 12)) * XGLYPHS.length) % XGLYPHS.length;
        ctx.globalAlpha = a0 * (1 - k / 13) * (k === 0 ? 0.85 : 0.5);
        ctx.fillStyle = k === 0 ? 'rgba(220,255,232,1)' : 'rgba(0,255,102,1)';
        ctx.fillText(XGLYPHS.charAt(gi), -960 + c * cw + cw / 2, y);
      }
    }
    ctx.restore();
  }

  function fxIris(ctx, A, B, u, o) {
    place(ctx, A, 1 - u, 0, 0);
    xbufs();
    var m = xf.cm;
    m.setTransform(XW / 1920, 0, 0, XH / 1080, 0, 0);
    m.globalCompositeOperation = 'source-over';
    m.clearRect(0, 0, 1920, 1080);
    m.translate(960, 540);
    m.drawImage(B, -960, -540, 1920, 1080);
    m.globalCompositeOperation = 'destination-in';
    var seed = o && o.to ? o.to.i : 3;
    var cx = -120 + (EM.hash(seed * 23 + 5) - 0.5) * 520;
    var cy = -60 + (EM.hash(seed * 31 + 9) - 0.5) * 340;
    var R = 70 + 1500 * E.inOutQuad(u);
    var g = m.createRadialGradient(cx, cy, Math.max(8, R * 0.74), cx, cy, Math.max(10, R));
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    m.fillStyle = g;
    m.fillRect(-960, -540, 1920, 1080);
    m.setTransform(1, 0, 0, 1, 0, 0);
    place(ctx, xf.m, Math.min(1, u * 1.6), 0, 0);
    /* the ring */
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(0,255,120,' + (0.35 * Math.sin(Math.PI * u)).toFixed(3) + ')';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.74, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  function fxPunch(ctx, A, B, u) {
    var sA = 1 + 0.05 * Math.sin(Math.PI * u);
    ctx.save(); ctx.globalAlpha = 1 - u; ctx.scale(sA, sA);
    ctx.drawImage(A, -960, -540, 1920, 1080); ctx.restore();
    var sB = 1 + 0.05 * (1 - u);
    ctx.save(); ctx.globalAlpha = u; ctx.scale(sB, sB);
    ctx.drawImage(B, -960, -540, 1920, 1080); ctx.restore();
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.sin(Math.PI * u) * 0.20;
    ctx.fillStyle = 'rgba(150,255,190,1)'; ctx.fillRect(-960, -540, 1920, 1080);
    ctx.restore();
  }

  var FX = [fxFade, fxSlices, fxTiles, fxWipe, fxBars, fxZoom, fxRgb, fxGlyph, fxIris, fxPunch];
  /* non-act boundaries cycle through these; act boundaries pick a cinematic one */
  var CYCLE = [1, 2, 6, 4, 3, 0, 5, 8, 7, 1, 2, 6, 3, 4, 0, 5, 7, 8, 2];

  function pickFx(to, from) {
    var same = from && from.scene === to.scene;
    var actChange = from && actKey(from.scene) !== actKey(to.scene);
    if (!to.bleed) return [9, 5, 1, 2, 6][to.i % 5];       /* execution storm: fast strikes, still varied */
    if (same) return [9, 0, 5, 4][to.i % 4];               /* same shot: a punch / blink / push */
    if (actChange) {
      var set = [7, 8, 5, 3, 2];                           /* curtain / iris / zoom / wipe / tiles */
      return set[Math.floor(EM.hash(to.i * 61 + 7) * set.length) % set.length];
    }
    return CYCLE[(to.i * 3 + Math.floor(to.i / 5)) % CYCLE.length];
  }
  function durFor(to, from, actChange, same) {
    var T;
    if (same) T = 0.24;
    else if (to.bleed === false) T = 0.17;
    else {
      var a = actKey(to.scene);
      T = a === 'exe' ? 0.30 : a === 'abs' ? 0.92 : a === 'lov' ? 1.05 : a === 'fls' ? 0.66 : 0.56;
      if (actChange) T *= 1.22;
      T *= clamp(to.dur / 2.2, 0.70, 1.30);
      T = clamp(T, 0.22, 1.45);
    }
    return T;
  }
  function windowFor(from, to, t) {
    if (!from || !to) return null;
    var same = from.scene === to.scene;
    var actChange = actKey(from.scene) !== actKey(to.scene);
    var T = durFor(to, from, actChange, same);
    var start = to.t - T * 0.26;
    if (t < start || t > start + T) return null;
    return {
      from: from, to: to, T: T, start: start, same: same, actChange: actChange,
      u: clamp((t - start) / T, 0, 1), fx: pickFx(to, from),
      dir: (to.i * 3 + Math.floor(to.i / 4)) % 4
    };
  }

  function drawTransition(tr, w, t) {
    xbufs();
    var main = EM.D.ctx();
    var to = tr.to, from = tr.from;
    var pFrom = from.dur > 0 ? clamp((t - from.t) / from.dur, 0, 1) : 1;
    var pTo = to.dur > 0 ? clamp((t - to.t) / to.dur, 0, 1) : 0;
    if (t < to.t) {
      /* pre-roll: the incoming plate is already alive when it gets revealed */
      var k = E.outCubic(clamp((t - tr.start) / Math.max(0.001, tr.T * 0.26), 0, 1));
      pTo = 0.02 + 0.30 * k;
    }
    renderTo(xf.ca, from, w, t, pFrom);
    renderTo(xf.cb, to, w, t, pTo);
    EM.D.bind(main, 1920, 1080);
    var u = E.inOutQuad(tr.u);
    FX[tr.fx](main, xf.a, xf.b, u, tr);
    main.globalAlpha = 1;
    main.globalCompositeOperation = 'source-over';
    main.filter = 'none';
    return true;
  }

  function drawSequence(cue, w, t) {
    var C = EM.Lyrics.cues;
    var prev = cue.i > 0 ? C[cue.i - 1] : null;
    var next = (cue.i + 1 < C.length) ? C[cue.i + 1] : null;
    var tr = windowFor(prev, cue, t);
    var tr2 = windowFor(cue, next, t);
    if (tr2 && (!tr || tr2.start > tr.start)) tr = tr2;
    if (tr) return drawTransition(tr, w, t);
    var list = REG[cue.scene];
    var p = cue.dur > 0 ? clamp((t - cue.t) / cue.dur, 0, 1) : 0;
    if (list) exec(list, w, p, t, cue, 1);
    if (EM.Objects) EM.Objects.draw(cue, w, t, p);
    return !!list;
  }

  /* which effect will play at a boundary (debug / tests) */
  EM.transitionAt = function (cueIndex) {
    var C = EM.Lyrics.cues;
    if (cueIndex <= 0 || cueIndex >= C.length) return null;
    var from = C[cueIndex - 1], to = C[cueIndex];
    return {
      from: from.scene, to: to.scene,
      fx: pickFx(to, from),
      dur: durFor(to, from, actKey(from.scene) !== actKey(to.scene), from.scene === to.scene)
    };
  };


  EM.Scenes = S; EM.SceneReg = REG; EM.SceneOrder = ORDER;
  EM.drawScene = draw; EM.drawSequence = drawSequence;
  EM.hasPlate = function (id) { return !!REG[id]; };
  EM.plates = function () { return ORDER.slice(); };
  EM.sceneFaults = function () { return faultSeq.map(function (f) { return f.id + ': ' + f.message; }); };
  EM.sceneFaultCount = function () { return faultCount; };
})(window.EM);
