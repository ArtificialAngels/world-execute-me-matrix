/* 10_draw.js — the drawing kit: stage units, type, and flat emission.
   Every plate draws in 1920x1080 stage units with the origin at the centre.
   There is NO projector and NO wall any more: cast() and body() are the same
   flat draw, and nothing is scaled about a light. (The signatures survive so
   the hundred plates keep working; the lamp is a constant, see 01_world.js.) */
(function (EM) {
  'use strict';

  var TAU = EM.TAU, clamp = EM.clamp, lerp = EM.lerp, rgba = EM.rgba, mix = EM.mix;

  var ctx = null, W = 1920, H = 1080;
  var curW = 1.2, curA = 1;
  var MONO = 'Cascadia Mono, Consolas, monospace';
  var SANS = 'Bahnschrift, "Segoe UI", "Noto Sans SC", "Microsoft YaHei", sans-serif';
  var COND = 'Bahnschrift SemiCondensed, Bahnschrift, "Segoe UI Semibold", "Noto Sans SC", sans-serif';
  var SERIF = 'Georgia, "Iowan Old Style", "Songti SC", "SimSun", serif';

  function bind(c, w, h) { ctx = c; W = w; H = h; }
  function C() { return ctx; }
  function size() { return { w: W, h: H, hw: W / 2, hh: H / 2 }; }
  function stageW() { return W; }
  function stageH() { return H; }

  function paint(c, a) {
    if (c == null) return null;
    if (typeof c === 'string') return c;
    return rgba(c, a === undefined ? 1 : a);
  }

  function alpha(a) { curA = clamp(a, 0, 1); ctx.globalAlpha = curA; return curA; }
  function lw(w) { if (w != null) { curW = w; ctx.lineWidth = w; } return curW; }
  function dash(p) { ctx.setLineDash(p || []); return p; }
  function comp(m) { ctx.globalCompositeOperation = m || 'source-over'; }
  function blur(px) { ctx.filter = px ? 'blur(' + px + 'px)' : 'none'; }
  function shadow(b, c) { ctx.shadowBlur = b || 0; ctx.shadowColor = c || 'rgba(0,0,0,0)'; }
  function strokeStyle(c, a) { if (c != null) ctx.strokeStyle = paint(c, a === undefined ? 1 : a); return ctx.strokeStyle; }
  function fillStyle(c, a) { if (c != null) ctx.fillStyle = paint(c, a === undefined ? 1 : a); return ctx.fillStyle; }
  function stroke(c, a) { if (c != null) strokeStyle(c, a); ctx.stroke(); }
  function fill(c, a) { if (c != null) fillStyle(c, a); ctx.fill(); }

  /* ---------------- paths ---------------- */
  function begin() { ctx.beginPath(); }
  function move(x, y) { ctx.moveTo(x, y); }
  function to(x, y) { ctx.lineTo(x, y); }
  function close() { ctx.closePath(); }
  function strokePath() { ctx.stroke(); }
  function fillPath() { ctx.fill(); }

  function line(x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
  function polyline(pts, closed) {
    if (!pts || !pts.length) return;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    if (closed) ctx.closePath();
    ctx.stroke();
  }
  function fillPoly(pts) {
    if (!pts || !pts.length) return;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath(); ctx.fill();
  }
  function rect(x, y, w, h) { ctx.beginPath(); ctx.rect(x, y, w, h); }
  function srect(x, y, w, h) { rect(x, y, w, h); ctx.stroke(); }
  function frect(x, y, w, h) { rect(x, y, w, h); ctx.fill(); }
  function circle(x, y, r, a0, a1) {
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0.01, r), a0 === undefined ? 0 : a0, a1 === undefined ? TAU : a1);
  }
  function scircle(x, y, r, a0, a1) { circle(x, y, r, a0, a1); ctx.stroke(); }
  function fcircle(x, y, r, a0, a1) { circle(x, y, r, a0, a1); ctx.fill(); }
  function arc(x, y, r, a0, a1) { circle(x, y, r, a0, a1); ctx.stroke(); }
  function ring(x, y, r, w) {
    ctx.beginPath(); ctx.arc(x, y, Math.max(0.01, r), 0, TAU);
    ctx.lineWidth = w || 1; ctx.stroke();
  }
  function dot(x, y, r, c) { if (c) fill(c); ctx.beginPath(); ctx.arc(x, y, Math.max(0.02, r), 0, TAU); ctx.fill(); }
  function ellipse(x, y, rx, ry, rot) {
    ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot || 0, 0, TAU);
  }
  function sellipse(x, y, rx, ry, rot) { ellipse(x, y, rx, ry, rot); ctx.stroke(); }
  function fellipse(x, y, rx, ry, rot) { ellipse(x, y, rx, ry, rot); ctx.fill(); }

  /* smooth curve through points (Catmull-Rom-ish quadratic midpoints) */
  function spine(pts, closed) {
    if (!pts || pts.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length - 1; i++) {
      var mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
      ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
    }
    ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
    if (closed) ctx.closePath();
  }
  function sspine(pts, closed) { spine(pts, closed); ctx.stroke(); }
  function fspine(pts, closed) { spine(pts, closed); ctx.fill(); }

  function spiral(cx, cy, r0, r1, turns, a0, dir) {
    ctx.beginPath();
    var n = Math.max(16, Math.ceil(turns * 48));
    for (var i = 0; i <= n; i++) {
      var u = i / n;
      var a = (a0 || 0) + dir * u * turns * TAU;
      var r = lerp(r0, r1, u);
      var x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  function hatch(x, y, w, h, gap, ang) {
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    var diag = Math.hypot(w, h), cx = x + w / 2, cy = y + h / 2;
    ctx.translate(cx, cy); ctx.rotate(ang || 0.7);
    for (var i = -diag; i <= diag; i += (gap || 8)) { ctx.beginPath(); ctx.moveTo(i, -diag); ctx.lineTo(i, diag); ctx.stroke(); }
    ctx.restore();
  }

  function grid(x, y, w, h, step, xoff, yoff) {
    step = step || 40;
    ctx.beginPath();
    for (var gx = x - (xoff || 0) % step; gx <= x + w; gx += step) { ctx.moveTo(gx, y); ctx.lineTo(gx, y + h); }
    for (var gy = y - (yoff || 0) % step; gy <= y + h; gy += step) { ctx.moveTo(x, gy); ctx.lineTo(x + w, gy); }
    ctx.stroke();
  }

  /* ---------------- text ---------------- */
  function font(size, kind, weight, italic) {
    var fam = kind === 'mono' ? MONO : (kind === 'serif' ? SERIF : (kind === 'cond' ? COND : SANS));
    var w = weight || 300;
    return (italic ? 'italic ' : '') + w + ' ' + size + 'px ' + fam;
  }
  function measure(str, size, kind, weight) {
    ctx.save();
    ctx.font = font(size, kind, weight);
    var w = ctx.measureText(str).width;
    ctx.restore();
    return w;
  }
  function text(str, x, y, o) {
    o = o || {};
    if (str == null) return 0;
    str = String(str);
    var size = o.size || 40;
    ctx.save();
    ctx.font = font(size, o.kind, o.weight, o.italic);
    ctx.textAlign = o.align || 'center';
    ctx.textBaseline = o.baseline || 'middle';
    if (o.color != null) ctx.fillStyle = paint(o.color, 1);
    if (o.rot) { ctx.translate(x, y); ctx.rotate(o.rot); x = 0; y = 0; }
    var track = o.tracking || 0;
    var width = 0;
    if (track) {
      var chars = str.split('');
      var tw = 0;
      for (var i = 0; i < chars.length; i++) tw += ctx.measureText(chars[i]).width + track;
      tw -= track;
      var startX = ctx.textAlign === 'center' ? x - tw / 2 : (ctx.textAlign === 'right' ? x - tw : x);
      /* per-glyph drawing must be left-anchored: fillText would otherwise centre
         every glyph on the cursor and eat half of each neighbour's spacing
         (which made I and O collide in EXECUTION) */
      ctx.textAlign = 'left';
      var cursor = startX;
      for (i = 0; i < chars.length; i++) {
        ctx.fillText(chars[i], cursor, y);
        cursor += ctx.measureText(chars[i]).width + track;
      }
      width = tw;
    } else {
      ctx.fillText(str, x, y);
      width = ctx.measureText(str).width;
    }
    ctx.restore();
    return width;
  }
  function textWidth(str, size, o) { return measure(str, size, (o && o.kind) || 'sans', (o && o.weight) || 300); }

  /* ---------------- flat stage (no projector) ---------------- */
  function proj(zn, lamp) {
    /* no central projection: depth is a no-op kept for API compatibility */
    return { k: 1, x: 0, y: 0, zn: clamp(zn == null ? 0.3 : zn, 0, 0.95) };
  }

  /* cast: the body used to be projected on a wall by the lamp. The wall is
     gone, so this is now a plain draw — same geometry, no magnification, no
     soft shadow, no light-relative position. */
  function cast(fn, o) {
    o = o || {};
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha = alpha(alpha() * o.alpha);
    fn(ctx, D);
    ctx.restore();
    return { k: 1, x: 0, y: 0, zn: o.z == null ? 0.3 : o.z };
  }

  /* body: the object itself. With no point light there is no near/far read,
     so it draws at its own coordinates, unscaled. */
  function body(fn, o) {
    o = o || {};
    ctx.save();
    if (o.x || o.y) { ctx.translate(o.x || 0, o.y || 0); }
    if (o.rot) ctx.rotate(o.rot);
    if (o.alpha != null) ctx.globalAlpha = alpha(alpha() * o.alpha);
    fn(ctx, D);
    ctx.restore();
  }

  function inkPath(pathFn, o) {
    o = o || {};
    var c = o.color || (EM.W ? EM.W.pal().shadow : [15, 12, 10]);
    var a = o.alpha == null ? 1 : o.alpha;
    fill(c, a);
    pathFn(ctx, D);
    ctx.fill();
  }

  function glow(x, y, r, c, a) {
    if (r <= 0) return;
    var g = ctx.createRadialGradient(x, y, 0, x, y, r);
    var col = c || (EM.W ? EM.W.pal().glow : [255, 180, 110]);
    g.addColorStop(0, rgba(col, a == null ? 1 : a));
    g.addColorStop(0.45, rgba(col, (a == null ? 1 : a) * 0.35));
    g.addColorStop(1, rgba(col, 0));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.restore();
  }

  function clipRect(x, y, w, h) { ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); }
  function clipCircle(x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0.01, r), 0, TAU); ctx.clip(); }
  function withClip(fnClip, fnDraw) {
    ctx.save(); fnClip(ctx, D); ctx.clip(); fnDraw(ctx, D); ctx.restore();
  }

  var D = {
    ctx: C, bind: bind, size: size, W: function () { return W; }, H: function () { return H; },
    alpha: alpha, lw: lw, dash: dash, comp: comp, blur: blur, shadow: shadow,
    stroke: stroke, fill: fill, paint: paint,
    strokeStyle: strokeStyle, fillStyle: fillStyle,
    begin: begin, move: move, to: to, close: close, strokePath: strokePath, fillPath: fillPath,
    line: line, polyline: polyline, fillPoly: fillPoly,
    rect: rect, srect: srect, frect: frect,
    circle: circle, scircle: scircle, fcircle: fcircle, arc: arc, ring: ring, dot: dot,
    ellipse: ellipse, sellipse: sellipse, fellipse: fellipse,
    spine: spine, sspine: sspine, fspine: fspine, spiral: spiral,
    hatch: hatch, grid: grid,
    font: font, measure: measure, text: text, textWidth: textWidth,
    proj: proj, cast: cast, body: body, inkPath: inkPath, glow: glow,
    clipRect: clipRect, clipCircle: clipCircle, withClip: withClip
  };
  EM.D = D;
  EM.Font = { mono: MONO, sans: SANS, cond: COND, serif: SERIF };
})(window.EM);
