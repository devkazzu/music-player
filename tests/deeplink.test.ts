import { describe, expect, it } from 'vitest';
import { resolveDeepLinkTarget } from '@/lib/deepLink';

describe('deep-link restoration (static hosts without SPA rewrites)', () => {
  it('restores client routes under the deployed base', () => {
    expect(resolveDeepLinkTarget('/music-player/playlists/pl-late-night-drive', '/music-player/')).toBe(
      '/music-player/playlists/pl-late-night-drive',
    );
    expect(resolveDeepLinkTarget('/music-player/search?q=neon', '/music-player/')).toBe(
      '/music-player/search?q=neon',
    );
  });

  it('works for root deployments', () => {
    expect(resolveDeepLinkTarget('/album/al-neon-requiem', '/')).toBe('/album/al-neon-requiem');
  });

  it('ignores links outside the deployment base', () => {
    expect(resolveDeepLinkTarget('/other-repo/playlists/x', '/music-player/')).toBeNull();
    expect(resolveDeepLinkTarget('https://evil.example/x', '/music-player/')).toBeNull();
  });

  it('ignores the app root and static asset requests', () => {
    expect(resolveDeepLinkTarget('/music-player/', '/music-player/')).toBeNull();
    expect(resolveDeepLinkTarget('/music-player/assets/index-abc.js', '/music-player/')).toBeNull();
    expect(resolveDeepLinkTarget('/music-player/audio/neon-requiem.mp3', '/music-player/')).toBeNull();
    expect(resolveDeepLinkTarget('/music-player/sw.js', '/music-player/')).toBeNull();
  });

  it('ignores empty input', () => {
    expect(resolveDeepLinkTarget(null, '/music-player/')).toBeNull();
    expect(resolveDeepLinkTarget('', '/music-player/')).toBeNull();
  });
});
