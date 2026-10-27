/* 60_app.js — the engine: one clock, one frame loop, the transport, the debug
   overlay, and a headless hook so frames can be rendered and screenshotted. */
(function (EM) {
  'use strict';
  var clamp = EM.clamp, rgba = EM.rgba;

  var VW = 1920, VH = 1080;
  var view = document.getElementById('view');
  var ctx = view.getContext('2d', { alpha: false });
  var audio = document.getElementById('audio');
  var startEl = document.getElementById('start');
  var toastEl = document.getElementById('toast');
  var stateEl = document.getElementById('state');
  var clockEl = document.getElementById('clock');
  var fillEl = document.getElementById('fill');
  var headEl = document.getElementById('head');
  var barEl = document.getElementById('bar');
  var waveEl = document.getElementById('wave');
  var shell = document.getElementById('shell');
  var fallbackEl = document.getElementById('fallback');

  EM.D.bind(ctx, VW, VH);

  var SYNC = 0;
  var t = 0, raw = 0, running = false, ended = false, audioOK = true;
  var fallbackClock = 0, fallbackAt = 0;
  var started = false;
  var fps = 60, lastFrame = 0, frameMs = 16;
  var debug = false;
  var overrideCue = null;
  var faultsShown = 0;
  var reduce = false;
  try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  /* ---------------------------------------------------------------- audio */
  var CANDIDATES = [
    'Mili - world.execute(me);.mp3',
    'Mili - world.execute (me) ;.mp3',
    'Mili - world.execute(me) ;.mp3',
    'Mili - world.execute (me);.mp3',
    'world.execute(me);.mp3',
    'audio.mp3'
  ];
  var cand = 0;
  function loadAudio() {
    if (cand >= CANDIDATES.length) { audioOK = false; showFallback('未找到音频文件'); return; }
    var name = CANDIDATES[cand++];
    audio.src = encodeURI(name);
    audio.load();
  }
  loadAudio();

  audio.addEventListener('error', function () { loadAudio(); });
  audio.addEventListener('loadedmetadata', function () {
    audioOK = true;
  });
  audio.addEventListener('ended', function () { ended = true; running = false; setState('END'); });
  audio.addEventListener('play', function () { running = true; setState('PLAYING'); });
  audio.addEventListener('pause', function () { running = false; setState(t > 0 ? 'PAUSED' : 'READY'); });

  function showFallback(msg) {
    if (!fallbackEl) return;
    fallbackEl.textContent = msg + ' — 放在 index.html 同级即可';
    fallbackEl.classList.add('on');
  }
  function setState(s) { if (stateEl) stateEl.textContent = s; }

  /* --------------------------------------------------------------- clock */
  function now() {
    if (audioOK && audio && audio.readyState >= 2 && !audio.error) {
      raw = audio.currentTime || 0;
      return raw + SYNC;
    }
    if (running) fallbackClock += (performance.now() - fallbackAt) / 1000;
    fallbackAt = performance.now();
    raw = fallbackClock;
    return fallbackClock + SYNC;
  }

  function seek(sec) {
    sec = clamp(sec, 0, EM.AUDIO_END);
    if (audioOK && audio && audio.readyState >= 1) {
      try { audio.currentTime = sec; raw = sec; } catch (e) {}
    }
    fallbackClock = sec; fallbackAt = performance.now();
    render(sec + SYNC);
  }

  /* --------------------------------------------------------------- frame */
  function render(tt) {
    EM.cur = EM.World.at(tt);
    var w = EM.cur;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.filter = 'none';
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#050403';
    ctx.fillRect(0, 0, VW, VH);

    /* gate weave: a film-print wobble, deterministic from t */
    var wx = Math.sin(tt * 0.31) * 0.55 + Math.sin(tt * 1.07 + 1.3) * 0.25;
    var wy = Math.cos(tt * 0.27 + 0.4) * 0.45;
    ctx.save();
    ctx.translate(VW / 2 + wx, VH / 2 + wy);
    EM.W.wall(ctx, w, tt);
    EM.W.rig(ctx, w, tt);
    EM.W.burns(ctx, w, tt);
    var cue = overrideCue || EM.Lyrics.at(tt);
    if (cue) EM.drawSequence(cue, w, tt);
    EM.W.dust(ctx, w, tt);
    EM.W.dustNear(ctx, w, tt);
    EM.W.light(ctx, w, tt);
    EM.W.title(ctx, w, tt);
    EM.W.post(ctx, w, tt);
    ctx.restore();

    if (debug) drawDebug(tt, w, cue);
    updateTransport(tt);
  }

  function drawDebug(tt, w, cue) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = 'rgba(0,0,0,0.66)';
    ctx.fillRect(20, 20, 620, 236);
    ctx.fillStyle = '#9fe8f4';
    ctx.font = '18px Consolas, monospace';
    var lines = [
      't        ' + tt.toFixed(3) + '   raw ' + raw.toFixed(3) + '  sync ' + (SYNC * 1000).toFixed(0) + 'ms',
      'scene    ' + (cue ? cue.scene : '-') + '  p=' + (cue ? ((tt - cue.t) / cue.dur).toFixed(3) : '-'),
      'line     ' + (cue ? cue.text : '-'),
      'light    none (no point light, no projector, no wall)',
      'state    order ' + w.order.toFixed(2) + ' chaos ' + w.chaos.toFixed(2) + ' love ' + w.love.toFixed(2) + ' trace ' + w.trace.toFixed(2),
      'audio    ' + (audioOK ? ('ok ' + (audio.readyState)) : 'fallback') + '   fps ' + fps.toFixed(0) + '  frame ' + frameMs.toFixed(1) + 'ms',
      'plates   ' + EM.plates().length + '  faults ' + EM.sceneFaultCount(),
      'end      ' + EM.AUDIO_END.toFixed(3) + 's'
    ];
    for (var i = 0; i < lines.length; i++) ctx.fillText(lines[i], 36, 52 + i * 27);
    ctx.restore();
  }

  function updateTransport(tt) {
    var u = clamp(tt / EM.AUDIO_END, 0, 1);
    if (fillEl) fillEl.style.width = (u * 100) + '%';
    if (headEl) headEl.style.left = (u * 100) + '%';
    if (clockEl) clockEl.textContent = EM.fmtTime(tt);
  }

  /* ---------------------------------------------------------------- loop */
  var last = 0;
  function tick(ts) {
    var dt = last ? (ts - last) : 16.7;
    last = ts;
    frameMs = frameMs * 0.9 + Math.min(dt, 60) * 0.1;
    fps = fps * 0.9 + (1000 / Math.max(8, dt)) * 0.1;
    t = now();
    if (t > EM.AUDIO_END + 0.6) {
      t = EM.AUDIO_END;
      if (audioOK && audio && !audio.paused) { try { audio.pause(); } catch (e) {} }
    }
    render(t);
    requestAnimationFrame(tick);
  }

  /* ------------------------------------------------------------- controls */
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('on');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { toastEl.classList.remove('on'); }, 1200);
  }
  function setOffset(v) { SYNC = clamp(v, -2, 2); toast('sync ' + (SYNC * 1000).toFixed(0) + ' ms'); }

  function togglePlay() {
    if (!started) { begin(); return; }
    if (audioOK && audio && audio.readyState >= 1) {
      if (audio.paused) { audio.play().catch(function () { audioOK = false; running = true; fallbackAt = performance.now(); }); }
      else audio.pause();
    } else {
      running = !running; fallbackAt = performance.now();
      setState(running ? 'PLAYING' : 'PAUSED');
    }
  }
  function begin() {
    started = true;
    if (startEl) startEl.classList.add('off');
    if (audioOK) {
      audio.volume = 0.9;
      var pr = audio.play();
      if (pr && pr.catch) pr.catch(function () { audioOK = false; running = true; fallbackAt = performance.now(); showFallback('音频无法自动播放，使用内部时钟'); });
    } else { running = true; fallbackAt = performance.now(); }
  }

  document.addEventListener('keydown', function (e) {
    var step = 5 * (e.shiftKey ? 0.2 : 1);
    switch (e.key) {
      case ' ': e.preventDefault(); togglePlay(); break;
      case 'ArrowLeft': seek((audioOK ? audio.currentTime : raw) - step); e.preventDefault(); break;
      case 'ArrowRight': seek((audioOK ? audio.currentTime : raw) + step); e.preventDefault(); break;
      case ',': setOffset(SYNC - (e.shiftKey ? 0.001 : 0.01)); break;
      case '.': setOffset(SYNC + (e.shiftKey ? 0.001 : 0.01)); break;
      case '/': setOffset(0); break;
      case 'r': case 'R': seek(0); if (audioOK) { audio.play().catch(function () {}); } break;
      case 'f': case 'F': toggleFull(); break;
      case 'h': case 'H': shell.classList.toggle('bare'); break;
      case 'd': case 'D': debug = !debug; break;
      case 'ArrowUp': if (audioOK) { audio.volume = Math.min(1, audio.volume + 0.05); toast('vol ' + Math.round(audio.volume * 100) + '%'); } e.preventDefault(); break;
      case 'ArrowDown': if (audioOK) { audio.volume = Math.max(0, audio.volume - 0.05); toast('vol ' + Math.round(audio.volume * 100) + '%'); } e.preventDefault(); break;
      case 'Home': seek(0); break;
      case 'End': seek(EM.AUDIO_END - 0.1); break;
    }
  });

  function toggleFull() {
    if (!document.fullscreenElement) { shell.requestFullscreen && shell.requestFullscreen(); }
    else { document.exitFullscreen && document.exitFullscreen(); }
  }

  /* scrub */
  if (barEl) {
    var dragging = false;
    function scrubb(e) {
      var r = barEl.getBoundingClientRect();
      var u = clamp((e.clientX - r.left) / r.width, 0, 1);
      seek(u * EM.AUDIO_END);
    }
    barEl.addEventListener('pointerdown', function (e) { dragging = true; barEl.setPointerCapture(e.pointerId); scrubb(e); });
    barEl.addEventListener('pointermove', function (e) { if (dragging) scrubb(e); });
    barEl.addEventListener('pointerup', function () { dragging = false; });
  }
  document.getElementById('btn-play').addEventListener('click', togglePlay);
  document.getElementById('btn-replay').addEventListener('click', function () { seek(0); if (audioOK) audio.play().catch(function () {}); });
  document.getElementById('btn-full').addEventListener('click', toggleFull);
  var vol = document.getElementById('vol');
  if (vol) vol.addEventListener('input', function () { if (audioOK) audio.volume = +vol.value; });
  if (startEl) startEl.addEventListener('click', begin);
  document.addEventListener('dblclick', toggleFull);

  /* mouse idle -> bare chrome */
  var idleT = null;
  function wake() {
    shell.classList.add('awake');
    clearTimeout(idleT);
    idleT = setTimeout(function () { shell.classList.remove('awake'); }, 2600);
  }
  document.addEventListener('pointermove', wake);
  wake();

  /* -------------------------------------------------------------- waveform */
  (function drawWave() {
    if (!waveEl || !EM.WAVE) return;
    var c = waveEl.getContext('2d');
    var n = EM.WAVE.length, w = waveEl.width, h = waveEl.height;
    c.clearRect(0, 0, w, h);
    c.fillStyle = 'rgba(26,70,130,0.55)';
    for (var i = 0; i < n; i++) {
      var x = i / n * w;
      var bh = Math.max(1, EM.WAVE[i] * h * 0.9);
      c.fillRect(x, (h - bh) / 2, Math.max(1, w / n - 0.6), bh);
    }
  })();

  /* ---------------------------------------------------------------- boot */
  function fit() {
    var pad = 0;
    var s = Math.min((window.innerWidth - pad) / VW, (window.innerHeight - pad) / VH);
    view.style.width = (VW * s) + 'px';
    view.style.height = (VH * s) + 'px';
  }
  window.addEventListener('resize', fit);
  fit();
  render(0);

  /* headless / still hooks */
  EM.MV = {
    seek: function (sec) { seek(sec); },
    renderScene: function (scene, tt, p, text) {
      var base = tt - p;
      var fake = { i: 0, t: base, text: text || '', scene: scene, repeat: 0, bleed: true, cn: '', dur: 1, end: base + 1, held: false };
      overrideCue = fake;
      t = tt;
      render(tt);
      return true;
    },
    renderAt: function (sec) { t = sec; render(sec); return sec; },
    snapshotAt: function (sec) { t = sec; render(sec); return view.toDataURL('image/png'); },
    end: function () { return EM.AUDIO_END; },
    faults: function () { return EM.sceneFaults(); },
    plates: function () { return EM.plates(); },
    audioOK: function () { return audioOK; },
    start: begin
  };

  var q = new URLSearchParams(location.search);

  if (q.get('probe') === '1') {
    audio.volume = 0;
    audio.play().catch(function () {});
    setTimeout(function () {
      document.title = 'AUDIO ' + (audio.error ? ('ERR' + audio.error.code) :
        ('OK rs=' + audio.readyState + ' dur=' + (audio.duration || 0).toFixed(2) + ' t=' + (audio.currentTime || 0).toFixed(2) +
          ' faults=' + EM.sceneFaultCount() + ' plates=' + EM.plates().length));
    }, 3000);
  }
  if (q.get('scene')) {
    /* single-plate review mode: ?still=1&scene=thm.sine&p=0.5&t=40 */
    audioOK = false;
    shell.classList.add('bare', 'still');
    if (startEl) startEl.classList.add('off');
    var base = q.get('t') ? +q.get('t') : 10;
    var pp = q.get('p') ? +q.get('p') : 0.5;
    var fake = { i: 0, t: base, text: q.get('text') || '', scene: q.get('scene'), repeat: 0, bleed: true, cn: '', dur: 1, end: base + 1, held: false };
    overrideCue = fake;
    EM.MV.renderAt(base + pp);
    window.addEventListener('resize', function () { EM.MV.renderAt(base + pp); });
  } else if (q.get('still') === '1') {
    audioOK = false;
    shell.classList.add('bare', 'still');
    if (startEl) startEl.classList.add('off');
    /* a still is a still: kill the fading chrome so two loads of the same t are
       byte-identical (the overlay transition used to leak into screenshots) */
    var chrome = ['start', 'hud', 'ctrl'];
    for (var ci = 0; ci < chrome.length; ci++) {
      var el = document.getElementById(chrome[ci]);
      if (el) el.style.display = 'none';
    }
    EM.MV.renderAt(q.get('t') ? +q.get('t') : 0);
    window.addEventListener('resize', function () { EM.MV.renderAt(q.get('t') ? +q.get('t') : 0); });
  } else {
    requestAnimationFrame(tick);
    /* ?autostart=1 begins playback on load (used for screenings / kiosk) */
    if (q.get('autostart') === '1') {
      setTimeout(function () {
        try {
          begin();
          if (audioOK && audio && audio.paused) audio.play().catch(function () {});
        } catch (e) {}
      }, 420);
    }
  }
})(window.EM);
