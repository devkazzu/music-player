# PWA installation verification (Android)

`npm run check:pwa` audits the production build for everything Chrome on Android requires before
offering **Install app**. It does not replace a real-device install test — this environment has no
Android device or Chrome build, so the device pass below is the step to run yourself.

## Automated checks (run in CI and locally)

```bash
npm run build            # or VITE_BASE=/music-player/ npm run build
npm run check:pwa
```

The audit fails the build if any of the following is missing or wrong:

- `<link rel="manifest">` in `index.html`, and the manifest is valid JSON with `name`,
  `start_url` (matching the deployment base), `scope`, `theme_color`, `background_color` and
  `display: standalone`.
- A 192×192 icon, a 512×512 icon and a `purpose: "maskable"` icon — each verified to be a real PNG
  with the declared pixel dimensions.
- `dist/sw.js` + its Workbox runtime, with a `fetch` handler, precaching `index.html` and the demo
  audio, and referencing the deployment base.
- `viewport-fit=cover` and a `theme-color` meta tag, and no root-relative asset URLs that bypass
  `VITE_BASE`.

Latest local result: **passed** for both `base=/` and `base=/music-player/`.

## Device checklist (Chrome on Android)

1. Deploy over **HTTPS** (Cloudflare Pages, Netlify, Vercel or GitHub Pages — all give you TLS).
   Service workers and installability do not work on plain HTTP.
2. Open the site in Chrome on the phone. The install prompt appears in the address-bar menu as
   **Add to Home screen / Install app**. The app also shows its own install banner (top bar) once
   `beforeinstallprompt` fires, and Settings → *Install HIRO SEGAWA* triggers the native prompt.
3. Install, then launch from the home-screen icon. It must open **standalone** — no URL bar, dark
   splash, `#05060f` background.
4. Verify the icon is not letterboxed in a circle (maskable icon) and the label reads
   **HIRO SEGAWA**.
5. Play a track, lock the screen and return: playback state and position survive.
6. Enable airplane mode, force-stop Chrome, relaunch the installed app: the shell and all nine
   demo tracks still load (service worker precache).
7. Chrome desktop → DevTools → **Application** → *Manifest* (no installability warnings) and
   *Service Workers* (activated, running) is a quick equivalent check.
8. Lighthouse → *Installable / PWA* category, run against the deployed URL.

### Known platform limits

- iOS Safari supports "Add to Home Screen" but not `beforeinstallprompt`; the in-app install
  button is hidden there by design.
- On Android, imported files live in the browser's storage; clearing site data removes them.
- If the app is deployed under a sub-path, install the **exact** deployed URL — the manifest scope
  is derived from `VITE_BASE`.
