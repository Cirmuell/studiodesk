import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function main() {
  const dir = 'public/images/onboarding';
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.png'));

  for (const f of files) {
    const p = path.join(dir, f);
    const webp = p.replace('.png', '.webp');
    await sharp(p).webp({ quality: 80 }).toFile(webp);
    // Remove the original to save space
    fs.unlinkSync(p);
    console.log(`Optimized ${f} to ${path.basename(webp)}`);
  }
}

main().catch(console.error);
