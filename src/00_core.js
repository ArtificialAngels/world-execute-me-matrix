/* 00_core.js — deterministic kernel: math, colour, clock, hash. No state. */
window.EM = window.EM || {};
(function (EM) {
  'use strict';

  EM.TAU = Math.PI * 2;
  EM.PI = Math.PI;
  EM.Settings = EM.Settings || { stageW: 1920, stageH: 1080, showCaption: true, showHud: true };
  if (typeof EM.AUDIO_END !== 'number') EM.AUDIO_END = 211.9;

  /* ---------------- math ---------------- */
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, u) { return a + (b - a) * u; }
  function inv(a, b, v) { return b === a ? 0 : clamp((v - a) / (b - a), 0, 1); }
  function ramp(a, b, v) { return b === a ? 0 : (v - a) / (b - a); }
  function smoothstep(u) { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); }
  function bump(u, width) { var d = Math.abs(u) / (width || 1); return d >= 1 ? 0 : Math.pow(1 - d, 2); }
  function wrap(v, n) { return ((v % n) + n) % n; }
  function dist(x1, y1, x2, y2) { return Math.hypot(x2 - x1, y2 - y1); }
  function wave(t, per, phase) { return 0.5 + 0.5 * Math.sin((t / (per || 1) + (phase || 0)) * EM.TAU); }
  function pulse(t, per, phase) { return Math.pow(1 - wave(t, per, phase), 3); }

  var E = {
    lin: function (u) { return u; },
    inQuad: function (u) { return u * u; },
    outQuad: function (u) { return 1 - (1 - u) * (1 - u); },
    inOutQuad: function (u) { return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; },
    inCubic: function (u) { return u * u * u; },
    outCubic: function (u) { return 1 - Math.pow(1 - u, 3); },
    inQuart: function (u) { return Math.pow(u, 4); },
    outQuart: function (u) { return 1 - Math.pow(1 - u, 4); },
    outQuint: function (u) { return 1 - Math.pow(1 - u, 5); },
    outExpo: function (u) { return u >= 1 ? 1 : 1 - Math.pow(2, -10 * u); },
    inExpo: function (u) { return u <= 0 ? 0 : Math.pow(2, 10 * u - 10); },
    inOutExpo: function (u) {
      if (u <= 0) return 0; if (u >= 1) return 1;
      return u < 0.5 ? Math.pow(2, 20 * u - 10) / 2 : (2 - Math.pow(2, -20 * u + 10)) / 2;
    },
    outBounce: function (u) {
      var n = 7.5625, d = 2.75;
      if (u < 1 / d) return n * u * u;
      if (u < 2 / d) { u -= 1.5 / d; return n * u * u + 0.75; }
      if (u < 2.5 / d) { u -= 2.25 / d; return n * u * u + 0.9375; }
      u -= 2.625 / d; return n * u * u + 0.984375;
    },
    outBack: function (u) { var c = 1.70158, c3 = c + 1; return 1 + c3 * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); },
    outElastic: function (u) {
      if (u === 0 || u === 1) return u;
      return Math.pow(2, -10 * u) * Math.sin((u * 10 - 0.75) * (EM.TAU / 3)) + 1;
    },
    hit: function (u) { return Math.pow(1 - clamp(u, 0, 1), 3); },
    pop: function (u) { u = clamp(u, 0, 1); return u < 0.2 ? E.outExpo(u / 0.2) : 1 + 0.08 * Math.sin((u - 0.2) * 14) * Math.pow(1 - u, 2); },
    breathe: function (u) { return 0.5 - 0.5 * Math.cos(clamp(u, 0, 1) * EM.PI); }
  };

  /* ---------------- deterministic hash ---------------- */
  function hash(n) {
    n = (n << 13) ^ n;
    n = (n * (n * n * 15731 + 789221) + 1376312589) & 0x7fffffff;
    return n / 0x7fffffff;
  }
  function hashs(n) { return hash(n) * 2 - 1; }
  function noise1(x) { var i = Math.floor(x); return lerp(hash(i), hash(i + 1), smoothstep(x - i)); }
  function noise2(x, y) {
    var xi = Math.floor(x), yi = Math.floor(y);
    var u = smoothstep(x - xi), v = smoothstep(y - yi);
    var a = hash(xi * 374761393 + yi * 668265263);
    var b = hash((xi + 1) * 374761393 + yi * 668265263);
    var c = hash(xi * 374761393 + (yi + 1) * 668265263);
    var d = hash((xi + 1) * 374761393 + (yi + 1) * 668265263);
    return lerp(lerp(a, b, u), lerp(c, d, u), v);
  }
  function pick(seed, list) { return list[Math.floor(hash(seed) * list.length) % list.length]; }
  function wobble(seed, amp) { return hashs(seed) * (amp || 1); }

  /* ---------------- colour ---------------- */
  function parse(css) {
    if (typeof css !== 'string' || css.charAt(0) !== 'r') return null;
    var a = css.indexOf('('), b = css.indexOf(')');
    if (a < 0 || b < 0) return null;
    var p = css.slice(a + 1, b).split(',');
    return [+p[0], +p[1], +p[2]];
  }
  function rgba(c, a) {
    if (a === undefined) a = 1;
    if (typeof c === 'string') return c;
    return 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + a + ')';
  }
  function mix(a, b, u) {
    u = clamp(u, 0, 1);
    return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
  }
  function shade(c, u) { return [c[0] * u, c[1] * u, c[2] * u]; }
  function hex(c) {
    function h(v) { return ('0' + (clamp(v, 0, 255) | 0).toString(16)).slice(-2); }
    return '#' + h(c[0]) + h(c[1]) + h(c[2]);
  }
  function lum(c) {
    function f(v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
  }

  /* ---------------- palette: black glass, one phosphor green, red only for the execution ----------------
     No wall, no lamp, no shadows. "shadow" is no longer something dark thrown by
     something bright — it is the phosphor ink every plate draws with, so it is
     the brightest channel here. Nothing is lit; everything is emission. */
  EM.PAL = function (w) {
    var love = w ? w.love : 0, burn = w ? w.burn : 0;
    var tr = w ? w.trace : 0.5;
    var wallHi = [30, 84, 50];              /* faint data-space glow, not a lit wall */
    var wallMid = [14, 42, 26];
    var wallLo = [2, 8, 5];
    var shadow = mix([118, 246, 166], [158, 255, 196], love * 0.7);
    var hot = mix([210, 255, 232], [238, 255, 246], love * 0.5);
    var glow = [0, 255, 108];
    var trace = mix([96, 240, 255], [150, 255, 235], love * 0.4);
    var red = [255, 64, 46];
    var ink = mix([4, 12, 8], [2, 8, 5], burn);
    return {
      wallHi: wallHi, wallMid: wallMid, wallLo: wallLo,
      shadow: shadow, hot: hot, glow: glow, trace: trace, red: red,
      paper: [176, 255, 204], ink: ink,
      wall: function (u) { return mix(wallLo, wallHi, clamp(u, 0, 1)); },
      dim: function (c, a) { return mix(wallLo, c, clamp(a, 0, 1)); },
      tr: function (a) { return rgba(trace, a === undefined ? tr : a); },
      sh: function (a) { return rgba(shadow, a === undefined ? 1 : a); }
    };
  };

  /* ---------------- beat clock (from analysed audio) ---------------- */
  EM.ONSETS = EM.ONSETS || [];
  var _oi = -1;
  function onsetIndex(t) {
    var a = EM.ONSETS;
    if (!a.length) return -1;
    var ms = t * 1000, lo = 0, hi = a.length - 1, best = -1;
    if (_oi >= 0 && _oi < a.length && a[_oi][0] <= ms && (_oi + 1 >= a.length || a[_oi + 1][0] > ms)) return _oi;
    while (lo <= hi) {
      var mid = (lo + hi) >> 1;
      if (a[mid][0] <= ms) { best = mid; lo = mid + 1; } else hi = mid - 1;
    }
    _oi = best;
    return best;
  }
  function onsetPulse(t, win) {
    win = win || 0.22;
    var i = onsetIndex(t);
    if (i < 0) return 0;
    var dt = t - EM.ONSETS[i][0] / 1000;
    if (dt < 0 || dt > win) return 0;
    return Math.pow(1 - dt / win, 2.4);
  }
  function onsetNear(t, win) {
    win = win || 0.12;
    var i = onsetIndex(t);
    if (i < 0) return null;
    var best = Math.abs(t - EM.ONSETS[i][0] / 1000), bi = i;
    if (i + 1 < EM.ONSETS.length) {
      var d2 = Math.abs(EM.ONSETS[i + 1][0] / 1000 - t);
      if (d2 < best) { best = d2; bi = i + 1; }
    }
    if (best > win) return null;
    var o = EM.ONSETS[bi];
    return { t: o[0] / 1000, f: o[1], vel: o[2], energy: o[3], i: bi };
  }
  function onsetsBetween(a, b) {
    var out = [], arr = EM.ONSETS;
    for (var i = 0; i < arr.length; i++) {
      var tt = arr[i][0] / 1000;
      if (tt >= a) { if (tt <= b) out.push(arr[i]); else break; }
    }
    return out;
  }
  function beatAt(t) { return onsetIndex(t) + 1; }
  function beatPeriod(t, fb) {
    var i = onsetIndex(t), a = EM.ONSETS;
    if (i < 1 || i >= a.length) return fb || 0.46;
    var d = (a[i][0] - a[i - 1][0]) / 1000;
    return (d > 0.05 && d < 2) ? d : (fb || 0.46);
  }
  function energyAt(t, win) {
    win = win || 0.5;
    var arr = EM.WAVE || [];
    if (!arr.length) return 0;
    var dur = EM.AUDIO_END, n = arr.length;
    var i0 = clamp(Math.floor((t - win) / dur * n), 0, n - 1);
    var i1 = clamp(Math.floor(t / dur * n), 0, n - 1);
    var s = 0, c = 0;
    for (var i = Math.min(i0, i1); i <= Math.max(i0, i1); i++) { s += arr[i]; c++; }
    return c ? s / c : 0;
  }

  /* ---------------- format ---------------- */
  function pad(n, w) { var s = String(Math.floor(Math.abs(n))); while (s.length < w) s = '0' + s; return s; }
  function fmtTime(sec) {
    sec = Math.max(0, sec);
    var m = Math.floor(sec / 60), s = Math.floor(sec % 60), ms = Math.round((sec - Math.floor(sec)) * 1000);
    if (ms === 1000) { ms = 0; s++; if (s === 60) { s = 0; m++; } }
    return m + ':' + pad(s, 2) + '.' + pad(ms, 3);
  }
  function fmtClock(sec) { sec = Math.max(0, sec); return Math.floor(sec / 60) + ':' + pad(Math.floor(sec % 60), 2); }

  EM.clamp = clamp; EM.lerp = lerp; EM.inv = inv; EM.ramp = ramp;
  EM.smoothstep = smoothstep; EM.bump = bump; EM.wrap = wrap; EM.dist = dist;
  EM.wave = wave; EM.pulse = pulse;
  EM.E = E; EM.ease = E;
  EM.hash = hash; EM.hashs = hashs; EM.noise1 = noise1; EM.noise2 = noise2;
  EM.wobble = wobble; EM.pick = pick;
  EM.rgba = rgba; EM.parseCSS = parse; EM.mix = mix; EM.shade = shade; EM.hex = hex; EM.lum = lum;
  EM.onsetIndex = onsetIndex; EM.onsetPulse = onsetPulse; EM.onsetNear = onsetNear;
  EM.onsetsBetween = onsetsBetween; EM.beatAt = beatAt; EM.beatPeriod = beatPeriod;
  EM.energyAt = energyAt;
  EM.fmtTime = fmtTime; EM.fmtClock = fmtClock; EM.pad = pad;
})(window.EM);
