#!/usr/bin/env node
'use strict';
/**
 * _build/parse-mp3.js
 *
 * 零依赖音频分析：只用 node 内置模块 + 系统 PATH 里的 ffmpeg。
 * 从 "Mili - world.execute(me);.mp3" 生成两个数据文件：
 *
 *   assets/waveform.js   实测时长 + 512 格能量包络
 *   assets/onsets.js     卡点表 [毫秒, 主频Hz, 力度0..1, 能量0..1]
 *
 * 时长：逐 MPEG-1 Layer III 帧计数 x 1152 采样 / 44100，再扣掉 LAME 头里的
 *       encoder delay / padding（这才是解码器听到的、与 <audio> 播放一致的时长）。
 *       绝不使用 ffprobe 的容器时长。ffmpeg 解出的 PCM 长度用于交叉验证。
 *
 * 用法： node _build/parse-mp3.js
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT   = path.resolve(__dirname, '..');
const AUDIO  = path.join(ROOT, 'Mili - world.execute(me);.mp3');
const ASSETS = path.join(ROOT, 'assets');

/* ---------------- 检测参数（可按听感微调） ---------------- */
const PCM_RATE        = 22050;  // 分析采样率
const FFT_SIZE        = 1024;
const HOP             = 256;   // 22.05kHz -> 86.13 帧/秒
const WAVE_BINS       = 512;   // 能量包络格数
const THR_HALF_SEC    = 0.40;  // 自适应阈值：局部中位数窗口 ±0.4s
const THR_COEF        = 1.60;  //   中位数 × 系数
const THR_OFFSET      = 0.020; //   + 偏移（flux 已按 p99 归一化）
const MIN_GAP_MS      = 70;    // 两个 onset 的最小间隔
const REFINE_BACK_MS  = 30;    // 峰值前 30ms 内取局部最大
const LOG_GAIN        = 40;    // 频谱幅度 log 压缩系数

const log = (...a) => console.log(...a);

/* =====================================================================
 * 1) MPEG 帧遍历
 * ===================================================================== */

const BITRATE_MPEG1_L3 = [0,32,40,48,56,64,80,96,112,128,160,192,224,256,320,0]; // kbps
const BITRATE_MPEG2_L3 = [0,8,16,24,32,40,48,56,64,80,96,112,128,144,160,0];
const SAMPLE_RATES = { 3:[44100,48000,32000], 2:[22050,24000,16000], 0:[11025,12000,8000] };

function isFrameHeader(b0, b1) {
  if (b0 !== 0xFF || (b1 & 0xE0) !== 0xE0) return false;   // 11 位同步字
  const ver = (b1 >> 3) & 0x3;                            // 3=MPEG1 2=MPEG2 0=MPEG2.5 1=reserved
  const layer = (b1 >> 1) & 0x3;                          // 1=Layer III
  return ver !== 1 && layer === 1;                        // Layer III === 1
}

