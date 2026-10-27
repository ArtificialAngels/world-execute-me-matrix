'use strict';
/* encode-mp4.js — PNG sequence + song -> H.264/AAC mp4 (BT.709, faststart).
   usage: node _tools/encode-mp4.js [fps] [framesDir] [outFile] */
const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const fps = String(process.argv[2] || 24);
const frames = process.argv[3] || 'frames/video';
const out = path.join(root, process.argv[4] || 'world.execute(me)-matrix-1080p24.mp4');
const audio = path.join(root, 'Mili - world.execute(me);.mp3');

if (!fs.existsSync(path.join(root, frames, 'f00000.png'))) {
  console.error('missing ' + frames + '/f00000.png — run _tools/render-mp4.js first');
  process.exit(1);
}
if (!fs.existsSync(audio)) {
  console.error('missing audio: ' + audio);
  process.exit(1);
}

const args = [
  '-y', '-hide_banner', '-loglevel', 'warning',
  '-framerate', fps, '-i', path.join(root, frames, 'f%05d.png'),
  '-i', audio,
  '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p',
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-profile:v', 'high', '-level', '4.1',
  '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
  '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
  '-shortest', '-movflags', '+faststart', out
];
console.log('ffmpeg ' + args.join(' '));
const r = spawnSync('ffmpeg', args, { stdio: 'inherit' });
if (r.status !== 0) { console.error('encode failed: ' + r.status); process.exit(1); }

const probe = spawnSync('ffprobe', ['-v', 'error', '-show_entries',
  'format=duration,size:stream=codec_type,codec_name,width,height,r_frame_rate,sample_rate,channels',
  '-of', 'default=noprint_wrappers=1', out], { encoding: 'utf8' });
console.log(probe.stdout);
console.log('wrote ' + out + '  (' + (fs.statSync(out).size / 1048576).toFixed(1) + ' MB)');
