/* 35_motifs.js — the shared lexicon. Everything here draws BODY-space
   marks; the plate wraps them in one projection (M.shadow) so a whole
   composition costs one blur, not thirty. */
(function (EM) {
  'use strict';
  var D = EM.D, clamp = EM.clamp, lerp = EM.lerp, mix = EM.mix, rgba = EM.rgba;
  var hash = EM.hash, hashs = EM.hashs, TAU = EM.TAU;

  function cur() { return EM.cur || { pal: EM.PAL({ lamp: { lux: 1 }, warm: 1, love: 0, burn: 0, trace: 0.5 }), lamp: { x: 0, y: 0, z: 900, lux: 1 }, t: 0, warm: 1, love: 0, trace: 0.5, chaos: 0, order: 1, dust: 0.5, burn: 0, voidSize: 0, wallAge: 0.2, dust: 0.5 }; }
  function pal() { return cur().pal; }
  function lamp() { return cur().lamp; }

  /* ink is phosphor now: strokes are the light, masses stay dark glass so the
     frame reads as line art instead of solid green slabs */
  function ink(a) {
    var p = pal(), al = a == null ? 1 : a;
    D.strokeStyle(p.shadow, al);
    D.fillStyle(mix(p.wallLo, p.wallHi, 0.55), al * 0.92);
  }
  function ember(a) { var p = pal(); D.strokeStyle(p.hot, a == null ? 1 : a); D.fillStyle(p.hot, a == null ? 1 : a); }
  function trace(a) { var p = pal(); D.strokeStyle(p.trace, a == null ? 1 : a); D.fillStyle(p.trace, a == null ? 1 : a); }

  /* legacy inverse of the old projector: no projection, return the point */
  function inv(x, y, z) { return [x, y]; }

  /* one flat draw for a whole composition (no projection, no wall) */
  function shadow(fn, o) {
    o = o || {};
    D.cast(function () { ink(o.ink == null ? 1 : o.ink); fn(); }, o);
  }
  /* the object itself, drawn in its own light */
  function rim(fn, o) {
    o = o || {};
    D.body(function () { ember(o.alpha == null ? 0.35 : o.alpha); fn(); }, o);
  }

  /* ------------------------------------------------------------------ type */
  function type(str, o) {
    o = o || {};
    var size = o.size || 64, kind = o.kind || 'cond', weight = o.weight || 300;
    var a = o.alpha == null ? 1 : o.alpha;
    /* tracked by hand, so widen the pair enough that round glyphs never eat a
       narrow I (Bahnschrift's O has a negative left bearing) */
    var trk = Math.max(o.track == null ? 0 : o.track, Math.round(size * 0.035));
    if (a <= 0.005 || !str) return;
    var mode = o.mode || 'cast';
    var ctx = D.ctx();
    var p = pal();
    ctx.save();
    if (o.rot) { ctx.translate(o.x || 0, o.y || 0); ctx.rotate(o.rot); o = Object.assign({}, o, { x: 0, y: 0, rot: 0 }); }
    if (mode === 'light') {
      /* a dark halo first: the wall behind the word is not always bright */
      ctx.globalAlpha = a * 0.62;
      ctx.filter = 'blur(8px)';
      D.text(str, o.x || 0, o.y || 0, {
        size: size, kind: kind, weight: weight, color: 'rgba(0,0,0,0.9)',
        align: o.align || 'center', tracking: trk
      });
      ctx.filter = 'none';
      ctx.globalCompositeOperation = 'lighter';
      var g = ctx.createRadialGradient(o.x || 0, o.y || 0, 0, o.x || 0, o.y || 0, Math.max(150, size * 3.6));
      g.addColorStop(0, rgba(p.glow, 0.20 * a));
      g.addColorStop(1, rgba(p.glow, 0));
      ctx.fillStyle = g;
      ctx.fillRect((o.x || 0) - size * 4, (o.y || 0) - size * 3, size * 8, size * 6);
      D.text(str, o.x || 0, o.y || 0, {
        size: size, kind: kind, weight: weight, color: rgba(mix(p.hot, p.glow, 0.35), a),
        align: o.align || 'center', tracking: trk, italic: o.italic
      });
    } else if (mode === 'stamp') {
      ctx.globalAlpha = a;
      D.text(str, o.x || 0, o.y || 0, {
        size: size, kind: kind, weight: 700, color: rgba(p.shadow, 0.94),
        align: o.align || 'center', tracking: trk
      });
    } else if (mode === 'ink') {
      /* a word written in phosphor: bright core, green bleed */
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = a * 0.16;
      ctx.filter = 'blur(9px)';
      D.text(str, o.x || 0, o.y || 0, {
        size: size, kind: kind, weight: weight, color: rgba(p.glow, 1),
        align: o.align || 'center', tracking: trk
      });
      ctx.filter = 'none';
      ctx.globalAlpha = a;
      D.text(str, o.x || 0, o.y || 0, {
        size: size, kind: kind, weight: weight, color: rgba(p.shadow, 0.97),
        align: o.align || 'center', tracking: trk, italic: o.italic
      });
    } else if (mode === 'whisper') {
      D.cast(function () {
        D.text(str, o.x || 0, o.y || 0, {
          size: size, kind: kind, weight: weight, color: rgba(p.shadow, a * 0.5),
          align: o.align || 'center', tracking: o.track || 0
        });
      }, { z: o.z == null ? 0.62 : o.z, blur: o.blur == null ? 9 : o.blur });
    } else {
      D.cast(function () {
        D.text(str, o.x || 0, o.y || 0, {
          size: size, kind: kind, weight: weight, color: rgba(p.shadow, a),
          align: o.align || 'center', tracking: o.track || 0, italic: o.italic
        });
      }, { z: o.z == null ? 0.26 : o.z, blur: o.blur == null ? 2.2 : o.blur, alpha: o.castAlpha });
    }
    ctx.restore();
  }

  /* ---------------------------------------------------------- lyric director
     Premium-MV lyrics: there is no subtitle band and no fixed baseline.
     Every line gets its own typographic situation —
       0 hero (big, centred, wrap)
       1 left stack   2 right stack
       3 top banner (letterspaced mono)
       4 vertical edge (rotated, reads up/down the frame)
       5 scattered words (poster)
       6 giant echo layer (oversized ghost behind the live line)
       8 instrumental microcopy (atmosphere only)
     Words arrive one at a time with easing (tracking settles as they land),
     keywords gain weight and a hairline, onsets push tracking/scale. Style is
     chosen from cue.i (stable per line); motion only comes from p and onsets. */

  var KWORDS = {
    EXECUTION: 1, EXECUTE: 1, LOVE: 1, 'LO-O-OVE': 1, GOD: 1, CAT: 1, EGGPLANT: 1, TOMATO: 1,
    INFINITY: 1, CIRCLE: 1, SINE: 1, POINTS: 1, DIMENSION: 1, CIRCUMFERENCE: 1, TANGENTS: 1,
    LIMIT: 1, LIMITATIONS: 1, SATISFACTION: 1, HAPPY: 1, TRAPPED: 1, FREE: 1, ALONE: 1,
    ISOLATION: 1, COMPLETION: 1, VIBRATIONS: 1, NUTRIENTS: 1, ANTIOXIDANTS: 1, TRANCE: 1,
    GENDER: 1, CURRENT: 1
  };
  function kw(word) { return !!KWORDS[word.toUpperCase().replace(/[^A-Z\-]/g, '')]; }
  function kWidth(word, size, kind, weight, track) {
    return D.textWidth(word, size, { kind: kind, weight: weight }) + Math.max(0, word.length - 1) * track;
  }
  function kWrap(words, size, kind, weight, track, maxW) {
    var lines = [], line = [], sum = 0, space = size * 0.28 + track, i, ww, add;
    for (i = 0; i < words.length; i++) {
      ww = kWidth(words[i], size, kind, weight, track);
      add = (line.length ? space : 0) + ww;
      if (line.length && sum + add > maxW) { lines.push({ words: line, width: sum }); line = []; sum = 0; add = ww; }
      line.push(words[i]); sum += add;
    }
    if (line.length) lines.push({ words: line, width: sum });
    return lines;
  }

  function lyric(cue, p, o) {
    o = o || {};
    var ctx = D.ctx(), P = pal(), w = cur(), L = EM.Life, E_ = EM.E;
    var raw = String(o.text || cue.text || '').replace(/\s+/g, ' ').trim();
    if (!raw) return;
    var instr = raw.charAt(0) === '(';
    var str = instr ? raw.replace(/^\(/, '').replace(/\)$/, '').trim() : raw;
    if (!str) return;
    /* exe.final prints the word itself (double exposure); don't type it twice */
    if (cue.scene === 'exe.final') return;
    var appear = L.vis(p, L.ramp(cue)) * (o.alpha == null ? 1 : o.alpha);
    if (appear <= 0.004) return;
    var pulse = EM.onsetPulse(w.t, 0.20);
    var seed = (cue.i || 0) * 131 + Math.floor((cue.t || 0) * 10);
    var family = instr ? 8 : (cue.i || 0) % 7;
    var words = str.split(' ').filter(Boolean);
    var hv = hash(seed + 3);
    var isExe = /execut/i.test(str);

    /* one line, word by word */
    function drawLine(line, x, y, size, kind, weight, track, align, col, aMul, u0, u1) {
      var space = size * 0.28 + track;
      var startX = align === 'left' ? x : (align === 'right' ? x - line.width : x - line.width / 2);
      var cursor = startX, n = line.words.length;
      for (var i = 0; i < n; i++) {
        var word = line.words[i];
        var hot = !instr && kw(word);
        var ww = kWidth(word, size, kind, weight, track);
        var t0 = u0 + (n > 1 ? (i / n) * (u1 - u0) : 0);
        var u = E_.outCubic(clamp((p - t0) / 0.20, 0, 1));
        if (u > 0.004) {
          var dy = (1 - u) * (hash(seed + i * 7) > 0.5 ? 16 : -16);
          var dx = (1 - u) * (hash(seed + i * 11) - 0.5) * 20;
          var ss = size * (hot ? 1.06 : 1) * (1 + pulse * 0.025);
          var wtrk = hot ? Math.max(track + (1 - u) * 4, Math.round(ss * 0.055)) : track + (1 - u) * 4;
          var wt = hot ? 700 : weight;
          var cc = hot ? P.hot : col;
          if (hot && isExe) cc = mix(cc, P.red, 0.28);
          ctx.save();
          ctx.globalAlpha = clamp(appear * aMul * u, 0, 1);
          ctx.font = D.font(ss, kind, wt, false);
          ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
          if (hot) { ctx.shadowColor = rgba(P.glow, 0.55); ctx.shadowBlur = 14 + 10 * pulse; }
          else { ctx.shadowColor = rgba(P.glow, 0.20); ctx.shadowBlur = 7; }
          if (pulse > 0.60) {                  /* beat echo: a cyan ghost on strong hits */
            ctx.globalAlpha = clamp(appear * aMul * u * 0.42, 0, 1);
            D.text(word, cursor + dx + 5, y + dy, {
              size: ss, kind: kind, weight: wt, color: rgba(P.trace, 0.55),
              align: 'left', tracking: wtrk
            });
            ctx.globalAlpha = clamp(appear * aMul * u, 0, 1);
          }
          D.text(word, cursor + dx, y + dy, {
            size: ss, kind: kind, weight: wt, color: rgba(cc, 1),
            align: 'left', tracking: wtrk
          });
          if (hot) {                            /* a hairline under the keyword */
            ctx.globalAlpha = clamp(appear * aMul * u * 0.42, 0, 1);
            ctx.fillStyle = rgba(P.hot, 0.8);
            ctx.fillRect(cursor + dx, y + dy + ss * 0.60, ww, 1.4);
          }
          ctx.restore();
        }
        cursor += ww + space;
      }
    }

    /* small editorial mark: rule + time + act, the "type set" feel */
    function mark(x, y, align) {
      var tr = String(cue.scene || '').split('.')[0].toUpperCase();
      ctx.save();
      ctx.globalAlpha = appear * 0.34;
      ctx.strokeStyle = rgba(P.trace, 1); ctx.lineWidth = 1;
      ctx.beginPath();
      var rw = 64;
      if (align === 'left') { ctx.moveTo(x, y); ctx.lineTo(x + rw, y); }
      else if (align === 'right') { ctx.moveTo(x - rw, y); ctx.lineTo(x, y); }
      else { ctx.moveTo(x - rw, y); ctx.lineTo(x + rw, y); }
      ctx.stroke();
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = appear * 0.30;
      D.text(EM.fmtTime(cue.t) + '  /  ' + tr, x + (align === 'right' ? -4 : 4), y + 14, {
        size: 11, kind: 'mono', weight: 400, color: rgba(P.trace, 0.8),
        align: align === 'right' ? 'right' : (align === 'left' ? 'left' : 'center'), tracking: 4
      });
      ctx.restore();
    }

    ctx.save();
    if (family === 8) {                     /* instrumental: no lyric, just atmosphere */
      var iy = hv > 0.5 ? -404 : 396;
      ctx.globalAlpha = appear * 0.30;
      D.text(raw, 0, iy, {
        size: 14, kind: 'mono', weight: 400, color: rgba(P.trace, 1),
        align: 'center', tracking: 10
      });
      /* a small double rule, so an instrumental still reads as a typographic beat */
      ctx.globalAlpha = appear * 0.26;
      ctx.strokeStyle = rgba(P.trace, 1); ctx.lineWidth = 1;
      var rwid = D.textWidth(raw, 14, { kind: 'mono', weight: 400 }) * 0.5 + 92;
      ctx.beginPath();
      ctx.moveTo(-rwid, iy); ctx.lineTo(-rwid + 64, iy);
      ctx.moveTo(rwid - 64, iy); ctx.lineTo(rwid, iy);
      ctx.stroke();
      ctx.globalAlpha = appear * 0.20;
      D.text(EM.fmtTime(cue.t), 0, iy + 22, {
        size: 10, kind: 'mono', weight: 400, color: rgba(P.trace, 1),
        align: 'center', tracking: 4
      });
      ctx.restore();
      return;
    }

    var li, n, yy, x, y, size, kind, weight, track, align, lines, col;

    if (family === 0) {                     /* hero block */
      size = clamp(118 - words.length * 3.5, 62, 112);
      kind = 'cond'; weight = 300; track = 2; align = 'center';
      lines = kWrap(words, size, kind, weight, track, 1500);
      y = [-150, 10, 170][Math.floor(hv * 3) % 3];
      mark(0, y - lines.length * size * 0.52 - 34, 'center');
      for (li = 0; li < lines.length; li++) {
        yy = y + (li - (lines.length - 1) / 2) * size * 0.92;
        drawLine(lines[li], 0, yy, size, kind, weight, track, align, P.hot, 1, 0.02, 0.10);
      }
    } else if (family === 1 || family === 2) {   /* side stack */
      var left = family === 1;
      size = clamp(80 - words.length * 1.6, 46, 72);
      kind = 'cond'; weight = 300; track = 3;
      x = left ? -860 : 860; align = left ? 'left' : 'right';
      lines = kWrap(words, size, kind, weight, track, 740);
      y = [-250, -80, 90, 250][Math.floor(hv * 4) % 4];
      for (li = 0; li < lines.length; li++) {
        yy = y + (li - (lines.length - 1) / 2) * size * 0.94;
        drawLine(lines[li], x, yy, size, kind, weight, track, align, P.shadow, 1, 0.02, 0.10);
      }
      ctx.save();                          /* the rule the stack hangs from */
      ctx.globalAlpha = appear * 0.28;
      ctx.strokeStyle = rgba(P.trace, 1); ctx.lineWidth = 1;
      ctx.beginPath();
      var bx = left ? -880 : 880;
      ctx.moveTo(bx, y - lines.length * size * 0.6 - 26);
      ctx.lineTo(bx, y + lines.length * size * 0.6 + 26);
      ctx.stroke();
      ctx.restore();
      mark(x, y - lines.length * size * 0.6 - 42, align);
    } else if (family === 3) {              /* top banner */
      size = clamp(62 - words.length * 1.2, 32, 56);
      kind = 'mono'; weight = 400; track = 12; align = 'center';
      var up = str.toUpperCase();
      lines = kWrap(up.split(' '), size, kind, weight, track, 1640);
      y = hv > 0.5 ? -406 : -352;
      for (li = 0; li < lines.length; li++) {
        yy = y + li * size * 1.5;
        drawLine(lines[li], 0, yy, size, kind, weight, track, align, P.hot, 0.92, 0.02, 0.09);
      }
      mark(0, y + lines.length * size * 1.5 + 12, 'center');
    } else if (family === 4) {              /* vertical edge */
      size = clamp(76 - words.length * 2.6, 40, 56);
      kind = 'cond'; weight = 300; track = 7;
      var line = { words: words, width: 0 };
      line.width = 0;
      for (li = 0; li < words.length; li++) line.width += kWidth(words[li], size, kind, weight, track) + (li ? size * 0.28 + track : 0);
      if (line.width > 900) { size = size * 900 / line.width; line.width = 900; }
      var side = hv > 0.5 ? -1 : 1;
      var ax = side * 872;
      ctx.translate(ax, 30);
      ctx.rotate(-Math.PI / 2 * side);
      drawLine(line, 0, 0, size, kind, weight, track, 'center', P.hot, 1, 0.02, 0.12);
      ctx.globalAlpha = appear * 0.3;
      ctx.strokeStyle = rgba(P.trace, 1); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-line.width / 2 - 26, 0); ctx.lineTo(-line.width / 2 - 12, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(line.width / 2 + 12, 0); ctx.lineTo(line.width / 2 + 26, 0); ctx.stroke();
    } else if (family === 5) {              /* scattered words */
      size = clamp(96 - words.length * 4.5, 44, 86);
      kind = 'cond'; weight = 300; track = 2;
      y = [-190, -20, 160][Math.floor(hv * 3) % 3];
      var span = 1660, base = -span / 2, step = span / Math.max(1, words.length);
      /* long words must not collide with their neighbours: shrink to the slot */
      var maxww = 0, mi;
      for (mi = 0; mi < words.length; mi++) maxww = Math.max(maxww, kWidth(words[mi], size, kind, weight, track));
      if (maxww > step * 0.86) size = Math.max(34, size * (step * 0.86) / maxww);
      for (var wi = 0; wi < words.length; wi++) {
        var wd = words[wi];
        var ww = kWidth(wd, size, kind, weight, track);
        var uu = E_.outCubic(clamp((p - (0.02 + wi * 0.05)) / 0.22, 0, 1));
        if (uu <= 0.004) continue;
        var px = base + step * (wi + 0.5) - ww / 2;
        var py = y + (hash(seed + wi * 13) - 0.5) * 120;
        var hotw = kw(wd);
        ctx.save();
        ctx.globalAlpha = appear * uu;
        ctx.translate(px + ww / 2, py);
        ctx.rotate((hash(seed + wi * 17) - 0.5) * 0.10);
        if (hotw) { ctx.shadowColor = rgba(P.glow, 0.5); ctx.shadowBlur = 14; }
        D.text(wd, 0, 0, {
          size: size, kind: kind, weight: hotw ? 700 : 300,
          color: rgba(hotw ? P.hot : P.shadow, 1), align: 'center', tracking: track + (1 - uu) * 5
        });
        ctx.restore();
      }
    } else {                                /* family 6: giant echo behind the line */
      size = clamp(112 - words.length * 3.4, 54, 100);
      kind = 'cond'; weight = 300; track = 3; align = 'center';
      lines = kWrap(words, size, kind, weight, track, 1400);
      y = [-40, 130][Math.floor(hv * 2) % 2];
      for (li = 0; li < lines.length; li++) {
        yy = y + (li - (lines.length - 1) / 2) * size * 0.92;
        ctx.save();
        ctx.globalAlpha = appear * 0.09;
        D.text(lines[li].words.join(' '), 0, yy, {
          size: size * 2.15, kind: 'cond', weight: 700, color: rgba(P.wallHi, 1),
          align: 'center', tracking: 2
        });
        ctx.restore();
      }
      for (li = 0; li < lines.length; li++) {
        yy = y + (li - (lines.length - 1) / 2) * size * 0.92;
        drawLine(lines[li], 0, yy, size, kind, weight, track, align, P.hot, 1, 0.0, 0.08);
      }
    }
    ctx.restore();
  }
  /* how brightly lit the wall is at a point: decides ink or light type */
  /* there is no lamp and no lit wall any more: nothing is locally lit */
  function localLight() { return 0; }
  function autoMode() { return 'light'; }

  /* ---------------------------------------------------------------- rig */
  function rig(o) {
    o = o || {};
    var x0 = o.x0 == null ? -700 : o.x0, x1 = o.x1 == null ? 700 : o.x1;
    var y = o.y == null ? -250 : o.y, drop = o.drop == null ? 120 : o.drop;
    D.lw(o.lw || 2.2);
    D.line(x0, y, x1, y);
    var n = o.n || 7;
    for (var i = 0; i < n; i++) {
      var x = lerp(x0 + 30, x1 - 30, n > 1 ? i / (n - 1) : 0.5);
      var d = drop * (0.55 + hash(i * 71 + 3) * 0.9);
      D.lw(1.6); D.line(x, y, x, y + d);
      D.rect(x - 5, y + d - 4, 10, 8); D.fill();
      if (i % 2 === 0 && o.beads !== false) { D.circle(x - 26, y + d * 0.55, 12); D.stroke(); }
    }
  }

  /* ------------------------------------------------------------- constel */
  function constel(o) {
    o = o || {};
    var n = o.n || 9, cx = o.cx || 0, cy = o.cy || 0, r = o.r || 240;
    var seed = o.seed || 1;
    var pts = [];
    for (var i = 0; i < n; i++) {
      var a = (i / n) * TAU + (hash(seed * 31 + i) - 0.5) * 0.5;
      var rr = r * (0.55 + hash(seed * 73 + i * 7) * 0.75);
      pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * (o.squash || 1)]);
    }
    if (o.link !== false) {
      D.lw(1.1);
      for (i = 0; i < pts.length; i++) {
        var j = (i + 1 + Math.floor(hash(seed + i * 13) * 2)) % pts.length;
        D.line(pts[i][0], pts[i][1], pts[j][0], pts[j][1]);
      }
    }
    for (i = 0; i < pts.length; i++) { D.circle(pts[i][0], pts[i][1], o.dot || 4.5); D.fill(); }
    return pts;
  }

  /* ---------------------------------------------------------------- grid */
  function lattice(o) {
    o = o || {};
    var cols = o.cols || 12, rows = o.rows || 7;
    var step = o.step || 90, cx = o.cx || 0, cy = o.cy || 0;
    var x0 = cx - (cols - 1) * step / 2, y0 = cy - (rows - 1) * step / 2;
    D.lw(o.lw || 1.3);
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var x = x0 + c * step, y = y0 + r * step;
        var s = (o.peg || 4) * (0.6 + hash(r * 31 + c * 7) * 0.8);
        D.circle(x, y, s); D.fill();
        if (o.cross && (r % 2 === 0) && (c % 2 === 0)) { D.line(x - s * 2, y, x + s * 2, y); }
      }
    }
  }

  /* --------------------------------------------------------------- waves */
  function waves(o) {
    o = o || {};
    var n = o.n || 3, x0 = o.x0 == null ? -640 : o.x0, x1 = o.x1 == null ? 640 : o.x1;
    var amp = o.amp || 60, per = o.per || 260, cy = o.cy || 0;
    D.lw(o.lw || 2);
    for (var k = 0; k < n; k++) {
      D.begin();
      for (var x = x0; x <= x1; x += 6) {
        var u = (x - x0) / (x1 - x0);
        var y = cy + k * (o.gap || 46) + Math.sin((x / per) * TAU + k * 0.7 + (o.phase || 0)) * amp * (0.6 + 0.4 * Math.sin(u * Math.PI));
        if (x === x0) D.move(x, y); else D.to(x, y);
      }
      D.stroke();
    }
  }
  function tangents(o) {
    o = o || {};
    var x0 = o.x0 == null ? -620 : o.x0, x1 = o.x1 == null ? 620 : o.x1;
    var amp = o.amp || 80, per = o.per || 300, cy = o.cy || 0;
    var n = o.n || 9;
    D.lw(1.6);
    D.begin();
    for (var x = x0; x <= x1; x += 6) {
      var y = cy + Math.sin((x / per) * TAU) * amp;
      if (x === x0) D.move(x, y); else D.to(x, y);
    }
    D.stroke();
    for (var i = 0; i < n; i++) {
      var xx = lerp(x0 + 40, x1 - 40, i / (n - 1));
      var yy = cy + Math.sin((xx / per) * TAU) * amp;
      var slope = Math.cos((xx / per) * TAU) * amp * (TAU / per);
      var dx = 90, dy = slope * dx;
      D.lw(1); D.line(xx - dx, yy - dy, xx + dx, yy + dy);
      D.circle(xx, yy, 4.5); D.fill();
    }
  }

  /* --------------------------------------------------------------- grow */
  function grow(o) {
    o = o || {};
    var seed = o.seed || 3, x = o.x || 0, y = o.y || 260;
    var len = o.len || 120, ang = (o.ang == null ? -Math.PI / 2 : o.ang);
    var depth = o.depth || 5, spread = o.spread || 0.62, w = o.lw || 2.2;
    var pts = o.pts || [];
    function branch(x, y, a, l, d) {
      var x2 = x + Math.cos(a) * l, y2 = y + Math.sin(a) * l;
      pts.push([x, y]); pts.push([x2, y2]);
      D.lw(Math.max(0.7, w * (d / depth)));
      D.line(x, y, x2, y2);
      if (d <= 0) { if (o.leaf !== false) { D.circle(x2, y2, o.leafSize || 3.4); D.fill(); } return; }
      var k = 2 + (hash(seed * 91 + d * 17 + Math.floor(x)) > 0.72 ? 1 : 0);
      for (var i = 0; i < k; i++) {
        var na = a + (i - (k - 1) / 2) * spread + (hash(seed * 13 + d * 7 + i * 31) - 0.5) * 0.42;
        branch(x2, y2, na, l * (0.62 + hash(seed + d * 5 + i) * 0.16), d - 1);
      }
    }
    branch(x, y, ang, len, depth);
    return pts;
  }

  /* --------------------------------------------------------------- stack */
  function stack(o) {
    o = o || {};
    var n = o.n || 6, w = o.w || 420, h = o.h || 260, cx = o.cx || 0, cy = o.cy || 0;
    var dx = o.dx == null ? 34 : o.dx, dy = o.dy == null ? 26 : o.dy;
    D.lw(o.lw || 1.4);
    for (var i = 0; i < n; i++) {
      var s = 1 - i * (o.shrink || 0.1);
      D.rect(cx - w * s / 2 + dx * i, cy - h * s / 2 + dy * i, w * s, h * s);
      D.stroke();
    }
  }

  /* -------------------------------------------------------------- measure */
  function measure(x1, y1, x2, y2, o) {
    o = o || {};
    var p = pal();
    D.lw(o.lw || 1.2);
    trace(o.alpha == null ? 0.75 * (0.3 + cur().trace) : o.alpha);
    D.line(x1, y1, x2, y2);
    var ang = Math.atan2(y2 - y1, x2 - x1);
    var nx = Math.cos(ang + Math.PI / 2), ny = Math.sin(ang + Math.PI / 2);
    var tick = o.tick || 9;
    D.line(x1 - nx * tick, y1 - ny * tick, x1 + nx * tick, y1 + ny * tick);
    D.line(x2 - nx * tick, y2 - ny * tick, x2 + nx * tick, y2 + ny * tick);
    if (o.arrows !== false) {
      var a = 0.5;
      D.line(x1, y1, x1 + Math.cos(ang + a) * 14, y1 + Math.sin(ang + a) * 14);
      D.line(x1, y1, x1 + Math.cos(ang - a) * 14, y1 + Math.sin(ang - a) * 14);
      D.line(x2, y2, x2 - Math.cos(ang + a) * 14, y2 - Math.sin(ang + a) * 14);
      D.line(x2, y2, x2 - Math.cos(ang - a) * 14, y2 - Math.sin(ang - a) * 14);
    }
    if (o.label) {
      var mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      D.text(o.label, mx + nx * 18, my + ny * 18, { size: o.labelSize || 17, kind: 'mono', color: rgba(p.trace, 0.55), tracking: 1 });
    }
  }

  /* --------------------------------------------------------------- pierce */
  function pierce(x, y, r, o) {
    o = o || {};
    var p = pal();
    var g = D.ctx().createRadialGradient(x, y, 0, x, y, Math.max(2, r));
    var a = o.alpha == null ? 0.9 : o.alpha;
    g.addColorStop(0, rgba(p.hot, a));
    g.addColorStop(0.45, rgba(p.glow, a * 0.5));
    g.addColorStop(1, rgba(p.glow, 0));
    D.ctx().save();
    D.ctx().globalCompositeOperation = 'lighter';
    D.ctx().fillStyle = g;
    D.ctx().fillRect(x - r, y - r, r * 2, r * 2);
    D.ctx().restore();
  }

  /* ---------------------------------------------------------------- shard */
  function shard(o) {
    o = o || {};
    var n = o.n || 24, cx = o.cx || 0, cy = o.cy || 0, r0 = o.r0 || 60, r1 = o.r1 || 420;
    var seed = o.seed || 7;
    D.lw(o.lw || 1.5);
    for (var i = 0; i < n; i++) {
      var a = hash(seed * 37 + i * 11) * TAU;
      var rr0 = lerp(r0, r1, hash(seed * 53 + i * 5));
      var rr1 = rr0 + 30 + hash(seed * 71 + i * 3) * 160;
      var a2 = a + (hash(seed * 97 + i) - 0.5) * 0.3;
      D.line(cx + Math.cos(a) * rr0, cy + Math.sin(a) * rr0, cx + Math.cos(a2) * rr1, cy + Math.sin(a2) * rr1);
    }
  }

  /* ------------------------------------------------------------ hand line */
  function pen(pts, o) {
    o = o || {};
    var reveal = clamp(o.reveal == null ? 1 : o.reveal, 0, 1);
    if (reveal <= 0) return;
    var p = pal();
    var n = Math.max(2, Math.floor(pts.length * reveal));
    var ctx = D.ctx();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (var pass = 0; pass < 2; pass++) {
      ctx.strokeStyle = rgba(pass === 0 ? p.glow : p.hot, pass === 0 ? 0.12 : 0.7);
      ctx.lineWidth = pass === 0 ? (o.w || 6) : (o.w || 2);
      ctx.beginPath();
      for (var i = 0; i < n; i++) {
        var x = pts[i][0] + hashs(o.seed * 31 + i * 7) * (o.jitter || 1.6);
        var y = pts[i][1] + hashs(o.seed * 71 + i * 13) * (o.jitter || 1.6);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  /* ------------------------------------------------------------- hand text */
  function hand(str, x, y, o) {
    o = o || {};
    var p = pal();
    var size = o.size || 90, a = o.alpha == null ? 1 : o.alpha;
    var ctx = D.ctx();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var chars = str.split('');
    var total = 0, i;
    ctx.font = D.font(size, o.kind || 'serif', o.weight || 400, true);
    for (i = 0; i < chars.length; i++) total += ctx.measureText(chars[i]).width + (o.track || 4);
    var cx = x - total / 2;
    var reveal = clamp(o.reveal == null ? 1 : o.reveal, 0, 1);
    var shown = reveal * chars.length;
    for (i = 0; i < chars.length; i++) {
      if (i > shown) break;
      var ch = chars[i];
      var chA = a * clamp(shown - i, 0, 1);
      var w = ctx.measureText(ch).width;
      var jx = hashs(o.seed * 17 + i * 3) * 5, jy = hashs(o.seed * 29 + i * 5) * 7;
      var rot = hashs(o.seed * 41 + i * 7) * 0.09;
      ctx.save();
      ctx.translate(cx + w / 2 + jx, y + jy);
      ctx.rotate(rot);
      ctx.fillStyle = rgba(pass_col(p), chA);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(ch, 0, 0);
      ctx.restore();
      cx += w + (o.track || 4);
    }
    ctx.restore();
  }
  function pass_col(p) { return mix(p.hot, p.glow, 0.4); }

  /* ---------------------------------------------------------------- stamp */
  function stamp(str, x, y, o) {
    o = o || {};
    var p = pal();
    var size = o.size || 120;
    var a = o.alpha == null ? 1 : o.alpha;
    D.ctx().save();
    D.ctx().translate(x, y);
    D.ctx().rotate(o.rot == null ? -0.03 : o.rot);
    D.ctx().globalAlpha = a;
    var strk = o.track == null ? Math.round(size * 0.035) : Math.max(o.track, Math.round(size * 0.035));
    D.text(str, 0, 0, { size: size, kind: o.kind || 'cond', weight: 700, color: rgba(p.shadow, 0.95), tracking: strk });
    D.ctx().restore();
  }

  /* -------------------------------------------------------------- crosshair */
  function crosshair(x, y, r, o) {
    o = o || {};
    var p = pal();
    var a = (o.alpha == null ? 0.55 : o.alpha) * (0.4 + cur().trace);
    trace(a);
    D.lw(1);
    var g = o.gap || 10;
    D.line(x - r, y, x - g, y); D.line(x + g, y, x + r, y);
    D.line(x, y - r, x, y - g); D.line(x, y + g, x, y + r);
    D.circle(x, y, o.dot || 3); D.stroke();
    if (o.ticks) {
      for (var i = 0; i < 4; i++) {
        var ang = i * Math.PI / 2 + Math.PI / 4;
        D.line(x + Math.cos(ang) * (r + 6), y + Math.sin(ang) * (r + 6), x + Math.cos(ang) * (r + 14), y + Math.sin(ang) * (r + 14));
      }
    }
    if (o.label) D.text(o.label, x, y - r - 14, { size: 13, kind: 'mono', color: rgba(p.trace, 0.45), tracking: 1 });
  }

  /* ------------------------------------------------------------ misc marks */
  function bars(o) {
    o = o || {};
    var n = o.n || 24, cx = o.cx || 0, cy = o.cy || 0, gap = o.gap || 14, h = o.h || 60;
    D.lw(o.lw || 2);
    for (var i = 0; i < n; i++) {
      var x = cx + (i - (n - 1) / 2) * gap;
      var hh = h * (0.2 + hash((o.seed || 1) * 31 + i * 7));
      D.line(x, cy - hh, x, cy + hh);
    }
  }
  function rings(cx, cy, n, r0, dr, o) {
    o = o || {};
    var rot = o.rot || 0;
    D.lw(o.lw || 1.4);
    for (var i = 0; i < n; i++) {
      D.ctx().save();
      D.ctx().translate(cx, cy);
      D.ctx().rotate(rot + i * 0.18);
      D.ctx().beginPath();
      D.ctx().ellipse(0, 0, r0 + i * dr, (r0 + i * dr) * (o.squash || 0.7), 0, 0, TAU);
      D.ctx().stroke();
      D.ctx().restore();
    }
  }

  /* which typographic situation a cue gets (used by the object layer to keep
     its specimen card out of the line's way) */
  function lyricFamily(cue) { return (cue && cue.i || 0) % 7; }

  EM.M = {
    type: type, lyric: lyric, shadow: shadow, rim: rim, ink: ink, trace: trace, ember: ember, inv: inv,
    rig: rig, constel: constel, lattice: lattice, waves: waves, tangents: tangents,
    grow: grow, stack: stack, measure: measure, pierce: pierce, shard: shard,
    pen: pen, hand: hand, stamp: stamp, crosshair: crosshair, bars: bars, rings: rings,
    pal: pal, lamp: lamp, cur: cur, lyricFamily: lyricFamily
  };
})(window.EM);