function parseMp3(buf) {
  const out = {
    id3: null, audioStart: 0, frames: 0, headerFrames: 0,
    sampleRate: 44100, samplesPerFrame: 1152,
    encoderDelay: 0, encoderPadding: 0, hasLame: false,
    xing: null, bad: [], truncatedTail: null,
  };

  /* ---- 跳过 ID3v2（synchsafe size） ---- */
  let p = 0;
  if (buf.length > 10 && buf.toString('latin1', 0, 3) === 'ID3') {
    const size = ((buf[6] & 0x7F) << 21) | ((buf[7] & 0x7F) << 14) | ((buf[8] & 0x7F) << 7) | (buf[9] & 0x7F);
    const footer = (buf[5] & 0x10) ? 10 : 0;
    out.id3 = { ver: buf[3], rev: buf[4], flag: buf[5], size, total: 10 + size + footer };
    p = out.id3.total;
  }
  out.audioStart = p;

  /* ---- 尾部 ID3v1 ---- */
  let end = buf.length;
  if (buf.length >= 128 && buf.toString('latin1', buf.length - 128, buf.length - 125) === 'TAG') end -= 128;

  let resyncs = 0;
  while (p + 4 <= end) {
    /* ---- 帧头损坏：报告并从下一个同步字继续 ---- */
    if (!isFrameHeader(buf[p], buf[p + 1])) {
      let q = p + 1;
      while (q + 4 <= end && !isFrameHeader(buf[q], buf[q + 1])) q++;
      out.bad.push({ offset: p, skipped: q - p });
      if (++resyncs > 64) { out.bad.push({ offset: p, skipped: end - p, fatal: true }); break; }
      p = q;
      continue;
    }

    const b1 = buf[p + 1], b2 = buf[p + 2], b3 = buf[p + 3];
    const ver = (b1 >> 3) & 0x3;
    const hasCrc = (b1 & 0x1) === 0;             // protection bit == 0 -> CRC 存在
    const brIdx = (b2 >> 4) & 0xF;
    const srIdx = (b2 >> 2) & 0x3;
    const pad   = (b2 >> 1) & 0x1;
    const chan  = (b3 >> 6) & 0x3;               // 3 = mono

    const brTable = ver === 3 ? BITRATE_MPEG1_L3 : BITRATE_MPEG2_L3;
    const bitrate = brTable[brIdx] * 1000;
    const srList  = SAMPLE_RATES[ver];
    if (brIdx === 0 || brIdx === 15 || srIdx === 3 || !srList) {
      out.bad.push({ offset: p, skipped: 1, reason: 'invalid bitrate/samplerate index' });
      p += 1; continue;
    }
    const sampleRate      = srList[srIdx];
    const samplesPerFrame = ver === 3 ? 1152 : 576;
    const frameLen        = Math.floor((samplesPerFrame / 8) * bitrate / sampleRate) + pad;

    /* ---- 收尾的截断帧：帧头有效，解码器会补静音，仍计入帧数 ---- */
    if (p + frameLen > end) {
      out.truncatedTail = { offset: p, declared: frameLen, available: end - p, missing: frameLen - (end - p) };
      out.frames++;
      break;
    }

    /* ---- Xing / Info 头帧（元数据，不是音频帧） ---- */
    const crcLen  = hasCrc ? 2 : 0;
    const sideLen = (ver === 3 ? 32 : 17) - (chan === 3 ? 15 : 0); // MPEG1: st32/mono17, MPEG2: st17/mono9
    const xOff = p + 4 + crcLen + sideLen;
    const tag  = xOff + 4 <= end ? buf.toString('latin1', xOff, xOff + 4) : '';
    if (tag === 'Xing' || tag === 'Info') {
      out.headerFrames++;
      out.sampleRate = sampleRate;
      out.samplesPerFrame = samplesPerFrame;
      const x = { tag, offset: p };
      if (xOff + 8 <= end) {
        const flags = buf.readUInt32BE(xOff + 4);
        x.flags = flags;
        let q = xOff + 8;
        if (flags & 0x1) { x.frames = buf.readUInt32BE(q); q += 4; }
        if (flags & 0x2) { x.bytes = buf.readUInt32BE(q); q += 4; }
        if (flags & 0x4) { x.toc = true; q += 100; }
        if (flags & 0x8) { x.quality = buf.readUInt32BE(q); q += 4; }
      }
      /* LAME 扩展头：encoder delay / padding 的权威来源 */
      const lameOff = xOff + 120;
      if (lameOff + 24 <= end) {
        const sig = buf.toString('latin1', lameOff, lameOff + 9);
        if (/^(LAME|L3\.9|Lavc|GOGO)/.test(sig)) {
          const d = buf[lameOff + 21], e = buf[lameOff + 22], f = buf[lameOff + 23];
          x.lame = sig;
          out.hasLame = true;
          out.encoderDelay   = (d << 4) | (e >> 4);
          out.encoderPadding = ((e & 0x0F) << 8) | f;
        }
      }
      out.xing = x;
      p += frameLen;
      continue;
    }

    /* ---- 普通音频帧 ---- */
    out.frames++;
    if (out.frames === 1) {
      out.firstFrame = { offset: p, bitrate, sampleRate, frameLen, channels: chan === 3 ? 1 : 2 };
      out.sampleRate = sampleRate;
      out.samplesPerFrame = samplesPerFrame;
    }
    p += frameLen;
  }

  /* ---- 时长：帧数 x 1152 / 44100，扣掉 encoder delay / padding ---- */
  const spf = out.samplesPerFrame;
  out.rawSamples   = out.frames * spf;
  out.totalSamples = Math.max(0, out.rawSamples - out.encoderDelay - out.encoderPadding);
  out.durationRaw  = out.rawSamples / out.sampleRate;
  out.duration     = out.totalSamples / out.sampleRate;
  out.xingFramesMatch = (out.xing && typeof out.xing.frames === 'number') ? out.xing.frames === out.frames : null;
  return out;
}

