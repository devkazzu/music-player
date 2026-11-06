import type { Album, Track } from '@/types';

export type TrackSort = 'default' | 'title' | 'artist' | 'album' | 'recent' | 'duration';

export const TRACK_SORT_LABELS: Record<TrackSort, string> = {
  default: 'Curated order',
  title: 'Title (A–Z)',
  artist: 'Artist (A–Z)',
  album: 'Album (A–Z)',
  recent: 'Recently played',
  duration: 'Duration',
};

const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });

/**
 * Pure, stable track sorting. `recentOrder` is a list of track ids from the
 * listening history (most recent first); unknown tracks fall to the bottom.
 */
export function sortTracks(
  tracks: Track[],
  sort: TrackSort,
  recentOrder: string[] = [],
  direction: 'asc' | 'desc' = 'asc',
): Track[] {
  const copy = [...tracks];
  const flip = direction === 'desc' ? -1 : 1;

  switch (sort) {
    case 'title':
      return copy.sort((a, b) => collator.compare(a.title, b.title) * flip);
    case 'artist':
      return copy.sort(
        (a, b) => collator.compare(a.artist, b.artist) * flip || collator.compare(a.title, b.title),
      );
    case 'album':
      return copy.sort(
        (a, b) =>
          collator.compare(a.album, b.album) * flip ||
          a.trackNumber - b.trackNumber ||
          collator.compare(a.title, b.title),
      );
    case 'duration':
      return copy.sort((a, b) => (a.duration - b.duration) * flip);
    case 'recent': {
      const positions = new Map(recentOrder.map((id, index) => [id, index]));
      return copy.sort((a, b) => {
        const aPos = positions.get(a.id);
        const bPos = positions.get(b.id);
        if (aPos === undefined && bPos === undefined) return collator.compare(a.title, b.title);
        if (aPos === undefined) return 1;
        if (bPos === undefined) return -1;
        return (aPos - bPos) * flip;
      });
    }
    default:
      return copy;
  }
}

export function sortAlbums(albums: Album[], direction: 'asc' | 'desc' = 'desc'): Album[] {
  const flip = direction === 'desc' ? -1 : 1;
  return [...albums].sort((a, b) => (a.year - b.year) * flip || collator.compare(a.title, b.title));
}

/** Case-insensitive "does this text contain the query" used by filter chips. */
export function matchesQuery(values: Array<string | undefined>, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return values.some((value) => value?.toLowerCase().includes(normalized));
}
