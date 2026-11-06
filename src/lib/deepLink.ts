import { BASE_PATH } from '@/lib/assets';

const DEEP_LINK_KEY = 'hiro:deep-link:v1';

/**
 * Validates a stored deep link against the deployment base.
 * Returns the path to restore, or null when it should be ignored.
 */
export function resolveDeepLinkTarget(stored: string | null, base: string): string | null {
  if (!stored) return null;
  if (!stored.startsWith(base)) return null;

  const rest = stored.slice(base.length);
  if (!rest || rest === '/') return null;

  // GitHub Pages also serves 404.html for missing files; never treat an asset
  // path as a client route.
  if (/^(?:assets|art|audio|icons|fonts)\//.test(rest)) return null;
  if (rest === 'sw.js' || rest === 'manifest.webmanifest' || rest === 'favicon.svg') return null;

  return base + rest;
}

/**
 * Restores a path captured by `404.html` on hosts without SPA rewrites.
 * Runs before the router mounts, so `BrowserRouter` sees the intended URL.
 */
export function restoreDeepLink(): void {
  try {
    const stored = window.sessionStorage.getItem(DEEP_LINK_KEY);
    if (!stored) return;
    window.sessionStorage.removeItem(DEEP_LINK_KEY);
    const target = resolveDeepLinkTarget(stored, BASE_PATH);
    if (target) window.history.replaceState(null, '', target);
  } catch {
    /* sessionStorage/history can be unavailable — the app still opens at home */
  }
}
