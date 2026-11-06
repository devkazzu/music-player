# HIRO SEGAWA — a cinematic music player

A complete, working music player for the web: midnight-city art direction, real HTML5 audio
playback that survives navigation, Web Audio visualisation, local file import, playlists,
favourites and a persistent queue.

Built with **React 19 + TypeScript + Vite**, **Tailwind CSS**, **Web Audio API**, **IndexedDB**
(via `idb`), **LocalStorage** and **Lucide** icons, and shipped as an installable **PWA**.

> All nine demo tracks and every piece of artwork are original assets created for this project —
> the audio is synthesised procedurally (`npm run gen:audio`), the artwork was generated for the
> app. No external image or audio URLs are referenced at runtime.

---

## Quick start

```bash
npm install      # install dependencies
npm run dev      # start the dev server (http://localhost:5173)
```

Production build and local preview:

```bash
npm run build    # type-check (tsc -b) then bundle with Vite → dist/
npm run preview  # serve the production build locally
```

Quality gates:

```bash
npm run typecheck  # tsc -b, strict mode, no emit
npm test           # vitest run — 58 tests, 8 files
npm run test:watch # watch mode
npm run lint       # tsc -b --force (full re-check)
npm run gen:audio  # regenerate the demo MP3s (deterministic)

# deployment / packaging
npm run check:pwa    # audit the built dist/ for PWA installability
npm run build:pages  # build with VITE_BASE=/music-player/ for GitHub Pages
npm run build:android # build without the service worker for Capacitor
```

Node 18+ is recommended. `npm run dev` / `build` / `preview` / `test` need no environment
variables, API keys or backend — everything runs in the browser.

---

## Screens

| Route | Screen |
| --- | --- |
| `/` | Splash / intro (session-scoped, skippable) |
| `/home` | Home dashboard — hero artwork, greeting, featured album, recently played, trending OSTs, recommendations, popular playlists, mood categories, favourites shortcut |
| `/explore` | Explore — mood/genre browsing, curated shelves, mood deep links (`?mood=night-drive`) |
| `/search` | Instant search across songs, artists, albums and playlists, suggestions, recent searches, empty/no-result states |
| `/soundtracks` | Anime Soundtracks collection |
| `/lofi` | Lofi Collection |
| `/playlists` | All playlists + create playlist |
| `/playlists/:playlistId` | Playlist detail — reorder, remove, rename, delete, play |
| `/favourites` | Favourite tracks |
| `/recent` | Recently played |
| `/album/:albumId` | Album detail |
| `/artist/:artistId` | Artist detail |
| `/now-playing` | Full-screen player — rotating artwork, ambient blur, Web Audio visualiser, particles, progress and full transport |
| `/profile` | Profile — listening stats, favourites, import summary, library reset |
| `/settings` | Settings — playback, appearance, motion, visualiser, storage, data export/erase |
| `/library` | Local Music Library — import, metadata editing, sorting, play, delete |
| `*` | Not-found screen with recovery links |

Layout: desktop sidebar + content + optional right-hand queue panel + persistent bottom player.
Mobile is a single column with a compact top bar, bottom navigation, a mini-player and an
expandable full-screen player (safe-area aware, tested down to small Android widths).

---

## Playback

A single audio engine (`src/audio/engine.ts`) owns exactly one `HTMLAudioElement`; React state
(`src/state/PlayerProvider.tsx`) subscribes to it. Because the element lives outside the React
tree, playback is never interrupted by navigation, re-renders or route transitions.

Implemented and wired to visible controls:

- play / pause, next / previous, previous-restarts-mid-song
- seek bar with pointer + keyboard interaction, current time and total duration
- volume, mute, playback speed (0.5×–2×)
- shuffle (never repeats the current track), repeat off / all / one
- queue: play next, add to queue, remove, reorder, jump to track, clear
- favourite toggle from the player, track rows and the full-screen player
- loading, buffering and error states, with a retry action and automatic skip on unplayable tracks
- lock-screen / hardware media keys via the Media Session API
- Web Audio `AnalyserNode` visualiser with three styles (bars, wave, aurora) and a graceful canvas/audio fallback
- `prefers-reduced-motion` respected globally, plus a manual motion toggle

### Keyboard shortcuts

Ignored while typing in inputs or when an interactive element has focus.

| Key | Action |
| --- | --- |
| `Space` | Play / pause |
| `←` / `→` | Seek −5s / +5s |
| `↑` / `↓` | Volume up / down |
| `M` | Mute |
| `S` | Shuffle |
| `R` | Cycle repeat mode |
| `N` / `P` | Next / previous |
| `F` | Toggle favourite for the current track |
| `Q` | Toggle the queue panel (desktop) or drawer (mobile) |
| `T` | Toggle reduced-motion preference |
| `/` or `Ctrl/⌘ K` | Jump to search |
| `Esc` | Leave the full-screen player |

