# Deploying HIRO SEGAWA

The app is a fully static bundle: `npm run build` emits `dist/` and needs no server, database or
environment variables at runtime. Any static host with HTTPS works.

## Build

```bash
npm ci
npm run build        # tsc -b && vite build → dist/
npm run check:pwa    # audits dist/ for installability (manifest, icons, service worker)
```

Optional base path for sub-directory hosting (GitHub Pages project sites):

```bash
VITE_BASE=/music-player/ npm run build   # or: npm run build:pages
```

`VITE_BASE` is applied to the bundle, the web manifest (`start_url`, `scope`, `id`), the service
worker navigation fallback, the router basename and every catalogue artwork/audio URL, so a
sub-path deployment works end to end.

---

## Recommended: Cloudflare Pages (free)

Best free option for this project: unlimited bandwidth and requests, a global CDN, free HTTPS,
first-class SPA routing, PR preview deployments and no sub-path juggling — the app is served from
the domain root, where PWA scope is cleanest.

1. Push the repository to GitHub (already done).
2. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git** → pick the repo.
3. Framework preset: **None**. Build command `npm run build`. Build output directory `dist`.
4. Environment: `NODE_VERSION` = `22`. No secrets required.
5. Deploy. Every push to `main` publishes; every PR gets its own preview URL.

`public/_redirects` (`/* /index.html 200`) ships in the bundle, so deep links such as
`/playlists/<id>` resolve correctly.

### Alternatives

| Host | Free tier | Notes |
| --- | --- | --- |
| **Netlify** | 100 GB bandwidth/mo | Build `npm run build`, publish `dist`; `_redirects` already included. |
| **Vercel** | 100 GB bandwidth/mo | `vercel.json` in the repo rewrites all routes to `index.html`. |
| **GitHub Pages** | 100 GB/mo soft limit, 1 GB site | Supported by the included workflow; must be built with `VITE_BASE=/<repo>/`. |
| **Firebase Hosting** | 10 GB storage, 360 MB/day transfer | `firebase.json` rewrite to `/index.html`, `public: dist`. |

Because the app is 100 % client-side, no host has to deal with API latency, cold starts or
timeouts. The build is ~6.4 MB precached, dominated by the nine demo MP3s.

---

## GitHub Pages

GitHub Pages was verified against this repository's build:

- workflow: `.github/workflows/deploy-pages.yml`
- build base: `/${{ github.event.repository.name }}/` → `/music-player/`
- one-time setup: **Settings → Pages → Build and deployment → Source: GitHub Actions**
  (the workflow also attempts this automatically with its own token; if the API refuses, the step
  logs a warning and the manual toggle is required once)
- URL: `https://<owner>.github.io/<repo>/`

**Live deployment of this repository:** <https://devkazzu.github.io/music-player/> — served from
the workflow artifact, `manifest.webmanifest` reports `start_url`/`scope` = `/music-player/`.

Local verification performed for the sub-path build:

| Request | Result |
| --- | --- |
| `/music-player/` | 200 `text/html` |
| `/music-player/assets/index-*.js` | 200 `text/javascript` |
| `/music-player/manifest.webmanifest` | 200 `application/manifest+json` |
| `/music-player/sw.js` | 200 `text/javascript` |
| `/music-player/audio/neon-requiem.mp3` | 200 `audio/mpeg` |
| `/music-player/art/neon-requiem.jpg` | 200 `image/jpeg` |
| `/music-player/playlists/deep-link` | served via `404.html` → redirects to the app and restores the route |

Deep links: GitHub Pages cannot rewrite unknown paths to `index.html`, so the build emits
`404.html`, which stores the requested path in `sessionStorage` and bounces to the app root; the
app restores the route before the router mounts. This is verified by
`tests/deeplink.test.ts` and `npm run check:pwa`. Hosts with real rewrites never use the shim.

Limitations to keep in mind:

- Project sites are served from a sub-path, so the app must be built with `VITE_BASE`
  (the workflow does this automatically). A root-level `favicon` or asset reference would 404.
- Pages cannot send custom response headers. This app does not need any.
- A custom domain (`CNAME`, served at `/`) needs `VITE_BASE=/` instead — change the env value in
  the workflow before enabling the custom domain.
- Pages deployments are public. Do not deploy private material here.

If you want the PWA scope at the domain root and zero build configuration, prefer Cloudflare Pages.

---

## Production checklist

- [ ] `npm ci && npm run typecheck && npm test && npm run build && npm run check:pwa` all pass.
- [ ] Deployed over **HTTPS** (service workers and install prompts are unavailable on plain HTTP,
      except `localhost`).
- [ ] `/manifest.webmanifest` returns `application/manifest+json` and every icon URL resolves.
- [ ] `/sw.js` is served from the same origin and scope as the app.
- [ ] Deep link reload works (e.g. open `/playlists/<id>` in a fresh tab) — on GitHub Pages this
      goes through the `404.html` shim; on Netlify/Vercel/Cloudflare it is rewritten to `index.html`.
- [ ] First load, then offline reload: the shell and demo tracks still play.
- [ ] Install prompt appears on Android Chrome; the app opens without browser chrome.
- [ ] Artwork and audio are served from the site's own origin (no external CDNs).

## Updates and rollback

`vite-plugin-pwa` uses `registerType: 'autoUpdate'`: a new deployment precaches fresh hashed
assets, and clients pick the new shell up on next load (an "offline ready" toast confirms caching).
Old caches are cleaned via `cleanupOutdatedCaches`.

To roll back, redeploy the previous release tag (`v1.0.0` is preserved), or re-run the deploy
workflow from an earlier commit. Hashed filenames make rollbacks safe for already-cached clients.

## Privacy

There is no backend, no analytics, no cookies and no third-party requests. Imported audio,
playlists, favourites and settings stay in the visitor's browser storage.