/* =====================================================================
 * 2) ffmpeg 解码 -> float32 单声道 PCM
 * ===================================================================== */

function decodePcm(file, rate) {
  const res = spawnSync('ffmpeg', [
    '-v', 'error', '-nostdin', '-i', file,
    '-ac', '1', '-ar', String(rate), '-f', 'f32le', '-',
  ], { maxBuffer: 512 * 1024 * 1024 });
  if (res.error) throw res.error;
  if (res.status !== 0) throw new Error('ffmpeg failed: ' + res.stderr.toString());
  const b = res.stdout, n = Math.floor(b.length / 4);
  const pcm = new Float32Array(n);
  for (let i = 0; i < n; i++) pcm[i] = b.readFloatLE(i * 4);
  return pcm;
}

/* =====================================================================
 * 3) radix-2 FFT（原地，预计算位反转 + 旋转因子）
 * ===================================================================== */

function makeFFT(n) {
  const lg = Math.round(Math.log2(n));
  const rev = new Uint32Array(n);
  for (let i = 0; i < n; i++) {
    let r = 0;
    for (let b = 0; b < lg; b++) r |= ((i >> b) & 1) << (lg - 1 - b);
    rev[i] = r;
  }
  const cos = new Float64Array(n / 2), sin = new Float64Array(n / 2);
  for (let i = 0; i < n / 2; i++) {
    cos[i] = Math.cos(2 * Math.PI * i / n);
    sin[i] = Math.sin(2 * Math.PI * i / n);
  }
  const re = new Float64Array(n), im = new Float64Array(n);
  return function fft(inputRe, inputIm) {
    re.set(inputRe); im.set(inputIm);
    for (let i = 0; i < n; i++) {
      const j = rev[i];
      if (j > i) {
        let t = re[i]; re[i] = re[j]; re[j] = t;
        t = im[i]; im[i] = im[j]; im[j] = t;
      }
    }
    for (let size = 2; size <= n; size <<= 1) {
      const half = size >> 1, step = n / size;
      for (let i = 0; i < n; i += size) {
        for (let k = 0, j = 0; k < half; k++, j += step) {
          const c = cos[j], s = -sin[j];
          const a = i + k, b = a + half;
          const tr = re[b] * c - im[b] * s;
          const ti = re[b] * s + im[b] * c;
          re[b] = re[a] - tr; im[b] = im[a] - ti;
          re[a] += tr; im[a] += ti;
        }
      }
    }
    return { re, im };
  };
}

/* =====================================================================
 * 4) 512 格 RMS 能量包络（0..1，以 p95 为上限）
 * ===================================================================== */

function buildWave(pcm) {
  const N = WAVE_BINS;
  const acc = new Float64Array(N), cnt = new Float64Array(N);
  for (let i = 0; i < pcm.length; i++) {
    const b = Math.min(N - 1, Math.floor(i / pcm.length * N));
    acc[b] += pcm[i] * pcm[i]; cnt[b]++;
  }
  const rms = new Float64Array(N);
  for (let b = 0; b < N; b++) rms[b] = cnt[b] ? Math.sqrt(acc[b] / cnt[b]) : 0;

  const sorted = Array.from(rms).sort((a, b) => a - b);
  const ref = sorted[Math.min(sorted.length - 1, Math.floor(0.95 * sorted.length))] || 1;
  const wave = new Array(N);
  for (let b = 0; b < N; b++) {
    wave[b] = Math.round(Math.min(1, Math.max(0, rms[b] / ref)) * 10000) / 10000;
  }
  return { wave, ref };
}

