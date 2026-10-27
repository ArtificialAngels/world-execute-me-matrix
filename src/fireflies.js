/* src/fireflies.js — sparse drifting motes; they dim and fall at the end.
   Deterministic: driven by the film clock, not wall time.
   On the paper theme they are drawn as bright specks: the compositor inverts the
   layer, so they land on the page as tiny dark dust marks (multiplied). */
(function () {
  'use strict';
  if (document.getElementById('flies')) return;
  var reduce = false;
  try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  var cv = document.createElement('canvas');
  cv.id = 'flies';
  document.body.appendChild(cv);
  var ctx = cv.getContext('2d');
  var W = 0, H = 0, DPR = 1;

  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.floor(W * DPR); cv.height = Math.floor(H * DPR);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  var N = reduce ? 12 : 34;
  var flies = [];
  function h(n) { n = (n << 13) ^ n; n = (n * (n * n * 15731 + 789221) + 1376312589) & 0x7fffffff; return n / 0x7fffffff; }
  function build() {
    flies = [];
    for (var i = 0; i < N; i++) {
      var r = h(i * 3 + 1), r2 = h(i * 7 + 2), r3 = h(i * 11 + 3), r4 = h(i * 13 + 4), r5 = h(i * 17 + 5);
      flies.push({
        cx: 0.06 + r * 0.88, cy: 0.08 + r2 * 0.84,
        ax: 0.02 + r3 * 0.10, ay: 0.02 + r4 * 0.09,
        wx: 0.05 + r5 * 0.12, wy: 0.04 + r * 0.11,
        px: r2 * 6.283, py: r3 * 6.283,
        size: 1.6 + r4 * 3.4,
        tw: 0.8 + r5 * 2.4,
        ph: r * 6.283,
        k: 0.6 + r2 * 0.9
      });
    }
  }

  /* the one clock: the film's t when it exists, else the audio element */
  function filmTime() {
    if (window.EM && EM.cur && typeof EM.cur.t === 'number' && EM.cur.t > 0) return EM.cur.t;
    var a = document.getElementById('audio');
    return (a && a.currentTime > 0) ? a.currentTime : 0;
  }

  function frame() {
    var ft = filmTime();
    var END = 211.912857;
    /* last 10s: they slow down, start falling, then go dark one by one */
    var falling = ft > 202.5;
    var out = ft > 207.4 ? Math.max(0, 1 - (ft - 207.4) / (END - 207.4)) : 1;
    var fall = falling ? Math.pow(ft - 202.5, 2) * 10 : 0;
    var slow = falling ? Math.max(0.12, 1 - (ft - 202.5) * 0.18) : 1;

    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < flies.length; i++) {
      var f = flies[i];
      var x = (f.cx + Math.sin(ft * f.wx * slow + f.px) * f.ax + Math.sin(ft * f.wx * 2.3 + f.px * 1.7) * f.ax * 0.35) * W;
      var y = (f.cy + Math.sin(ft * f.wy * slow + f.py) * f.ay + Math.cos(ft * f.wy * 1.9 + f.py * 1.3) * f.ay * 0.4) * H + fall * f.k;
      var blink = Math.pow(0.5 + 0.5 * Math.sin(ft * f.tw + f.ph), 3);
      var a = out * (0.30 + 0.70 * blink) * (0.55 + 0.45 * Math.sin(ft * 0.7 + f.ph));
      if (a <= 0.02 || y > H + 60) continue;
      var r = (0.7 + f.size * 0.55) * (falling ? Math.max(0.3, out) : 1) * (0.7 + 0.6 * blink);
      ctx.globalAlpha = Math.min(1, a);
      ctx.fillStyle = 'rgb(20,66,128)';          /* inverted to dark ink by the compositor */
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(frame);
  }

  window.addEventListener('resize', resize);
  resize(); build();
  requestAnimationFrame(frame);
})();
