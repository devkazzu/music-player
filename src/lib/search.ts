import type {
  Album,
  Artist,
  GenreId,
  Playlist,
  SearchHit,
  SearchResults,
  Track,
} from '@/types';
import { GENRE_BY_ID, MOOD_BY_ID } from '@/data/catalog';

export interface SearchSources {
  tracks: Track[];
  albums: Album[];
  artists: Artist[];
  playlists: Playlist[];
}

function normalize(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isSubsequence(needle: string, haystack: string): boolean {
  if (!needle) return false;
  let index = 0;
  for (let i = 0; i < haystack.length && index < needle.length; i += 1) {
    if (haystack[i] === needle[index]) index += 1;
  }
  return index === needle.length;
}

function matchScore(text: string, query: string, tokens: string[]): number {
  const target = normalize(text);
  if (!target) return 0;
  if (target === query) return 130;
  if (target.startsWith(query)) return 104;

  let score = 0;
  if (target.split(' ').some((word) => word.startsWith(query))) score = 88;
  if (target.includes(query)) score = Math.max(score, 68);

  // Only tokens with real substance contribute — single letters would otherwise
  // match almost every title.
  const meaningfulTokens = tokens.filter((token) => token.length >= 2);
  const matchedTokens = meaningfulTokens.filter((token) => target.includes(token)).length;
  if (meaningfulTokens.length > 0 && matchedTokens === meaningfulTokens.length) {
    score = Math.max(score, 46 + meaningfulTokens.length * 5);
  } else if (matchedTokens > 0 && meaningfulTokens.length > 1) {
    score = Math.max(score, 20 + matchedTokens * 7);
  }

  if (score === 0 && query.length >= 4 && isSubsequence(query.replace(/\s/g, ''), target.replace(/\s/g, ''))) {
    score = 24;
  }
  return score;
}

function trackScore(track: Track, query: string, tokens: string[]): number {
  const genreText = [...track.genres.map((g) => GENRE_BY_ID[g]?.label ?? ''), ...track.moods.map((m) => MOOD_BY_ID[m]?.label ?? '')].join(' ');
  const breakdown =
    matchScore(track.title, query, tokens) * 1.5 +
    matchScore(track.artist, query, tokens) * 1.15 +
    matchScore(track.album, query, tokens) * 0.85 +
    matchScore(genreText, query, tokens) * 0.3 +
    (track.source === 'local' ? 2 : 0);
  return breakdown;
}

function albumScore(album: Album, query: string, tokens: string[]): number {
  return (
    matchScore(album.title, query, tokens) * 1.4 +
    matchScore(album.artist, query, tokens) * 1.0 +
    matchScore(album.description, query, tokens) * 0.2
  );
}

function artistScore(artist: Artist, query: string, tokens: string[]): number {
  const genreText = artist.genres.map((g) => GENRE_BY_ID[g as GenreId]?.label ?? '').join(' ');
  return matchScore(artist.name, query, tokens) * 1.5 + matchScore(genreText, query, tokens) * 0.25;
}

function playlistScore(playlist: Playlist, query: string, tokens: string[]): number {
  return (
    matchScore(playlist.name, query, tokens) * 1.3 +
    matchScore(playlist.description, query, tokens) * 0.35
  );
}

export function emptyResults(query = ''): SearchResults {
  return { query, tracks: [], albums: [], artists: [], playlists: [], hits: [], total: 0 };
}

/**
 * Scores the entire library against a query and returns grouped results plus a
 * flattened, ranked list used by the quick-results panel.
 */
export function searchLibrary(rawQuery: string, sources: SearchSources): SearchResults {
  const query = normalize(rawQuery);
  if (query.length === 0) return emptyResults(rawQuery);
  const tokens = query.split(' ').filter(Boolean);

  const tracks = sources.tracks
    .map((track) => ({ track, score: trackScore(track, query, tokens) }))
    .filter((item) => item.score >= 20)
    .sort((a, b) => b.score - a.score || a.track.title.localeCompare(b.track.title))
    .map((item) => item.track);

  const albums = sources.albums
    .map((album) => ({ album, score: albumScore(album, query, tokens) }))
    .filter((item) => item.score >= 20)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.album);

  const artists = sources.artists
    .map((artist) => ({ artist, score: artistScore(artist, query, tokens) }))
    .filter((item) => item.score >= 20)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.artist);

  const playlists = sources.playlists
    .map((playlist) => ({ playlist, score: playlistScore(playlist, query, tokens) }))
    .filter((item) => item.score >= 20)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.playlist);

  const hits: SearchHit[] = [
    ...artists.slice(0, 3).map((artist, index) => ({
      kind: 'artist' as const,
      id: artist.id,
      title: artist.name,
      subtitle: 'Artist',
      cover: artist.image,
      score: artistScore(artist, query, tokens) + 4 - index,
      href: `/artist/${artist.id}`,
    })),
    ...tracks.slice(0, 6).map((track, index) => ({
      kind: 'track' as const,
      id: track.id,
      title: track.title,
      subtitle: `${track.artist} · ${track.album}`,
      cover: track.cover,
      score: trackScore(track, query, tokens) - index,
      href: `/album/${track.albumId}`,
      track,
    })),
    ...albums.slice(0, 4).map((album, index) => ({
      kind: 'album' as const,
      id: album.id,
      title: album.title,
      subtitle: `${album.artist} · ${album.year}`,
      cover: album.cover,
      score: albumScore(album, query, tokens) + 2 - index,
      href: `/album/${album.id}`,
    })),
    ...playlists.slice(0, 3).map((playlist, index) => ({
      kind: 'playlist' as const,
      id: playlist.id,
      title: playlist.name,
      subtitle: `${playlist.trackIds.length} tracks`,
      cover: '',
      score: playlistScore(playlist, query, tokens) - index,
      href: `/playlists/${playlist.id}`,
    })),
  ]
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  return {
    query: rawQuery,
    tracks,
    albums,
    artists,
    playlists,
    hits,
    total: tracks.length + albums.length + artists.length + playlists.length,
  };
}

/** Turns a free-text query into a small set of search suggestions. */
export function suggestionTerms(query: string, sources: SearchSources): string[] {
  const normalized = normalize(query);
  if (!normalized) return [];
  const pool = new Set<string>();
  for (const track of sources.tracks) {
    if (normalize(track.title).includes(normalized)) pool.add(track.title);
    if (normalize(track.artist).includes(normalized)) pool.add(track.artist);
  }
  for (const album of sources.albums) {
    if (normalize(album.title).includes(normalized)) pool.add(album.title);
  }
  return [...pool].slice(0, 6);
}
