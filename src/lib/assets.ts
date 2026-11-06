/**
 * Asset URL helpers.
 *
 * Vite's `BASE_URL` is `/` for a root deployment, `/<repo>/` for GitHub Pages
 * project sites, and `/` (or `./`) inside a Capacitor shell. Public-folder
 * paths must be resolved against it at runtime, otherwise artwork and audio
 * 404 when the app is not served from the domain root.
 */

/** Prefix a public-folder path with the deployment base. Idempotent. */
export function resolveAssetPath(path: string, base: string): string {
  if (!path) return path;
  if (/^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(path)) return path; // absolute URL
  if (path.startsWith('data:') || path.startsWith('blob:')) return path;

  const scope = base.endsWith('/') ? base : `${base}/`;
  const relative = path.replace(/^\/+/, '');
  if (scope !== '/' && path.startsWith(scope)) return path; // already resolved
  return `${scope}${relative}`;
}

/** Deployment base with a guaranteed trailing slash (`/` or `/repo/`). */
export const BASE_PATH = import.meta.env.BASE_URL || '/';

/** Resolve a `/public` path for the current deployment base. */
export function asset(path: string): string {
  return resolveAssetPath(path, BASE_PATH);
}

/** Router basename: `/` becomes `undefined`, `/repo/` becomes `/repo`. */
export const ROUTER_BASENAME = BASE_PATH.replace(/\/$/, '') || '/';
