/**
 * Generates `dist/404.html` for static hosts that cannot rewrite unknown routes
 * to index.html (GitHub Pages is the notable one).
 *
 * GitHub Pages serves this file for any path it cannot resolve, *without*
 * changing the URL. The script stores the requested deep link in sessionStorage
 * and sends the visitor to the app root; `restoreDeepLink()` in the app then
 * restores the original path before the router mounts.
 *
 * Hosts with real SPA rewrites (Cloudflare Pages, Netlify, Vercel) never hit
 * this file, so it is harmless there.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const dist = resolve(process.argv[2] ?? 'dist');
const base = process.env.VITE_BASE || '/';
const scope = base.endsWith('/') ? base : `${base}/`;

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex" />
    <title>HIRO SEGAWA</title>
    <script>
      (function () {
        var SCOPE = ${JSON.stringify(scope)};
        var KEY = 'hiro:deep-link:v1';
        var target = window.location.pathname + window.location.search + window.location.hash;
        try {
          if (target.indexOf(SCOPE) === 0 && target !== SCOPE) {
            window.sessionStorage.setItem(KEY, target);
          }
        } catch (error) {
          /* storage can be unavailable in private modes */
        }
        window.location.replace(SCOPE);
      })();
    </script>
    <style>
      html, body { margin: 0; height: 100%; background: #05060f; color: #cbd5f5; }
      body { display: grid; place-items: center; font: 14px/1.5 system-ui, sans-serif; }
      a { color: #38e8ff; }
    </style>
  </head>
  <body>
    <p>Opening HIRO SEGAWA… <a href="${scope}">Continue</a></p>
  </body>
</html>
`;

await mkdir(dist, { recursive: true });
await writeFile(resolve(dist, '404.html'), html, 'utf8');
console.log(`generated dist/404.html (base ${scope})`);
