/**
 * Derives the PWA / Android icons and the Apple touch icon from
 * `public/art/sakura-fox.png`.
 *
 * Run with: npm run gen:icons
 */
import { readdir, rename, stat } from 'node:fs/promises';
import sharp from 'sharp';

const SOURCE = 'public/art/sakura-fox.png';

const meta = await sharp(SOURCE).metadata();
const side = Math.round(Math.min(meta.width, meta.height) * 0.86);
const left = Math.round((meta.width - side) / 2);
const top = Math.round((meta.height - side) / 2);

const core = await sharp(SOURCE).extract({ left, top, width: side, height: side }).png().toBuffer();

await sharp(core).resize(192, 192, { fit: 'cover' }).png().toFile('public/icons/icon-192.png');
await sharp(core).resize(512, 512, { fit: 'cover' }).png().toFile('public/icons/icon-512.png');
await sharp(core).resize(180, 180, { fit: 'cover' }).png().toFile('public/icons/apple-touch-icon.png');

const safe = await sharp(core).resize(410, 410, { fit: 'cover' }).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: '#0B0714' } })
  .composite([{ input: safe, gravity: 'center' }])
  .png()
  .toFile('public/icons/maskable-512.png');

// Keep the generated key art lean.
for (const file of await readdir('public/art')) {
  if (!file.startsWith('sakura-') || !file.endsWith('.jpg')) continue;
  const path = `public/art/${file}`;
  const image = await sharp(path).metadata();
  const width = Math.min(image.width, 1600);
  const temp = `${path}.tmp.jpg`;
  await sharp(path)
    .resize({ width, withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(temp);
  await rename(temp, path);
  const size = await stat(path);
  console.log(`${path}: ${width}px, ${Math.round(size.size / 1024)} kB`);
}

console.log('icons regenerated from', SOURCE);