---

## Importing and playing local music

1. Open **Library** (`/library`) in the sidebar or bottom nav.
2. Click **Import audio** (or drop files onto the page) and pick MP3, WAV, OGG/Opus, M4A/AAC,
   FLAC or WebM files. Multi-select works.
3. For each file the app reads ID3/MP4/FLAC/Vorbis metadata (title, artist, album, year), embedded
   cover art, and the real duration via the browser's audio decoder. Missing fields fall back to
   the file name and "Unknown artist".
4. The audio `Blob` and its artwork are stored in **IndexedDB**; object URLs are created at runtime
   from that blob, so importing is a one-time action. Imported tracks appear everywhere: search,
   library, playlists, favourites, recently played and the queue.
5. Play an imported track straight from the library. Use the row menu to edit title/artist/album,
   add to a playlist or queue, or delete the file (deleting the playing file stops playback first).
6. Reload the app — imports persist. Settings → *Storage* shows the estimated usage and lets you
   erase imported files and library data.

Notes:

- Browsers only decode formats they support (MP3/WAV/OGG everywhere; FLAC/AAC/Opus vary by
  browser). Unsupported files are reported in the import summary instead of failing silently.
- Metadata and artwork are read locally — nothing is uploaded anywhere.
- Files with DRM (e.g. protected M4P) cannot be imported.
- Settings → *Export library snapshot* downloads playlists, favourites and metadata as JSON (audio blobs are not included).

---

## Project structure

```
music-player/
├─ public/
│  ├─ audio/                    9 original demo tracks (MP3)
│  ├─ art/                      hero, portrait and album artwork
│  ├─ icons/                    PWA icons
│  ├─ audio/manifest.json        demo track metadata
│  └─ favicon.svg
├─ .github/workflows/           CI (typecheck + tests + build) and Pages deploy
├─ docs/                        DEPLOYMENT.md, PWA-VERIFICATION.md, ANDROID.md
├─ capacitor.config.json        Android/iOS packaging config (Capacitor)
├─ vercel.json                  SPA rewrites + asset headers for Vercel
├─ scripts/
│  ├─ generate-audio.mjs        deterministic demo-score synthesiser → MP3
│  └─ check-pwa.mjs             manifest / icon / service-worker audit of dist/
├─ src/
│  ├─ audio/engine.ts           HTMLAudioElement + Web Audio graph + subscriptions
│  ├─ components/
│  │  ├─ layout/                AppShell, Sidebar, TopBar, MobileNav
│  │  ├─ player/                PlayerBar, QueuePanel, SeekBar, VolumeControl, Visualizer
│  │  ├─ music/                 TrackList, TrackRow
│  │  ├─ cards/                 album / artist / playlist / track cards
│  │  └─ ui/                    Modal, Menu, Slider, Cover, Skeletons, EmptyState, Particles, …
│  ├─ data/catalog.ts           demo catalogue (tracks, artists, albums, playlists, moods)
│  ├─ hooks/                    keyboard shortcuts, page title, install prompt
│  ├─ lib/
│  │  ├─ db.ts                  IndexedDB schema + queries (audio blobs, playlists, history)
│  │  ├─ metadata.ts            ID3/MP4/FLAC/Vorbis parsing, artwork, duration probing
│  │  ├─ queue.ts               pure next-track / reorder / removal logic (unit tested)
│  │  ├─ search.ts              weighted multi-entity search
│  │  ├─ sorting.ts             title / artist / recently played sorters
│  │  ├─ storage.ts             typed LocalStorage helpers + settings schema
│  │  └─ utils.ts               formatting, slugify, uid, clamp, cn
│  ├─ pages/                    17 route screens (see table above)
│  ├─ state/                    SettingsProvider, PlayerProvider, LibraryProvider,
│  │                            UIContext (toasts/modals), FocusTimerProvider, PlaylistPicker
│  ├─ styles/index.css          design tokens, glassmorphism, animations, reduced motion
│  ├─ types/index.ts            shared domain types
│  ├─ App.tsx                   providers, router, error boundary
│  └─ main.tsx                  entry point + PWA registration
└─ tests/                       vitest + Testing Library suite
```

Design principles: one playback engine, one library store, typed domain models, pure logic pulled
out of components so it can be unit tested, and no duplicated player logic between the bar, the
full-screen view and the queue.

---

## Data & persistence

