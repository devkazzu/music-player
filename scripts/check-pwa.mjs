/**
 * Production PWA audit for the built `dist/` folder.
 *
 * Verifies the installability essentials that browsers (including Chrome on
 * Android) check before offering "Add to Home screen":
 *   - a served manifest with name, start_url, scope, display standalone
 *   - 192px and 512px icons that really are those sizes (plus a maskable one)
 *   - a registered service worker that precaches the app shell and demo audio
 *   - an index.html that links the manifest and declares a theme colour
 *
 * Usage:
 *   npm run build && npm run check:pwa
 *   VITE_BASE=/music-player/ npm run build && npm run check:pwa
 */
import { readFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const DIST = resolve(process.argv[2] ?? 'dist');
const failures = [];
const notes = [];

const fail = (message) => failures.push(message);
const ok = (message) => notes.push(message);

async function readText(path) {
  try {
    return await readFile(path, 'utf8');
  } catch {
    return null;
  }
}

async function pngSize(path) {
  const buffer = await readFile(path);
  const signature = buffer.subarray(0, 8).toString('hex');
  if (signature !== '89504e470d0a1a0a') return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

const html = await readText(join(DIST, 'index.html'));
if (!html) fail('dist/index.html is missing — run `npm run build` first.');

const manifestHref = html?.match(/<link[^>]+rel="manifest"[^>]+href="([^"]+)"/)?.[1];
if (!manifestHref) fail('index.html has no <link rel="manifest">.');
else ok(`manifest linked from index.html: ${manifestHref}`);

const base = manifestHref ? manifestHref.replace(/manifest\.webmanifest$/, '') : '/';

const rawManifest = await readText(join(DIST, 'manifest.webmanifest'));
let manifest = null;
if (!rawManifest) fail('manifest.webmanifest was not emitted.');
else {
  try {
    manifest = JSON.parse(rawManifest);
  } catch {
    fail('manifest.webmanifest is not valid JSON.');
  }
}

if (manifest) {
  if (!manifest.name) fail('manifest.name is required for install prompts.');
  if (manifest.display !== 'standalone' && manifest.display !== 'fullscreen' && manifest.display !== 'minimal-ui') {
    fail(`manifest.display is "${manifest.display}" — installability needs standalone/fullscreen/minimal-ui.`);
  }
  if (!manifest.start_url) fail('manifest.start_url is required.');
  else if (!manifest.start_url.startsWith(base)) {
    fail(`manifest.start_url "${manifest.start_url}" does not start with the deployment base "${base}".`);
  }
  if (manifest.scope && !manifest.scope.startsWith(base)) {
    fail(`manifest.scope "${manifest.scope}" does not match deployment base "${base}".`);
  }
  if (!manifest.theme_color || !manifest.background_color) fail('manifest theme/background colours are required.');
  ok(`display=${manifest.display} start_url=${manifest.start_url} scope=${manifest.scope}`);

  const icons = manifest.icons ?? [];
  const has192 = icons.some((icon) => icon.sizes === '192x192');
  const has512 = icons.some((icon) => icon.sizes === '512x512');
  const hasMaskable = icons.some((icon) => String(icon.purpose ?? '').includes('maskable'));
  if (!has192) fail('manifest needs a 192x192 icon (Android install prompt requirement).');
  if (!has512) fail('manifest needs a 512x512 icon (Android splash screen).');
  if (!hasMaskable) fail('manifest needs a maskable icon (Android adaptive icons).');

  for (const icon of icons) {
    const withoutOrigin = icon.src.replace(/^https?:\/\/[^/]+\//, '');
    const scoped = withoutOrigin.startsWith(base.replace(/^\//, ''))
      ? withoutOrigin.slice(base.replace(/^\//, '').length)
      : withoutOrigin;
    const path = join(DIST, scoped.replace(/^\//, ''));
    const file = await stat(path).catch(() => null);
    if (!file) {
      fail(`manifest icon ${icon.src} does not exist in dist/.`);
      continue;
    }
    const dims = await pngSize(path).catch(() => null);
    const expected = Number(String(icon.sizes).split('x')[0]);
    if (!dims) fail(`manifest icon ${icon.src} is not a valid PNG.`);
    else if (dims.width !== expected || dims.height !== expected) {
      fail(`manifest icon ${icon.src} is ${dims.width}x${dims.height}, declared ${icon.sizes}.`);
    } else ok(`icon ${icon.src} is a real ${dims.width}x${dims.height} PNG`);
  }
}

const sw = await readText(join(DIST, 'sw.js'));
if (!sw) fail('dist/sw.js is missing — the app would not install as a PWA.');
else {
  ok('service worker generated (dist/sw.js)');
  const runtimeId = sw.match(/workbox-[a-z0-9]+/i)?.[0];
  const runtimeSource = runtimeId ? await readText(join(DIST, `${runtimeId}.js`)) : null;
  const hasFetchHandler = /addEventListener\(\s*["']fetch["']/.test(sw) ||
    Boolean(runtimeSource && /addEventListener\(\s*["']fetch["']/.test(runtimeSource));
  if (!hasFetchHandler) fail('sw.js (and its Workbox runtime) has no fetch handler.');
  else ok('service worker intercepts fetch requests');
  const hasShell = /index\.html/.test(sw);
  const hasAudio = /neon-requiem|audio\//.test(sw);
  if (!hasShell) fail('sw.js does not precache index.html (app shell).');
  if (!hasAudio) fail('sw.js does not precache the demo audio.');
  if (hasShell && hasAudio) ok('app shell and demo audio are precached for offline use');
  if (base !== '/' && !sw.includes(base)) fail(`sw.js does not reference the deployment base ${base}.`);
}

// GitHub Pages and other branch-only hosts need a 404.html deep-link shim.
const notFound = await readText(join(DIST, '404.html'));
if (!notFound) fail('dist/404.html is missing — deep links would 404 on GitHub Pages.');
else if (!notFound.includes(`var SCOPE = ${JSON.stringify(base)}`)) {
  fail(`dist/404.html does not capture deep links for base ${base}.`);
} else ok('404.html restores deep links on hosts without SPA rewrites');

if (html) {
  if (!/<meta name="theme-color"/.test(html)) fail('index.html has no theme-color meta tag.');
  if (!/viewport-fit=cover/.test(html)) fail('index.html viewport is missing viewport-fit=cover (notched Android screens).');
  const rootRefs = [...html.matchAll(/(?:href|src)="(\/(?:assets|art|audio|icons)\/[^"]+)"/g)]
    .map((match) => match[1])
    .filter((url) => base !== '/' && !url.startsWith(base));
  if (rootRefs.length > 0) fail(`index.html has root-relative asset URLs that bypass base ${base}: ${rootRefs.join(', ')}`);
  else ok(`all shell asset URLs respect the deployment base ${base}`);
}

if (failures.length > 0) {
  console.error('\nPWA audit failed:\n');
  for (const message of failures) console.error(`  ✗ ${message}`);
  process.exit(1);
}

console.log('\nPWA audit passed:\n');
for (const message of notes) console.log(`  ✓ ${message}`);
console.log(`\nChecked ${DIST} (base ${base}). Serve over HTTPS (or localhost) for installability.\n`);
