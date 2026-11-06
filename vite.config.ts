import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

/**
 * Deployment base. `/` for a normal root deploy (Cloudflare Pages, Netlify,
 * Vercel, Capacitor). Set `VITE_BASE=/<repo>/` for GitHub Pages project sites.
 */
const base = process.env.VITE_BASE || '/';
const scope = base.endsWith('/') ? base : `${base}/`;

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.png', 'art/*.jpg', 'art/*.png'],
      manifest: {
        name: 'HIRO SEGAWA — Sakura Dream',
        short_name: 'HIRO SEGAWA',
        description:
          'A Sakura Dream anime music player: falling cherry blossoms, eight cinematic themes, a real audio engine and an offline local library.',
        theme_color: '#0B0714',
        background_color: '#0B0714',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope,
        start_url: scope,
        id: scope,
        lang: 'en',
        dir: 'ltr',
        categories: ['music', 'entertainment'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,jpeg,webp,woff2,mp3,json}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        navigateFallback: scope === '/' ? 'index.html' : `${scope}index.html`,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'hiro-images',
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 90 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: true,
    allowedHosts: true,
    port: 5173,
  },
  preview: {
    host: true,
    allowedHosts: true,
    port: 4173,
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    chunkSizeWarningLimit: 900,
  },
});
