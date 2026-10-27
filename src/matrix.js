/* src/matrix.js — green code rain + math/function glyph overlay for the matrix skin.
   Deterministic: every frame is a function of the film clock (EM.cur.t), never of
   wall time or Math.random, so the same t always yields the same still. */
(function () {
  'use strict';
  if (document.getElementById('matrix')) return;

  var cv = document.createElement('canvas');
  cv.id = 'matrix';
  document.body.appendChild(cv);
  var crt = document.createElement('div');
  crt.id = 'crt';
  document.body.appendChild(crt);

  var ctx = cv.getContext('2d');
  var W = 0, H = 0, DPR = 1;

  function h(n) { n = (n << 13) ^ n; n = (n * (n * n * 15731 + 789221) + 1376312589) & 0x7fffffff; return n / 0x7fffffff; }
  function wrap(v, n) { return ((v % n) + n) % n; }

  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.floor(W * DPR); cv.height = Math.floor(H * DPR);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    buildColumns();
  }

  var GLYPHS = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789' +
    '∑∫∂∇λπ∞√≈≤≥∈∅≠∀∃±×÷·θΔΩμσΨΦ' +
    '{}[]()<>=+-*/;,:._|\\#@$%&!?^~';
  var COLS = 0, colW = 20, drops = [];
  function buildColumns() {
    colW = W < 900 ? 16 : 20;
    COLS = Math.ceil(W / colW);
    drops = [];
    for (var i = 0; i < COLS; i++) {
      drops.push({
        y0: h(i * 13 + 1) * H,
        speed: 60 + h(i * 7 + 3) * 180,
        len: 6 + Math.floor(h(i * 11 + 5) * 22),
        seed: h(i * 17 + 7) * 1000
      });
    }
  }

  var FORMULAS = [
    'f(t) = sin(2πft)',
    'E = mc²',
    '(x²+y²−1)³ − x²y³ = 0',
    'lim  x→∞  1/x = 0',
    '∑  y·log(ŷ)',
    '∂L/∂θ = 0',
    'if (can) then execute(me);',
    'while (alive) { love(); }',
    'λx. x x',
    'v = Δs / Δt',
    'P(A|B) = P(B|A)P(A)/P(B)',
    'a² + b² = c²',
    '∫ f dx = F + C',
    '∇·E = ρ/ε₀',
    'world.execute(me);',
    'return 0; // end'
  ];
  var anchors = [];
  function buildAnchors() {
    anchors = [];
    var pad = 60;
    for (var i = 0; i < FORMULAS.length; i++) {
      anchors.push({
        x: pad + h(i * 31 + 11) * (W - pad * 2),
        y: pad + h(i * 43 + 13) * (H - pad * 2),
        s: 14 + h(i * 57 + 17) * 12,
        a: 0.04 + h(i * 61 + 19) * 0.09,
        ph: h(i * 71 + 23) * 6.28,
        f: FORMULAS[i]
      });
    }
  }

  /* the one clock: the film's t when it exists, else the audio element */
  function filmTime() {
    if (window.EM && EM.cur && typeof EM.cur.t === 'number' && EM.cur.t > 0) return EM.cur.t;
    var a = document.getElementById('audio');
    return (a && a.currentTime > 0) ? a.currentTime : 0;
  }

  function drawGlyphs(t) {
    ctx.font = '600 ' + colW + 'px "MS Gothic", Consolas, monospace';
    ctx.textBaseline = 'top';
    var span = H + 28 * colW;
    for (var i = 0; i < COLS; i++) {
      var d = drops[i];
      var head = wrap(d.y0 + t * d.speed, span) - (d.len + 2) * colW;
      for (var k = 0; k < d.len; k++) {
        var y = head - k * colW;
        if (y < -colW || y > H) continue;
        var gi = Math.floor(Math.abs(Math.sin(d.seed + i * 13.7 + k * 3.1 + t * 0.7)) * GLYPHS.length) % GLYPHS.length;
        var ch = GLYPHS.charAt(gi);
        if (k === 0) { ctx.fillStyle = 'rgba(10,44,96,0.9)'; ctx.shadowColor = 'rgba(24,88,170,0.45)'; ctx.shadowBlur = 6; }
        else { ctx.fillStyle = 'rgba(20,70,140,' + (0.30 * (1 - k / d.len)).toFixed(3) + ')'; ctx.shadowBlur = 0; }
        ctx.fillText(ch, i * colW, y);
      }
      ctx.shadowBlur = 0;
    }
  }

  function drawFormulas(t) {
    ctx.textBaseline = 'alphabetic';
    for (var i = 0; i < anchors.length; i++) {
      var a = anchors[i];
      var alpha = a.a * (0.6 + 0.4 * Math.sin(t * 0.8 + a.ph));
      if (alpha <= 0.01) continue;
      ctx.font = '500 ' + a.s + 'px "Cascadia Mono", Consolas, monospace';
      ctx.fillStyle = 'rgba(26,76,148,' + alpha.toFixed(3) + ')';
      ctx.fillText(a.f, a.x, a.y + Math.sin(t * 0.4 + a.ph) * 6);
    }
  }

  function drawHud(t) {
    var lines = [
      '> world.execute(me);',
      '  ├─ t        = ' + t.toFixed(3) + 's',
      '  ├─ f(x)     = sin(2πx)',
      '  ├─ Σ glyphs = ' + (COLS * 17),
      '  └─ state    = RUNNING'
    ];
    ctx.font = '500 13px "Cascadia Mono", Consolas, monospace';
    ctx.textAlign = 'left';
    for (var i = 0; i < lines.length; i++) {
      ctx.fillStyle = 'rgba(20,70,140,' + (i === 0 ? 0.75 : 0.32) + ')';
      ctx.fillText(lines[i], 26, H - 176 + i * 18);
    }
    /* corner math symbols */
    var sym = '∫∂∇λπ∞√≈';
    ctx.font = '600 22px "MS Gothic", monospace';
    for (var s = 0; s < sym.length; s++) {
      var x = W - 40 - (s % 4) * 34, y = 40 + Math.floor(s / 4) * 34;
      ctx.fillStyle = 'rgba(20,70,140,' + (0.25 + 0.2 * Math.sin(t * 1.3 + s)).toFixed(3) + ')';
      ctx.fillText(sym[s], x, y);
    }
  }

  function frame() {
    var t = filmTime();
    /* last 12 seconds: the rain thins out so the fireflies can be seen falling */
    var fade = t > 199.5 ? Math.max(0.18, 1 - (t - 199.5) / 12) : 1;
    cv.style.opacity = String(fade);
    ctx.clearRect(0, 0, W, H);
    drawGlyphs(t);
    drawFormulas(t);
    drawHud(t);
    requestAnimationFrame(frame);
  }

  window.addEventListener('resize', function () { resize(); buildAnchors(); });
  resize(); buildAnchors();
  requestAnimationFrame(frame);
})();
