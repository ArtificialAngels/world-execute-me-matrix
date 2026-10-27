/* 50_selftest.js — every load compares the embedded lyric copy with the cue
   table, checks the duration, the plate registry, and reports instead of hiding. */
(function (EM) {
  'use strict';
  var problems = [];
  var block = document.getElementById('lrc-source');
  var embedded = [];
  if (block) {
    var lines = block.textContent.split('\n');
    for (var i = 0; i < lines.length; i++) {
      var s = lines[i].trim();
      if (!s) continue;
      var j = s.indexOf(']');
      if (j < 0) continue;
      var stamp = s.slice(1, j);
      var rest = s.slice(j + 1);
      var tab = rest.indexOf('\t');
      var text = tab < 0 ? rest : rest.slice(0, tab);
      var cn = tab < 0 ? '' : rest.slice(tab + 1);
      var parts = stamp.split(':');
      var sec = (+parts[0]) * 60 + (+parts[1]);
      embedded.push({ t: sec, text: text, cn: cn });
    }
  }
  var cues = EM.Lyrics.cues;
  if (embedded.length !== cues.length) problems.push('embedded ' + embedded.length + ' vs cues ' + cues.length);
  var worst = 0;
  for (var k = 0; k < Math.min(embedded.length, cues.length); k++) {
    worst = Math.max(worst, Math.abs(embedded[k].t - cues[k].t));
    if (embedded[k].text !== cues[k].text) { problems.push('text mismatch at ' + k + ': ' + embedded[k].text + ' / ' + cues[k].text); break; }
  }
  if (worst > 0.002) problems.push('worst timestamp delta ' + (worst * 1000).toFixed(2) + ' ms');
  if (!(EM.AUDIO_END > 60)) problems.push('AUDIO_END not measured');
  var missing = [];
  for (k = 0; k < cues.length; k++) if (!EM.SceneReg[cues[k].scene]) missing.push(cues[k].scene);
  if (missing.length) problems.push('no plate for: ' + missing.join(', '));

  EM.selftest = { problems: problems, worst: worst, embedded: embedded.length, cues: cues.length, missingPlates: missing };
  if (problems.length) {
    console.error('[mv] SELFTEST:', problems);
  } else {
    console.log('[mv] selftest ok — ' + cues.length + ' cues, worst delta ' + (worst * 1000).toFixed(3) + ' ms, ' + EM.plates().length + ' plates');
  }
})(window.EM);