| Storage | Contents |
| --- | --- |
| IndexedDB (`hiro-segawa`) | Audio blobs, cover blobs, imported-track metadata, playlists, listening history, profile, seeded-data flag |
| LocalStorage | `hiro:settings:v1`, `hiro:queue:v1`, `hiro:searches:v1`, `hiro:splash-entered:v1`, `hiro:focus-timer:v1`, `hiro:install-dismissed:v1` |

Clearing site data resets the app; Settings offers explicit reset/erase actions instead.

---

## Testing

```bash
npm test
```

62 tests across 8 files run in jsdom with `fake-indexeddb` and stubbed media APIs:

- `tests/utils.test.ts` — formatting, slugify, clamping, uid, base-path asset resolution
- `tests/sorting.test.ts` — title/artist/recent sorters
- `tests/search.test.ts` — weighted search, entity filtering, empty and no-result cases
- `tests/metadata.test.ts` — metadata parsing paths and format detection
- `tests/queue.test.ts` — next-track selection (shuffle/repeat edge cases), index adjustment after
  removal and reorder
- `tests/app.smoke.test.tsx` — splash → home → explore, search, playback from the hero, favourite
  toggle, full-screen player, playlist creation
- `tests/player.test.tsx` — real playback state machine through the provider API: play/pause,
  absolute and relative seeking (including seeks before metadata loads), next/previous, queue
  mutation, persistence and favourites
- `tests/library.test.tsx` — seeded catalogue, playlist create/rename/add/remove/reorder/delete,
  duplicate handling, favourites, listening history, persistence across remounts

The suite covers the audio-state contract, not a media clock — jsdom has no real playback clock,
so relative seeks are asserted through the engine's reported position.

---

## Accessibility & motion

- Semantic landmarks, skip link, labelled icon buttons, `aria-live` toasts.
- Full keyboard operation of transport, seek bar, sliders, menus and dialogs; dialogs trap focus
  and close on `Esc`.
- Visible focus rings and AA-contrast text on dark glass surfaces.
- `prefers-reduced-motion` disables page transitions, parallax, particles and artwork rotation;
  it can also be toggled per-user in Settings.

---

## PWA

Production builds register a service worker (Workbox `generateSW`) that precaches the shell,
fonts, artwork and demo audio, so the app and its demo library work offline. An "offline ready"
toast appears once caching completes. Install from the browser menu (or the in-app install
prompt) for a standalone window.

---

## Deployment

The build is a fully static `dist/`. `npm run check:pwa` audits it for installability before you
ship, and `VITE_BASE` makes sub-path hosting work end to end.

**Recommended free host: Cloudflare Pages** — unlimited bandwidth, global CDN, free HTTPS, PR
previews and root-domain hosting (cleanest PWA scope). Build command `npm run build`, output
`dist`, Node 22. Netlify (uses the bundled `_redirects`) and Vercel (uses `vercel.json`) are
equally straightforward. **GitHub Pages is supported** by
`.github/workflows/deploy-pages.yml`, which builds with `VITE_BASE=/<repo>/`; GitHub Pages was the
only option needing extra configuration, and its sub-path deployment was verified locally.

Full details, the post-deploy checklist, update/rollback notes and the hosting comparison live in
[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## Installing on Android

The app installs as a PWA: open the deployed HTTPS URL in Chrome → menu → **Install app** (or use
the in-app install button). `npm run check:pwa` verifies the manifest, 192/512/maskable icons and
the precached shell; device steps and known platform limits are in
[`docs/PWA-VERIFICATION.md`](docs/PWA-VERIFICATION.md).

## Packaging as an Android APK

Capacitor is preconfigured (`capacitor.config.json`, app id `com.hirosegawa.player`,
`webDir: dist`). Short version:

```bash
npm install @capacitor/core @capacitor/android
npm install --save-dev @capacitor/cli
npx cap add android
npm run build:android && npx cap sync android
cd android && ./gradlew assembleDebug   # → app/build/outputs/apk/debug/app-debug.apk
```

Signing, AAB builds, icons/splash, background-playback caveats and troubleshooting are covered in
[`docs/ANDROID.md`](docs/ANDROID.md).

## Browser support

Latest Chrome, Edge, Firefox and Safari (desktop and mobile). Requires `HTMLAudioElement`,
`IndexedDB` and ES2020+. The visualiser needs `AudioContext`; if it is unavailable (or blocked),
the player falls back to a CSS-only animation with no functional loss.

---

## Credits

Demo score composed and synthesised for this project by `scripts/generate-audio.mjs`
(deterministic, no samples, encoded with a pure-JS LAME encoder). Artwork generated for this
project. Fonts: Inter and Cormorant Garamond via Fontsource (SIL OFL). Icons: Lucide (ISC).