/* =====================================================================
 * 5) onset 检测
 *    spectral flux（半波整流 + log 压缩） -> 自适应阈值（局部中位数） -> 峰值挑选
 * ===================================================================== */

function buildOnsets(pcm, rate) {
  const fft = makeFFT(FFT_SIZE);
  const win = new Float64Array(FFT_SIZE);
  for (let i = 0; i < FFT_SIZE; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (FFT_SIZE - 1)); // Hann

  const nFrames = Math.floor((pcm.length - FFT_SIZE) / HOP) + 1;
  const bins = FFT_SIZE / 2;                       // 1..512
  const flux = new Float64Array(nFrames);
  const rmsA = new Float64Array(nFrames);
  const prev = new Float64Array(bins + 1), cur = new Float64Array(bins + 1);
  const reIn = new Float64Array(FFT_SIZE), imIn = new Float64Array(FFT_SIZE);

  /* --- 逐帧 FFT -> flux / rms --- */
  for (let f = 0; f < nFrames; f++) {
    const off = f * HOP;
    let s = 0;
    for (let i = 0; i < FFT_SIZE; i++) {
      const v = pcm[off + i];
      s += v * v;
      reIn[i] = v * win[i];
      imIn[i] = 0;
    }
    rmsA[f] = Math.sqrt(s / FFT_SIZE);
    const { re, im } = fft(reIn, imIn);
    let fl = 0;
    for (let b = 1; b <= bins; b++) {
      const mag = Math.sqrt(re[b] * re[b] + im[b] * im[b]) / (FFT_SIZE / 2);
      const lm = Math.log1p(mag * LOG_GAIN);       // log 压缩
      cur[b] = lm;
      const d = lm - prev[b];
      if (d > 0) fl += d;                          // 半波整流
    }
    flux[f] = fl;
    prev.set(cur);
  }

  /* --- 归一化 + 参考尺度 --- */
  const fluxSorted = Array.from(flux).sort((a, b) => a - b);
  const fluxP99 = fluxSorted[Math.min(fluxSorted.length - 1, Math.floor(0.99 * fluxSorted.length))] || 1;
  const fluxN = new Float64Array(nFrames);
  for (let f = 0; f < nFrames; f++) fluxN[f] = flux[f] / fluxP99;

  const rmsSorted = Array.from(rmsA).sort((a, b) => a - b);
  const rmsP95 = rmsSorted[Math.min(rmsSorted.length - 1, Math.floor(0.95 * rmsSorted.length))] || 1;

  /* --- 自适应阈值：局部中位数 x 系数 + 偏移 --- */
  const fps = rate / HOP;
  const halfWin = Math.round(THR_HALF_SEC * fps);
  const thr = new Float64Array(nFrames);
  const tmp = [];
  for (let f = 0; f < nFrames; f++) {
    const a = Math.max(0, f - halfWin), b = Math.min(nFrames - 1, f + halfWin);
    tmp.length = 0;
    for (let k = a; k <= b; k++) tmp.push(fluxN[k]);
    tmp.sort((x, y) => x - y);
    thr[f] = tmp[tmp.length >> 1] * THR_COEF + THR_OFFSET;
  }

  /* --- 候选峰：局部极大且过阈值 --- */
  const cand = [];
  for (let f = 1; f < nFrames - 1; f++) {
    if (fluxN[f] <= thr[f]) continue;
    if (fluxN[f] < fluxN[f - 1] || fluxN[f] < fluxN[f + 1]) continue;
    cand.push(f);
  }

  /* --- 最小间隔 70ms：按强度贪心 --- */
  cand.sort((a, b) => fluxN[b] - fluxN[a]);
  const minGap = Math.max(1, Math.round(MIN_GAP_MS / 1000 * fps));
  const picked = [];
  for (const f of cand) {
    let ok = true;
    for (const q of picked) { if (Math.abs(q - f) < minGap) { ok = false; break; } }
    if (ok) picked.push(f);
  }
  picked.sort((a, b) => a - b);

  /* --- 峰值前 30ms 内取局部最大 -> 主频 / 力度 / 能量 --- */
  const back = Math.max(1, Math.round(REFINE_BACK_MS / 1000 * fps));
  const onsets = [];
  const re2 = new Float64Array(FFT_SIZE), im2 = new Float64Array(FFT_SIZE);

  for (let f of picked) {
    let best = f;
    for (let k = Math.max(1, f - back); k <= f; k++) if (fluxN[k] > fluxN[best]) best = k;
    const t = best * HOP / rate;
    if (t < 0.03) continue;                        // 丢掉边缘伪 onset

    /* 主频：该帧幅度最大的 bin（b>=2 约 43Hz 以上），抛物线插值细化 */
    const off = best * HOP;
    for (let i = 0; i < FFT_SIZE; i++) { re2[i] = pcm[off + i] * win[i]; im2[i] = 0; }
    const { re, im } = fft(re2, im2);
    const mag = new Float64Array(bins + 1);
    let bestBin = 1, bestMag = -1;
    for (let b = 2; b <= bins; b++) {
      const m = Math.sqrt(re[b] * re[b] + im[b] * im[b]);
      mag[b] = m;
      if (m > bestMag) { bestMag = m; bestBin = b; }
    }
    let f0 = bestBin * rate / FFT_SIZE;
    if (bestBin > 1 && bestBin < bins) {
      const a = mag[bestBin - 1], b0 = mag[bestBin], c = mag[bestBin + 1];
      const den = a - 2 * b0 + c;
      if (Math.abs(den) > 1e-12) {
        const delta = 0.5 * (a - c) / den;
        if (delta > -0.5 && delta < 0.5) f0 = (bestBin + delta) * rate / FFT_SIZE;
      }
    }

    const vel = Math.min(1, rmsA[best] / rmsP95);              // 力度：RMS / 全曲 p95
    const energy = Math.min(1, fluxN[best]);                   // 能量：归一化 flux
    onsets.push([
      Math.round(t * 1000),
      Math.round(f0 * 10) / 10,
      Math.round(vel * 1000) / 1000,
      Math.round(energy * 1000) / 1000,
    ]);
  }

  return { onsets, nFrames, fluxP99, rmsP95 };
}

