/* 20_lyrics.js — cue runtime. Cue rows: [t, text, scene, repeat, bleed, cn] */
(function (EM) {
  'use strict';
  var RAW = EM.CUES || [];
  var END = EM.AUDIO_END;
  var C = [];
  for (var i = 0; i < RAW.length; i++) {
    var r = RAW[i];
    C.push({
      i: i, t: r[0], text: r[1], scene: r[2], repeat: r[3] || 0,
      bleed: r.length < 5 ? true : r[4] !== 0,
      cn: r[5] || '', end: END, dur: 0, held: false
    });
  }
  for (i = 0; i < C.length; i++) {
    C[i].end = (i + 1 < C.length) ? C[i + 1].t : END;
    C[i].dur = Math.max(0.12, C[i].end - C[i].t);
  }

  /* held cues: no plate of their own; the previous owning shot runs through.
     EM.HOLD = { sceneId: true } comes from the generated timeline. */
  var HOLD = EM.HOLD || {};
  for (i = 0; i < C.length; i++) C[i].held = !!HOLD[C[i].scene] || C[i].scene == null;
  for (i = 0; i < C.length; i++) {
    if (C[i].held) continue;
    var j = i + 1;
    while (j < C.length && C[j].held) j++;
    if (j > i + 1) {
      C[i].end = (j < C.length) ? C[j].t : END;
      C[i].dur = Math.max(0.12, C[i].end - C[i].t);
    }
  }
  var OWNER = new Array(C.length), last = 0;
  for (i = 0; i < C.length; i++) { if (!C[i].held) last = i; OWNER[i] = last; }

  function indexAt(t) {
    if (!C.length) return -1;
    var lo = 0, hi = C.length - 1, best = 0;
    while (lo <= hi) {
      var mid = (lo + hi) >> 1;
      if (C[mid].t <= t + 1e-6) { best = mid; lo = mid + 1; } else hi = mid - 1;
    }
    return OWNER[best];
  }
  function at(t) { return C[indexAt(t)]; }

  var BY = Object.create(null);
  for (i = 0; i < C.length; i++) BY[C[i].scene] = C[i];

  var TOTAL = Object.create(null);
  for (i = 0; i < C.length; i++) {
    var key = C[i].text.replace(/[^A-Za-z]/g, '').toUpperCase() || ('_' + i);
    TOTAL[key] = (TOTAL[key] || 0) + 1;
  }
  function repeatTotal(cue) {
    if (!cue) return 1;
    var key = cue.text.replace(/[^A-Za-z]/g, '').toUpperCase() || ('_' + cue.i);
    return TOTAL[key] || 1;
  }
  function next(t) { var i = indexAt(t); return (i + 1 < C.length) ? C[i + 1] : null; }

  EM.Lyrics = { cues: C, count: C.length, at: at, indexAt: indexAt, byScene: BY, repeatTotal: repeatTotal, next: next, duration: END };
})(window.EM);
