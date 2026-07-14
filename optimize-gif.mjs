/**
 * optimize-gif.mjs  (uses @ffmpeg/ffmpeg v0.12+ API)
 * Converts public/splash.gif → public/splash.webm
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const gifPath  = 'public/splash.gif';
const webmPath = 'public/splash.webm';

const stat = fs.statSync(gifPath);
console.log(`splash.gif size: ${(stat.size / 1024 / 1024).toFixed(2)} MB`);

// ── Try @ffmpeg/ffmpeg v0.12+ ─────────────────────────────────────────────────
try {
  const { FFmpeg }   = await import('@ffmpeg/ffmpeg');
  const { fetchFile, toBlobURL } = await import('@ffmpeg/util');

  const ffmpeg = new FFmpeg();

  // Load core from local node_modules (works offline, no CDN needed)
  const corePkg = require.resolve('@ffmpeg/core');
  const coreDir = path.dirname(corePkg);
  const coreJs  = fs.readFileSync(path.join(coreDir, 'ffmpeg-core.js'));
  const coreWasm= fs.readFileSync(path.join(coreDir, 'ffmpeg-core.wasm'));

  const jsBlob   = new Blob([coreJs],   { type: 'text/javascript' });
  const wasmBlob = new Blob([coreWasm], { type: 'application/wasm' });
  const coreURL  = URL.createObjectURL(jsBlob);
  const wasmURL  = URL.createObjectURL(wasmBlob);

  await ffmpeg.load({ coreURL, wasmURL });

  console.log('ffmpeg wasm loaded. Converting GIF → WebM...');
  await ffmpeg.writeFile('splash.gif', await fetchFile(gifPath));

  await ffmpeg.exec([
    '-i', 'splash.gif',
    '-c:v', 'libvpx-vp9',
    '-b:v', '0', '-crf', '40',
    '-vf', 'scale=720:-2',
    '-an',
    '-deadline', 'realtime',
    'splash.webm'
  ]);

  const data = await ffmpeg.readFile('splash.webm');
  fs.writeFileSync(webmPath, data);

  const after = fs.statSync(webmPath).size;
  console.log(`splash.webm: ${(after / 1024 / 1024).toFixed(2)} MB  (saved ${((1 - after/stat.size)*100).toFixed(0)}%)`);
} catch (err) {
  console.log('ffmpeg wasm failed:', err.message);

  // ── Fallback: just reduce GIF quality with Jimp ───────────────────────────
  console.log('Trying Jimp as fallback...');
  try {
    const Jimp = (await import('jimp')).default;
    // Jimp can't re-encode GIFs but we can at least validate size
    console.log('Jimp available but cannot encode GIFs. GIF remains unchanged.');
  } catch {
    console.log('No fallback available. GIF unchanged.');
  }
}
