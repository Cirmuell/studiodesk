/**
 * gif-to-webp.mjs
 * Converts public/splash.gif → public/splash.webp (animated WebP)
 * using sharp's built-in animated image support.
 * Animated WebP is supported in Android WebView (Chromium 32+) and modern browsers.
 */
import sharp from 'sharp';
import fs from 'fs';

const src  = 'public/splash.gif';
const dest = 'public/splash.webp';

const before = fs.statSync(src).size;
console.log(`splash.gif: ${(before / 1024 / 1024).toFixed(2)} MB`);

await sharp(src, { animated: true })
  .webp({ quality: 75, effort: 6, loop: 1 })
  .toFile(dest);

const after = fs.statSync(dest).size;
console.log(`splash.webp: ${(after / 1024 / 1024).toFixed(2)} MB`);
console.log(`Saved: ${((1 - after / before) * 100).toFixed(1)}%`);
