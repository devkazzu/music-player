import { describe, expect, it } from 'vitest';
import { matchesQuery, sortAlbums, sortTracks } from '@/lib/sorting';
import { ALBUMS, DEMO_TRACKS } from '@/data/catalog';

describe('sortTracks', () => {
  it('keeps curated order for the default sort', () => {
    expect(sortTracks(DEMO_TRACKS, 'default').map((t) => t.id)).toEqual(DEMO_TRACKS.map((t) => t.id));
  });

  it('sorts by title, artist, album and duration', () => {
    const titles = sortTracks(DEMO_TRACKS, 'title').map((t) => t.title);
    expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true })));

    const artists = sortTracks(DEMO_TRACKS, 'artist').map((t) => t.artist);
    expect(artists).toEqual([...artists].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true })));

    const durations = sortTracks(DEMO_TRACKS, 'duration').map((t) => t.duration);
    expect(durations).toEqual([...durations].sort((a, b) => a - b));
  });

  it('orders by recent history and pushes unknown tracks last', () => {
    const order = ['stellar-lullaby', 'neon-requiem'];
    const result = sortTracks(DEMO_TRACKS, 'recent', order);
    expect(result[0].id).toBe('stellar-lullaby');
    expect(result[1].id).toBe('neon-requiem');
    expect(result.slice(2).every((track) => !order.includes(track.id))).toBe(true);
  });

  it('does not mutate the input array', () => {
    const before = DEMO_TRACKS.map((t) => t.id);
    sortTracks(DEMO_TRACKS, 'title');
    expect(DEMO_TRACKS.map((t) => t.id)).toEqual(before);
  });
});

describe('sortAlbums', () => {
  it('sorts newest first by default', () => {
    const years = sortAlbums(ALBUMS).map((album) => album.year);
    expect(years).toEqual([...years].sort((a, b) => b - a));
  });
});

describe('matchesQuery', () => {
  it('matches case-insensitively across multiple fields', () => {
    expect(matchesQuery(['Neon Requiem', 'Kaori'], 'neon')).toBe(true);
    expect(matchesQuery(['Neon Requiem'], 'jazz')).toBe(false);
    expect(matchesQuery(['anything'], '')).toBe(true);
  });
});
