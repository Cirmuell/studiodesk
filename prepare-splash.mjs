/**
 * prepare-splash.mjs
 * 
 * 1. Resizes the generated splash PNG to each required Android density and
 *    copies it into every portrait drawable folder.
 * 2. Optimizes splash.gif: reduces colours, scales down frames, and strips
 *    metadata to shrink the file without visually degrading the animation.
 *
 * Usage: node prepare-splash.mjs
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// ─── 1. SPLASH PNG ────────────────────────────────────────────────────────────

const SRC = 'C:\\Users\\User 1\\.gemini\\antigravity-ide\\brain\\594f1265-2bd3-460a-87a5-f064c78d0696\\splash_v2_1784008691975.png';
const ANDROID_RES = 'android/app/src/main/res';

// Portrait density folders → longest edge size (px)
const PORT_DENSITIES = [
  { folder: 'drawable',             w: 480,  h: 800  },
  { folder: 'drawable-port-ldpi',   w: 240,  h: 427  },
  { folder: 'drawable-port-mdpi',   w: 320,  h: 568  },
  { folder: 'drawable-port-hdpi',   w: 480,  h: 854  },
  { folder: 'drawable-port-xhdpi',  w: 640,  h: 1136 },
  { folder: 'drawable-port-xxhdpi', w: 960,  h: 1706 },
  { folder: 'drawable-port-xxxhdpi',w: 1280, h: 2274 },
];

// Night variants — same images, different folder names
const NIGHT_DENSITIES = [
  { folder: 'drawable-night',             w: 480,  h: 800  },
  { folder: 'drawable-port-night-ldpi',   w: 240,  h: 427  },
  { folder: 'drawable-port-night-mdpi',   w: 320,  h: 568  },
  { folder: 'drawable-port-night-hdpi',   w: 480,  h: 854  },
  { folder: 'drawable-port-night-xhdpi',  w: 640,  h: 1136 },
  { folder: 'drawable-port-night-xxhdpi', w: 960,  h: 1706 },
  { folder: 'drawable-port-night-xxxhdpi',w: 1280, h: 2274 },
];

const ALL_DENSITIES = [...PORT_DENSITIES, ...NIGHT_DENSITIES];

async function processSplash() {
  console.log('Processing splash PNG...');
  for (const { folder, w, h } of ALL_DENSITIES) {
    const dest = path.join(ANDROID_RES, folder, 'splash.png');
    // Ensure the folder exists
    fs.mkdirSync(path.join(ANDROID_RES, folder), { recursive: true });
    await sharp(SRC)
      .resize(w, h, { fit: 'cover', position: 'center' })
      .png({ compressionLevel: 9, effort: 10 })
      .toFile(dest);
    console.log(`  ✓ ${dest}  (${w}×${h})`);
  }
  console.log('Splash PNG done.\n');
}

// ─── 2. GIF OPTIMISATION ─────────────────────────────────────────────────────
// Sharp cannot write GIFs, but it CAN extract & re-encode individual frames.
// Strategy: extract every Nth frame → write as WebP sequence → reconstruct as
// a smaller GIF using the 'gifski' approach OR just convert to WebM video.
//
// Best practical approach: convert splash.gif → splash.mp4 (H.264) using
// the 'fluent-ffmpeg' package, BUT since ffmpeg may not be installed globally,
// we'll instead just downscale + reduce colours of the GIF using sharp by 
// reading metadata and reporting, and write a WebM version if ffmpeg is present.
//
// For the gif we'll attempt to use gifsicle if available; otherwise we report
// the size and recommend the user install gifsicle.

import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

async function optimizeGif() {
  const SRC_GIF  = 'public/splash.gif';
  const DEST_GIF = 'public/splash.gif'; // overwrite in-place

  const beforeSize = fs.statSync(SRC_GIF).size;
  console.log(`GIF before: ${(beforeSize / 1024 / 1024).toFixed(2)} MB`);

  // Try gifsicle first
  try {
    await execAsync('gifsicle --version');
    console.log('Using gifsicle...');
    await execAsync(
      `gifsicle -O3 --colors 128 --lossy=80 --scale 0.85 "${SRC_GIF}" -o "${DEST_GIF}"`
    );
    const afterSize = fs.statSync(DEST_GIF).size;
    console.log(`GIF after:  ${(afterSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Saved: ${((1 - afterSize / beforeSize) * 100).toFixed(1)}%`);
    return;
  } catch {
    console.log('gifsicle not found, trying ffmpeg...');
  }

  // Try ffmpeg — convert to WebM (much smaller, plays in Capacitor WebView)
  try {
    await execAsync('ffmpeg -version');
    console.log('Using ffmpeg to convert GIF → WebM...');
    const DEST_WEBM = 'public/splash.webm';
    await execAsync(
      `ffmpeg -y -i "${SRC_GIF}" -c:v libvpx-vp9 -b:v 0 -crf 35 -vf "scale=720:-2" -an "${DEST_WEBM}"`
    );
    const webmSize = fs.statSync(DEST_WEBM).size;
    console.log(`WebM created: ${(webmSize / 1024 / 1024).toFixed(2)} MB`);
    console.log('→ Update AnimatedSplash.tsx to use /splash.webm in a <video> tag.');
    return;
  } catch {
    console.log('ffmpeg not found.');
  }

  console.log('⚠  No optimization tool (gifsicle/ffmpeg) found. GIF left unchanged.');
  console.log('   Install gifsicle: choco install gifsicle   OR   npm i -g gifsicle');
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
await processSplash();
await optimizeGif();
