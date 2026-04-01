// Generate Android mipmap icons from master SVG
import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const svgBuffer = readFileSync(join(__dirname, 'icon-master.svg'));

const resDir = join(__dirname, 'android/app/src/main/res');

// Android mipmap sizes: ic_launcher (square with rounding done by OS)
const launcherSizes = [
  { folder: 'mipmap-mdpi',    size: 48 },
  { folder: 'mipmap-hdpi',    size: 72 },
  { folder: 'mipmap-xhdpi',   size: 96 },
  { folder: 'mipmap-xxhdpi',  size: 144 },
  { folder: 'mipmap-xxxhdpi', size: 192 },
];

// Adaptive icon foreground: 108dp at each density
const foregroundSizes = [
  { folder: 'mipmap-mdpi',    size: 108 },
  { folder: 'mipmap-hdpi',    size: 162 },
  { folder: 'mipmap-xhdpi',   size: 216 },
  { folder: 'mipmap-xxhdpi',  size: 324 },
  { folder: 'mipmap-xxxhdpi', size: 432 },
];

async function generate() {
  // Generate ic_launcher.png and ic_launcher_round.png
  for (const { folder, size } of launcherSizes) {
    const dir = join(resDir, folder);
    mkdirSync(dir, { recursive: true });

    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(join(dir, 'ic_launcher.png'));

    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(join(dir, 'ic_launcher_round.png'));

    console.log(`  ${folder}: ${size}x${size}`);
  }

  // Generate adaptive icon foreground
  for (const { folder, size } of foregroundSizes) {
    const dir = join(resDir, folder);
    mkdirSync(dir, { recursive: true });

    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(join(dir, 'ic_launcher_foreground.png'));

    console.log(`  ${folder} foreground: ${size}x${size}`);
  }

  // Web favicon (512x512 for PWA, plus update the small one)
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(join(__dirname, 'public', 'icon-512.png'));
  console.log('  public/icon-512.png: 512x512');

  console.log('\nDone! Icons generated.');
}

generate().catch(err => { console.error(err); process.exit(1); });
