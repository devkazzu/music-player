import { describe, expect, it } from 'vitest';
import { searchLibrary, suggestionTerms, emptyResults } from '@/lib/search';
import { ALBUMS, ARTISTS, DEMO_TRACKS, SEED_PLAYLISTS } from '@/data/catalog';

const sources = {
  tracks: DEMO_TRACKS,
  albums: ALBUMS,
  artists: ARTISTS,
  playlists: SEED_PLAYLISTS,
};

describe('searchLibrary', () => {
  it('returns empty results for blank queries', () => {
    expect(searchLibrary('   ', sources)).toEqual(emptyResults('   '));
  });

  it('finds tracks by title and ranks the exact title first', () => {
    const results = searchLibrary('neon requiem', sources);
    expect(results.tracks[0].title).toBe('Neon Requiem');
    expect(results.total).toBeGreaterThan(0);
    expect(results.hits.length).toBeGreaterThan(0);
  });

  it('finds artists by name', () => {
    const results = searchLibrary('kaori', sources);
    expect(results.artists.some((artist) => artist.name === 'Kaori Amane')).toBe(true);
    expect(results.artists[0].name).toBe('Kaori Amane');
  });

  it('finds albums by description keywords', () => {
    const results = searchLibrary('lantern', sources);
    expect(results.albums.some((album) => album.title === 'Paper Lanterns')).toBe(true);
  });

  it('finds playlists by name', () => {
    const results = searchLibrary('sleep', sources);
    expect(results.playlists.some((playlist) => playlist.name === 'Sleep in the Stars')).toBe(true);
  });

  it('finds tracks by mood label', () => {
    const results = searchLibrary('rainy focus', sources);
    expect(results.tracks.length).toBeGreaterThan(0);
  });

  it('returns nothing for nonsense queries', () => {
    const results = searchLibrary('zzzz-not-a-track-9999', sources);
    expect(results.total).toBe(0);
    expect(results.hits).toHaveLength(0);
  });

  it('is case insensitive and tolerant of punctuation', () => {
    const results = searchLibrary('NEON-REQUIEM', sources);
    expect(results.tracks[0].title).toBe('Neon Requiem');
  });
});

describe('suggestionTerms', () => {
  it('suggests matching titles and artists', () => {
    const suggestions = suggestionTerms('neo', sources);
    expect(suggestions).toContain('Neon Requiem');
  });

  it('returns nothing for empty input', () => {
    expect(suggestionTerms('', sources)).toEqual([]);
  });
});
