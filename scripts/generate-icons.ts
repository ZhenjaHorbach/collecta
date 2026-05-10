// Render every PNG icon variant from the SVG sources so the brand stays in
// sync across iOS, Android, web. Re-run via
// `bash scripts/generate-icons.sh` whenever assets/images/icon*.svg changes.
//
// Output set is exactly what app.json + the splash plugin reference:
//   icon.png                       (1024)  — full icon (round gold + glyph)
//   favicon.png                    (48)    — same, scaled
//   splash-icon.png                (1024)  — glyph-only on transparent
//   android-icon-foreground.png    (512)   — glyph-only with safe-zone pad
//   android-icon-background.png    (512)   — solid gold
//   android-icon-monochrome.png    (512)   — same as foreground (white)

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import sharp from 'sharp';

const ROOT = resolve(__dirname, '..');
const ICON_SVG = resolve(ROOT, 'assets/images/icon.svg');
const GLYPH_SVG = resolve(ROOT, 'assets/images/icon-glyph.svg');
const OUT_DIR = resolve(ROOT, 'assets/images');

const GOLD = '#D97706';

// Android adaptive icon foreground is rendered onto a circular / squircle
// mask the OS applies — visible portion is only the inner ~66 %. Pad the
// glyph so it stays inside the safe zone instead of being cropped.
const ANDROID_FG_INSET = 0.18;

async function renderSquare(svgPath: string, size: number, outFile: string): Promise<void> {
  const svg = await readFile(svgPath);
  await sharp(svg, { density: 600 }).resize(size, size).png().toFile(outFile);
}

async function renderPaddedGlyph(size: number, inset: number, outFile: string): Promise<void> {
  const svg = await readFile(GLYPH_SVG);
  const inner = Math.round(size * (1 - inset * 2));
  const offset = Math.round((size - inner) / 2);
  const glyph = await sharp(svg, { density: 600 }).resize(inner, inner).png().toBuffer();
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: glyph, top: offset, left: offset }])
    .png()
    .toFile(outFile);
}

async function renderSolidBackground(size: number, outFile: string): Promise<void> {
  await sharp({ create: { width: size, height: size, channels: 4, background: GOLD } })
    .png()
    .toFile(outFile);
}

async function main(): Promise<void> {
  await renderSquare(ICON_SVG, 1024, resolve(OUT_DIR, 'icon.png'));
  console.log('  icon.png 1024×1024');

  await renderSquare(ICON_SVG, 48, resolve(OUT_DIR, 'favicon.png'));
  console.log('  favicon.png 48×48');

  // Splash uses the glyph only — the splash plugin paints the background
  // (set to gold in app.json), so the icon is transparent here.
  await renderPaddedGlyph(1024, 0.2, resolve(OUT_DIR, 'splash-icon.png'));
  console.log('  splash-icon.png 1024×1024 (glyph, 20% pad)');

  // Android adaptive icon trio.
  await renderPaddedGlyph(512, ANDROID_FG_INSET, resolve(OUT_DIR, 'android-icon-foreground.png'));
  console.log('  android-icon-foreground.png 512×512 (glyph, safe zone)');

  await renderSolidBackground(512, resolve(OUT_DIR, 'android-icon-background.png'));
  console.log('  android-icon-background.png 512×512 (solid gold)');

  await renderPaddedGlyph(512, ANDROID_FG_INSET, resolve(OUT_DIR, 'android-icon-monochrome.png'));
  console.log('  android-icon-monochrome.png 512×512');
}

main().catch((err) => {
  console.error('[generate-icons]', err);
  process.exit(1);
});