/* =====================================================================
 * main
 * ===================================================================== */

function main() {
  if (!fs.existsSync(AUDIO)) { console.error('missing audio: ' + AUDIO); process.exit(1); }
  fs.mkdirSync(ASSETS, { recursive: true });

  const buf = fs.readFileSync(AUDIO);
  log('audio        : ' + path.basename(AUDIO) + '  (' + buf.length + ' bytes)');

  const mp3 = parseMp3(buf);
  log('ID3v2        : ' + (mp3.id3 ? ('v2.' + mp3.id3.ver + '.' + mp3.id3.rev + ' size=' + mp3.id3.size + ' -> audio@' + mp3.id3.total) : 'none'));
  log('Xing/Info    : ' + (mp3.xing ? (mp3.xing.tag + ' @' + mp3.xing.offset + (mp3.xing.frames != null ? ' frames=' + mp3.xing.frames : '') + (mp3.xing.lame ? ' ' + mp3.xing.lame : '')) : 'none'));
  log('MPEG frames  : ' + mp3.frames + ' audio (+' + mp3.headerFrames + ' header)  corrupt=' + mp3.bad.length + '  matchXing=' + mp3.xingFramesMatch);
  for (const b of mp3.bad.slice(0, 8)) log('  corrupt frame: ' + JSON.stringify(b));
  if (mp3.truncatedTail) log('truncated tail: ' + JSON.stringify(mp3.truncatedTail));
  log('encoder delay: ' + mp3.encoderDelay + ' samples / padding ' + mp3.encoderPadding + ' samples' + (mp3.hasLame ? ' (LAME tag)' : ' (none)'));
  log('duration     : raw ' + mp3.durationRaw.toFixed(6) + 's   trimmed ' + mp3.duration.toFixed(6) + 's');

  /* PCM：22050 单声道 f32le —— 包络与 onset 共用同一次解码 */
  const pcm = decodePcm(AUDIO, PCM_RATE);
  const pcmDur = pcm.length / PCM_RATE;
  log('pcm          : ' + pcm.length + ' samples @' + PCM_RATE + 'Hz = ' + pcmDur.toFixed(6) + 's');
  log('cross-check  : |frame-duration - pcm| = ' + (Math.abs(mp3.duration - pcmDur) * 1000).toFixed(2) + ' ms');

  const { wave, ref } = buildWave(pcm);
  const onsetRes = buildOnsets(pcm, PCM_RATE);
  const onsets = onsetRes.onsets;

  /* 时长以帧计数为准 */
  const AUDIO_END = Math.round(mp3.duration * 1e6) / 1e6;

  /* ---------- assets/waveform.js ---------- */
  const wf = [];
  wf.push('/* AUTO-GENERATED by _build/parse-mp3.js — 请勿手改。');
  wf.push(' * source : ' + path.basename(AUDIO));
  wf.push(' * frames : ' + mp3.frames + ' 个 MPEG-1 Layer III 帧 x 1152 采样 @44100Hz');
  wf.push(' * trim   : encoder delay ' + mp3.encoderDelay + ' + padding ' + mp3.encoderPadding + ' samples' + (mp3.hasLame ? '（LAME 头）' : ''));
  wf.push(' * raw    : ' + mp3.durationRaw.toFixed(6) + 's（帧数 x 1152 / 44100，未扣 delay/padding）');
  wf.push(' * measured PCM : ' + pcmDur.toFixed(6) + 's（ffmpeg 解码长度，交叉验证）');
  wf.push(' */');
  wf.push('window.EM = window.EM || {};');
  wf.push('EM.AUDIO_END = ' + AUDIO_END.toFixed(6) + ';        // 实测秒数：帧计数扣掉 encoder delay/padding，与解码 PCM 一致');
  wf.push('EM.AUDIO_FRAMES = ' + mp3.frames + ';         // MPEG 帧数');
  wf.push('EM.AUDIO_END_RAW = ' + mp3.durationRaw.toFixed(6) + ';    // 帧数 x 1152 / 44100（未扣 delay/padding）');
  wf.push('EM.AUDIO_ENC_DELAY = ' + mp3.encoderDelay + ';');
  wf.push('EM.AUDIO_ENC_PADDING = ' + mp3.encoderPadding + ';');
  wf.push('EM.WAVE = [' + wave.join(',') + '];');
  wf.push('');
  fs.writeFileSync(path.join(ASSETS, 'waveform.js'), wf.join('\n'));

  /* ---------- assets/onsets.js ---------- */
  const of = [];
  of.push('/* AUTO-GENERATED by _build/parse-mp3.js — 请勿手改。');
  of.push(' * spectral flux onset detection: FFT 1024 / hop 256 / Hann @22050Hz');
  of.push(' * 自适应阈值 = 局部中位数 x ' + THR_COEF + ' + ' + THR_OFFSET + '，最小间隔 ' + MIN_GAP_MS + 'ms，峰值前 ' + REFINE_BACK_MS + 'ms 取局部最大');
  of.push(' * 行格式: [毫秒, 主频Hz, 力度 0..1, 能量 0..1]   力度 = 该帧 RMS / 全曲 RMS p95');
  of.push(' */');
  of.push('window.EM = window.EM || {};');
  of.push('EM.ONSETS = [');
  for (const o of onsets) of.push('[' + o.join(',') + '],');
  of.push('];');
  of.push('');
  fs.writeFileSync(path.join(ASSETS, 'onsets.js'), of.join('\n'));

  /* ---------- 摘要 ---------- */
  log('');
  log('AUDIO_END    : ' + AUDIO_END.toFixed(6) + ' s');
  log('AUDIO_FRAMES : ' + mp3.frames);
  log('WAVE         : ' + wave.length + ' bins (归一化上限 p95=' + ref.toFixed(4) + ')');
  log('ONSETS       : ' + onsets.length + '  (flux frames=' + onsetRes.nFrames + ', flux p99=' + onsetRes.fluxP99.toFixed(2) + ')');
  if (onsets.length) log('first / last : ' + onsets[0][0] + ' ms / ' + onsets[onsets.length - 1][0] + ' ms');
  log('files        : assets/waveform.js, assets/onsets.js');
}

main();
