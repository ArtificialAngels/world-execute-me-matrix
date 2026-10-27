/* 30_world.js — the void: flat black, a faint data grid, dust, title, post.
   The shadow-play room is gone: there is no wall, no plaster, no lamp, no
   scorch. Nothing is lit; the film is emission on black.
   Draw order per frame: void -> plates -> title -> post.
   (There is no caption track any more: the lyric is set inside the picture by
   the typographic director in 35_motifs.js.) */
(function (EM) {
  'use strict';
  var clamp = EM.clamp, lerp = EM.lerp, mix = EM.mix, rgba = EM.rgba, hash = EM.hash, TAU = EM.TAU;
  var W = 1920, H = 1080;

  var grainA = null, grainB = null, bloomC = null, bloomX = null;

  function mk(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

  function ensure() {
    if (grainA) return;
    grainA = mk(256, 256); grainB = mk(256, 256);
    [[grainA, 1], [grainB, 2]].forEach(function (pair) {
      var c = pair[0], seed = pair[1], g = c.getContext('2d');
      var im = g.createImageData(256, 256), dd = im.data;
      for (var yy = 0; yy < 256; yy++) for (var xx = 0; xx < 256; xx++) {
        var k = (yy * 256 + xx) * 4;
        var v = hash(seed * 7919 + yy * 131 + xx * 17) * 255;
        dd[k] = dd[k + 1] = dd[k + 2] = v; dd[k + 3] = 255;
      }
      g.putImageData(im, 0, 0);
    });

    bloomC = mk(480, 270); bloomX = bloomC.getContext('2d');
  }

  /* ------------------------------------------------------------------ void */
  function wall(ctx, w, t) {
    ensure();
    var P = w.pal;
    ctx.save();
    /* flat black: no room, no wall, no paper — only the machine's dark */
    ctx.fillStyle = 'rgb(1,4,2)';
    ctx.fillRect(-W / 2, -H / 2, W, H);

    /* a very faint green breath so the black has a horizon */
    var amb = ctx.createRadialGradient(0, -80, 0, 0, -80, 1280);
    amb.addColorStop(0, rgba(P.wallMid, 0.20));
    amb.addColorStop(0.55, rgba(P.wallLo, 0.55));
    amb.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = amb;
    ctx.fillRect(-W / 2, -H / 2, W, H);

    /* the addressable grid: a data space, not a stage */
    ctx.strokeStyle = rgba(P.trace, 0.05);
    ctx.lineWidth = 1;
    ctx.beginPath();
    var step = 96, gx, gy;
    for (gx = -step * 10; gx <= step * 10; gx += step) { ctx.moveTo(gx, -H / 2); ctx.lineTo(gx, H / 2); }
    for (gy = -step * 6; gy <= step * 6; gy += step) { ctx.moveTo(-W / 2, gy); ctx.lineTo(W / 2, gy); }
    ctx.stroke();

    /* vignette: the frame falls into the dark */
    var vg = ctx.createRadialGradient(0, 0, H * 0.32, 0, 0, H * 1.06);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.88)');
    ctx.fillStyle = vg;
    ctx.fillRect(-W / 2, -H / 2, W, H);
    ctx.restore();
  }

  /* the apparatus rig (cable + drops) was part of the shadow-play set. It is
     gone: there is no physical room for it to hang in. */
  function rig() {}


  /* ------------------------------------------------------------------ heat */
  /* The wall used to take the hits. There is no wall now: the execution marks
     are drawn by the execution plates themselves, not scorched into plaster. */
  function burns() {}

  /* ------------------------------------------------------------------ dust */
  function dust(ctx, w, t) {
    var P = w.pal;
    var n = Math.floor(30 + w.dust * 110);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < n; i++) {
      var h1 = hash(i * 73 + 5), h2 = hash(i * 131 + 17), h3 = hash(i * 197 + 29);
      var drift = 26 + h3 * 40;
      var x = ((h1 * W * 1.4 + t * drift * (h2 - 0.5) * 2) % (W * 1.4)) - W * 0.7;
      var y = ((h2 * H * 1.4 - t * drift * 0.35) % (H * 1.4)) - H * 0.7;
      var twinkle = 0.35 + 0.65 * EM.wave(t * (0.6 + h3), 1.7 + h3 * 3.1, i * 0.37);
      var a = (0.05 + 0.16 * twinkle) * (0.35 + w.dust * 0.8);
      if (a < 0.012) continue;
      var r = 1.0 + h3 * 2.6;
      ctx.fillStyle = rgba(mix(P.trace, P.hot, h3 * 0.5), a);
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  /* a near layer: sparse specks, not soft glows (on paper they read as dust on
     the page, so they stay small and hard-edged) */
  function dustNear(ctx, w, t) {
    var P = w.pal;
    var n = Math.floor(10 + w.dust * 26);
    ctx.save();
    for (var i = 0; i < n; i++) {
      var h1 = hash(i * 311 + 7), h2 = hash(i * 173 + 3), h3 = hash(i * 97 + 11);
      var x = ((h1 * W * 1.8 + t * (40 + h3 * 90)) % (W * 1.8)) - W * 0.9;
      var y = ((h2 * H * 1.8 - t * (10 + h3 * 22)) % (H * 1.8)) - H * 0.9;
      var a = (0.10 + 0.16 * EM.wave(t * 0.7 + h3 * 6, 3.1)) * (0.35 + w.dust * 0.7);
      if (a < 0.02) continue;
      var r = 1.0 + h3 * 2.4;
      ctx.fillStyle = rgba(mix(P.glow, P.shadow, 0.4), a);
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  /* -------------------------------------------------------------- light fx */
  /* NO POINT LIGHT. The lamp is gone from the world: no core, no halo, no
     exposure on hits. Kept as an empty call so the engine still ticks it. */
  function light() {}

  /* --------------------------------------------------------------- caption */
  /* Chinese lyrics are gone on purpose: the film is English-type only, and the
     lyric line is now a typographic event inside the composition (35_motifs.js
     lyric director), not a caption under the picture. */
  function caption() {}

  /* ----------------------------------------------------------------- title */
  function title(ctx, w, t) {
    var a = clamp((t - (EM.AUDIO_END - 1.7)) / 1.0, 0, 1);
    if (a <= 0.01) return;
    ctx.save();
    ctx.globalAlpha = a * 0.9;
    EM.D.text('world.execute(me);', 0, -10, { size: 74, kind: 'cond', weight: 300, color: w.pal.paper, tracking: 8 });
    ctx.globalAlpha = a * 0.45;
    EM.D.text('Mili  ·  Miracle Milk', 0, 58, { size: 22, kind: 'mono', weight: 400, color: w.pal.paper, tracking: 5 });
    ctx.restore();
  }

  /* ------------------------------------------------------------------ post */
  function post(ctx, w, t) {
    ensure();
    var P = w.pal;
    /* bloom: quarter resolution, blurred, added back */
    bloomX.clearRect(0, 0, 480, 270);
    bloomX.drawImage(ctx.canvas, 0, 0, 480, 270);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.09 + w.burn * 0.08;
    ctx.filter = 'blur(9px) brightness(1.15)';
    ctx.drawImage(bloomC, -W / 2, -H / 2, W, H);
    ctx.filter = 'none';
    ctx.restore();

    /* grain */
    var g = (hash(Math.floor(t * 24) * 131) > 0.5) ? grainA : grainB;
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 0.14;
    var ox = -Math.floor(hash(Math.floor(t * 24)) * 256);
    var oy = -Math.floor(hash(Math.floor(t * 24) + 7) * 256);
    var pat = ctx.createPattern(g, 'repeat');
    ctx.translate(ox, oy);
    ctx.fillStyle = pat;
    ctx.fillRect(-W / 2 - ox, -H / 2 - oy, W, H);
    ctx.restore();

    /* gate weave is applied by the app; a faint flicker lives here */
    var fl = (hash(Math.floor(t * 12) * 17) - 0.5) * 0.05;
    ctx.save();
    ctx.globalAlpha = Math.max(0, fl);
    ctx.fillStyle = 'rgba(0,0,0,1)';
    ctx.fillRect(-W / 2, -H / 2, W, H);
    ctx.restore();
  }

  function lamp() {
    var t = EM.now ? EM.now() : 0;
    return (EM.World ? EM.World.at(t).lamp : { x: 0, y: 0, z: 900, lux: 1, k: 0.3 });
  }
  function pal() {
    var t = EM.now ? EM.now() : 0;
    return EM.World ? EM.World.at(t).pal : EM.PAL({ lamp: { lux: 1 }, warm: 1, love: 0, burn: 0, trace: 0.5 });
  }

  EM.W = {
    wall: wall, rig: rig, burns: burns, dust: dust, dustNear: dustNear, light: light,
    caption: caption, title: title, post: post,
    lamp: lamp, pal: pal, ensure: ensure
  };
})(window.EM);
