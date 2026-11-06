import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type {
  Album,
  Artist,
  FavouriteRecord,
  ImportProgress,
  LibraryStats,
  LocalTrackRecord,
  Playlist,
  RecentRecord,
  Track,
  UserProfile,
} from '@/types';
import { asset } from '@/lib/assets';
import { ALBUMS, ARTISTS, DEMO_TRACKS, SEED_PLAYLISTS } from '@/data/catalog';
import {
  dbAddFavourite,
  dbClearRecent,
  dbClearStore,
  dbDeleteLocalTrack,
  dbDeletePlaylist,
  dbGetFavourites,
  dbGetLocalTracks,
  dbGetPlaylists,
  dbGetRecent,
  dbPersistStorage,
  dbRecordPlay,
  dbRemoveFavourite,
  dbRemoveRecent,
  dbSaveLocalTrack,
  dbSavePlaylist,
  dbStorageEstimate,
  dbTouchLocalTrack,
  dbUpdateLocalTrack,
  kvGet,
  kvSet,
} from '@/lib/db';
import {
  isSupportedAudioFile,
  parseAudioMetadata,
  readAudioDuration,
} from '@/lib/metadata';
import type { SearchSources } from '@/lib/search';
import { slugify, uid } from '@/lib/utils';
import { useUI } from './UIContext';

const DEFAULT_PROFILE: UserProfile = {
  name: 'Hiro Segawa',
  tagline: 'Night-drive listener · Tokyo',
  avatar: asset('/art/hiro-portrait.jpg'),
  joinedAt: 1_731_000_000_000,
};

const FALLBACK_COVER = asset('/art/rainy-street-wide.jpg');

interface UrlEntry {
  audio: string;
  cover?: string;
}

export interface ImportResult {
  imported: number;
  failed: number;
  unsupported: number;
}

interface LibraryContextValue {
  ready: boolean;
  initError: string | null;
  tracks: Track[];
  localTracks: Track[];
  albums: Album[];
  artists: Artist[];
  playlists: Playlist[];
  favourites: string[];
  favouriteTracks: Track[];
  recent: RecentRecord[];
  recentTracks: Track[];
  profile: UserProfile;
  importing: ImportProgress[];
  stats: LibraryStats;
  searchSources: SearchSources;
  getTrack: (id: string) => Track | undefined;
  getAlbum: (id: string) => Album | undefined;
  getArtist: (id: string) => Artist | undefined;
  getPlaylist: (id: string) => Playlist | undefined;
  tracksByIds: (ids: string[]) => Track[];
  isFavourite: (id: string) => boolean;
  toggleFavourite: (id: string) => void;
  recordPlay: (id: string) => void;
  clearRecent: () => Promise<void>;
  removeRecent: (id: string) => Promise<void>;
  createPlaylist: (input: {
    name: string;
    description?: string;
    trackIds?: string[];
  }) => Promise<Playlist | null>;
  updatePlaylist: (id: string, patch: { name?: string; description?: string }) => Promise<void>;
  deletePlaylist: (id: string) => Promise<void>;
  addTracksToPlaylist: (id: string, trackIds: string[]) => Promise<number>;
  removeTrackFromPlaylist: (id: string, trackId: string) => Promise<void>;
  movePlaylistTrack: (id: string, trackId: string, direction: -1 | 1) => Promise<void>;
  importFiles: (files: File[]) => Promise<ImportResult>;
  deleteLocalTrack: (id: string) => Promise<void>;
  updateLocalTrack: (
    id: string,
    patch: { title?: string; artist?: string; album?: string; year?: number },
  ) => Promise<void>;
  updateProfile: (patch: Partial<UserProfile>) => void;
  clearFavourites: () => Promise<void>;
  clearPlaylists: () => Promise<void>;
  eraseLibrary: () => Promise<void>;
  dismissImports: () => void;
  getStorageEstimate: () => Promise<{ usage: number; quota: number }>;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

function toLocalTrack(record: LocalTrackRecord, urls: UrlEntry): Track {
  const album = record.album?.trim() || 'Imported music';
  const artist = record.artist?.trim() || 'Unknown artist';
  return {
    id: record.id,
    title: record.title || record.fileName,
    artist,
    artistId: `local-artist-${slugify(artist)}`,
    album,
    albumId: `local-album-${slugify(album)}`,
    duration: record.duration,
    cover: urls.cover ?? FALLBACK_COVER,
    src: urls.audio,
    genres: [],
    moods: [],
    year: record.year ?? new Date(record.addedAt).getFullYear(),
    trackNumber: record.trackNumber ?? 1,
    source: 'local',
    localId: record.id,
    fileName: record.fileName,
    size: record.size,
    mimeType: record.mimeType,
  };
}

function buildLocalAlbums(tracks: Track[]): Album[] {
  const groups = new Map<string, Track[]>();
  for (const track of tracks) {
    const list = groups.get(track.albumId) ?? [];
    list.push(track);
    groups.set(track.albumId, list);
  }
  return [...groups.entries()].map(([id, list]) => {
    const sorted = [...list].sort((a, b) => a.trackNumber - b.trackNumber);
    return {
      id,
      title: sorted[0].album,
      artist: sorted[0].artist,
      artistId: sorted[0].artistId,
      cover: sorted[0].cover,
      year: sorted[0].year,
      kind: sorted.length > 2 ? 'Album' : sorted.length === 2 ? 'EP' : 'Single',
      genres: [],
      moods: [],
      description: `Your imported audio · ${sorted.length} ${sorted.length === 1 ? 'track' : 'tracks'}. Stored offline in this browser.`,
      trackIds: sorted.map((track) => track.id),
    } satisfies Album;
  });
}

function buildLocalArtists(tracks: Track[]): Artist[] {
  const groups = new Map<string, Track[]>();
  for (const track of tracks) {
    const list = groups.get(track.artistId) ?? [];
    list.push(track);
    groups.set(track.artistId, list);
  }
  return [...groups.entries()].map(([id, list]) => ({
    id,
    name: list[0].artist,
    image: list[0].cover,
    bio: 'Imported artist from your device. Your files, your library — kept entirely on this device.',
    origin: 'Local library',
    genres: [],
    monthlyListeners: 0,
  }));
}

export function LibraryProvider({ children }: { children: ReactNode }) {
  const { toast, notifyError } = useUI();
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [localTracks, setLocalTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [favourites, setFavourites] = useState<string[]>([]);
  const [recent, setRecent] = useState<RecentRecord[]>([]);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [importing, setImporting] = useState<ImportProgress[]>([]);
  const urlRegistry = useRef(new Map<string, UrlEntry>());
  const seededRef = useRef(false);

  /* ------------------------------------------------------------------- boot */
  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      try {
        const [records, storedPlaylists, favRecords, recentRecords, storedProfile, seeded] =
          await Promise.all([
            dbGetLocalTracks(),
            dbGetPlaylists(),
            dbGetFavourites(),
            dbGetRecent(),
            kvGet<UserProfile | null>('profile', null),
            kvGet<boolean>('seeded', false),
          ]);

        if (cancelled) return;

        const local = records.map((record) => {
          const urls = registerUrls(record);
          return toLocalTrack(record, urls);
        });

        let nextPlaylists = storedPlaylists;
        seededRef.current = seeded;
        if (!seeded) {
          const missing = SEED_PLAYLISTS.filter(
            (playlist) => !storedPlaylists.some((existing) => existing.id === playlist.id),
          );
          try {
            await Promise.all(missing.map((playlist) => dbSavePlaylist(playlist)));
            await kvSet('seeded', true);
            seededRef.current = true;
            nextPlaylists = [...storedPlaylists, ...missing];
          } catch {
            nextPlaylists = storedPlaylists;
          }
        }

        setLocalTracks(local);
        setPlaylists(sortPlaylists(nextPlaylists));
        setFavourites(favRecords.map((record) => record.trackId));
        setRecent(recentRecords);
        if (storedProfile) setProfile({ ...DEFAULT_PROFILE, ...storedProfile });
      } catch (error) {
        if (!cancelled) {
          setInitError(
            error instanceof Error
              ? error.message
              : 'Your browser blocked local storage, so the library could not load.',
          );
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    };

    void boot();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function registerUrls(record: LocalTrackRecord): UrlEntry {
    const existing = urlRegistry.current.get(record.id);
    if (existing) return existing;
    const entry: UrlEntry = { audio: URL.createObjectURL(record.blob) };
    if (record.coverBlob) entry.cover = URL.createObjectURL(record.coverBlob);
    urlRegistry.current.set(record.id, entry);
    return entry;
  }

  function releaseUrls(id: string): void {
    const entry = urlRegistry.current.get(id);
    if (!entry) return;
    URL.revokeObjectURL(entry.audio);
    if (entry.cover) URL.revokeObjectURL(entry.cover);
    urlRegistry.current.delete(id);
  }

  /* -------------------------------------------------------------- selectors */
  const tracks = useMemo<Track[]>(() => [...DEMO_TRACKS, ...localTracks], [localTracks]);

  const albums = useMemo<Album[]>(
    () => [...ALBUMS, ...buildLocalAlbums(localTracks)],
    [localTracks],
  );

  const artists = useMemo<Artist[]>(
    () => [...ARTISTS, ...buildLocalArtists(localTracks)],
    [localTracks],
  );

  const trackMap = useMemo(() => {
    const map = new Map<string, Track>();
    for (const track of tracks) map.set(track.id, track);
    return map;
  }, [tracks]);

  const albumMap = useMemo(() => {
    const map = new Map<string, Album>();
    for (const album of albums) map.set(album.id, album);
    return map;
  }, [albums]);

  const artistMap = useMemo(() => {
    const map = new Map<string, Artist>();
    for (const artist of artists) map.set(artist.id, artist);
    return map;
  }, [artists]);

  const getTrack = useCallback((id: string) => trackMap.get(id), [trackMap]);
  const getAlbum = useCallback((id: string) => albumMap.get(id), [albumMap]);
  const getArtist = useCallback((id: string) => artistMap.get(id), [artistMap]);
  const getPlaylist = useCallback(
    (id: string) => playlists.find((playlist) => playlist.id === id),
    [playlists],
  );

  const tracksByIds = useCallback(
    (ids: string[]): Track[] =>
      ids.map((id) => trackMap.get(id)).filter((track): track is Track => Boolean(track)),
    [trackMap],
  );

  const isFavourite = useCallback((id: string) => favourites.includes(id), [favourites]);

  const favouriteTracks = useMemo(
    () =>
      favourites
        .map((id) => trackMap.get(id))
        .filter((track): track is Track => Boolean(track)),
    [favourites, trackMap],
  );

  const recentTracks = useMemo(
    () => recent.map((entry) => trackMap.get(entry.trackId)).filter((track): track is Track => Boolean(track)),
    [recent, trackMap],
  );

  const searchSources = useMemo<SearchSources>(
    () => ({ tracks, albums, artists, playlists }),
    [tracks, albums, artists, playlists],
  );

  const stats = useMemo<LibraryStats>(() => {
    let seconds = 0;
    const artistPlays = new Map<string, number>();
    const genrePlays = new Map<string, number>();
    for (const entry of recent) {
      const track = trackMap.get(entry.trackId);
      if (!track) continue;
      seconds += track.duration * Math.max(1, entry.playCount);
      artistPlays.set(track.artist, (artistPlays.get(track.artist) ?? 0) + entry.playCount);
      for (const genre of track.genres) {
        genrePlays.set(genre, (genrePlays.get(genre) ?? 0) + entry.playCount);
      }
    }
    const topArtistEntry = [...artistPlays.entries()].sort((a, b) => b[1] - a[1])[0];
    const topGenreEntry = [...genrePlays.entries()].sort((a, b) => b[1] - a[1])[0];
    return {
      tracks: tracks.length,
      artists: new Set(tracks.map((track) => track.artist)).size,
      albums: new Set(tracks.map((track) => track.albumId)).size,
      minutes: seconds / 60,
      topArtist: topArtistEntry ? { name: topArtistEntry[0], plays: topArtistEntry[1] } : null,
      topGenre: (topGenreEntry?.[0] as LibraryStats['topGenre']) ?? null,
    };
  }, [recent, trackMap, tracks]);

  /* ------------------------------------------------------------- favourites */
  const toggleFavourite = useCallback(
    (trackId: string) => {
      if (!trackMap.has(trackId)) return;
      const currentlyFavourite = favourites.includes(trackId);
      setFavourites((current) =>
        currentlyFavourite ? current.filter((id) => id !== trackId) : [trackId, ...current],
      );
      const operation = currentlyFavourite
        ? dbRemoveFavourite(trackId)
        : dbAddFavourite(trackId).then(() => undefined);
      void operation.catch(() => {
        setFavourites((current) =>
          currentlyFavourite ? [trackId, ...current] : current.filter((id) => id !== trackId),
        );
        notifyError('Could not update favourites', 'Your browser storage may be full.');
      });
    },
    [favourites, trackMap, notifyError],
  );

  /* ------------------------------------------------------------------ recent */
  const recordPlay = useCallback(
    (trackId: string) => {
      if (!trackMap.has(trackId)) return;
      const entry: RecentRecord = { trackId, playedAt: Date.now(), playCount: 1 };
      setRecent((current) => {
        const existing = current.find((item) => item.trackId === trackId);
        const next: RecentRecord = {
          trackId,
          playedAt: Date.now(),
          playCount: (existing?.playCount ?? 0) + 1,
        };
        return [next, ...current.filter((item) => item.trackId !== trackId)];
      });
      void dbRecordPlay(trackId).catch(() => undefined);
      if (trackId.startsWith('loc-')) void dbTouchLocalTrack(trackId).catch(() => undefined);
      return entry;
    },
    [trackMap],
  );

  const clearRecent = useCallback(async () => {
    setRecent([]);
    try {
      await dbClearRecent();
      toast({ title: 'Listening history cleared', tone: 'success' });
    } catch {
      notifyError('Could not clear history');
    }
  }, [notifyError, toast]);

  const removeRecent = useCallback(
    async (trackId: string) => {
      setRecent((current) => current.filter((entry) => entry.trackId !== trackId));
      try {
        await dbRemoveRecent(trackId);
      } catch {
        notifyError('Could not remove that entry');
      }
    },
    [notifyError],
  );

  /* --------------------------------------------------------------- playlists */
  const createPlaylist = useCallback<LibraryContextValue['createPlaylist']>(
    async ({ name, description = '', trackIds = [] }) => {
      const trimmed = name.trim();
      if (!trimmed) return null;
      const now = Date.now();
      const playlist: Playlist = {
        id: uid('pl'),
        name: trimmed.slice(0, 80),
        description: description.trim().slice(0, 220),
        trackIds: [...new Set(trackIds)],
        createdAt: now,
        updatedAt: now,
      };
      setPlaylists((current) => [playlist, ...current]);
      try {
        await dbSavePlaylist(playlist);
        toast({
          title: 'Playlist created',
          description: `“${playlist.name}” is ready.`,
          tone: 'success',
        });
        return playlist;
      } catch {
        setPlaylists((current) => current.filter((item) => item.id !== playlist.id));
        notifyError('Could not save the playlist');
        return null;
      }
    },
    [notifyError, toast],
  );

  const updatePlaylist = useCallback<LibraryContextValue['updatePlaylist']>(
    async (id, patch) => {
      const existing = playlists.find((playlist) => playlist.id === id);
      if (!existing) return;
      const next: Playlist = {
        ...existing,
        ...patch,
        name: (patch.name ?? existing.name).trim().slice(0, 80) || existing.name,
        description: (patch.description ?? existing.description).trim().slice(0, 220),
        updatedAt: Date.now(),
      };
      setPlaylists((current) =>
        sortPlaylists(current.map((item) => (item.id === id ? next : item))),
      );
      try {
        await dbSavePlaylist(next);
      } catch {
        notifyError('Could not update the playlist');
      }
    },
    [notifyError, playlists],
  );

  const deletePlaylist = useCallback<LibraryContextValue['deletePlaylist']>(
    async (id) => {
      const existing = playlists.find((playlist) => playlist.id === id);
      setPlaylists((current) => current.filter((playlist) => playlist.id !== id));
      try {
        await dbDeletePlaylist(id);
        toast({
          title: 'Playlist deleted',
          description: existing ? `“${existing.name}” was removed.` : undefined,
          tone: 'default',
        });
      } catch {
        notifyError('Could not delete the playlist');
      }
    },
    [notifyError, playlists, toast],
  );

  const addTracksToPlaylist = useCallback<LibraryContextValue['addTracksToPlaylist']>(
    async (id, trackIds) => {
      const existing = playlists.find((playlist) => playlist.id === id);
      if (!existing) return 0;
      const unique = [...new Set(trackIds)].filter(
        (trackId) => trackMap.has(trackId) && !existing.trackIds.includes(trackId),
      );
      if (unique.length === 0) return 0;
      const next: Playlist = {
        ...existing,
        trackIds: [...existing.trackIds, ...unique],
        updatedAt: Date.now(),
      };
      setPlaylists((current) => sortPlaylists(current.map((item) => (item.id === id ? next : item))));
      try {
        await dbSavePlaylist(next);
        return unique.length;
      } catch {
        notifyError('Could not add tracks to the playlist');
        return 0;
      }
    },
    [notifyError, playlists, trackMap],
  );

  const removeTrackFromPlaylist = useCallback<LibraryContextValue['removeTrackFromPlaylist']>(
    async (id, trackId) => {
      const existing = playlists.find((playlist) => playlist.id === id);
      if (!existing) return;
      const next: Playlist = {
        ...existing,
        trackIds: existing.trackIds.filter((item) => item !== trackId),
        updatedAt: Date.now(),
      };
      setPlaylists((current) => current.map((item) => (item.id === id ? next : item)));
      try {
        await dbSavePlaylist(next);
      } catch {
        notifyError('Could not update the playlist');
      }
    },
    [notifyError, playlists],
  );

  const movePlaylistTrack = useCallback<LibraryContextValue['movePlaylistTrack']>(
    async (id, trackId, direction) => {
      const existing = playlists.find((playlist) => playlist.id === id);
      if (!existing) return;
      const index = existing.trackIds.indexOf(trackId);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= existing.trackIds.length) return;
      const trackIds = [...existing.trackIds];
      [trackIds[index], trackIds[target]] = [trackIds[target], trackIds[index]];
      const next: Playlist = { ...existing, trackIds, updatedAt: Date.now() };
      setPlaylists((current) => current.map((item) => (item.id === id ? next : item)));
      try {
        await dbSavePlaylist(next);
      } catch {
        notifyError('Could not reorder the playlist');
      }
    },
    [notifyError, playlists],
  );

  /* ------------------------------------------------------------ local import */
  const updateImportProgress = useCallback((fileName: string, patch: Partial<ImportProgress>) => {
    setImporting((current) =>
      current.map((item) => (item.fileName === fileName ? { ...item, ...patch } : item)),
    );
  }, []);

  const importFiles = useCallback<LibraryContextValue['importFiles']>(
    async (files) => {
      const supported = files.filter(isSupportedAudioFile);
      const unsupported = files.length - supported.length;
      let imported = 0;
      let failed = 0;

      if (supported.length === 0) {
        notifyError('No playable audio found', 'Use MP3, WAV, OGG, FLAC, M4A or AAC files.');
        return { imported: 0, failed: 0, unsupported };
      }

      setImporting(
        supported.map((file) => ({
          fileName: file.name,
          status: 'queued' as const,
          progress: 0,
        })),
      );

      void dbPersistStorage();

      for (const file of supported) {
        updateImportProgress(file.name, { status: 'reading', progress: 0.12 });
        try {
          const buffer = await file.arrayBuffer();
          const meta = parseAudioMetadata(buffer, file.name);
          updateImportProgress(file.name, { progress: 0.35 });
          const duration = await readAudioDuration(file);
          updateImportProgress(file.name, { status: 'saving', progress: 0.7 });

          const record: LocalTrackRecord = {
            id: uid('loc'),
            title: (meta.title ?? file.name).slice(0, 160),
            artist: (meta.artist ?? 'Unknown artist').slice(0, 120),
            album: (meta.album ?? 'Imported music').slice(0, 120),
            duration,
            mimeType: file.type || guessMime(file.name),
            size: file.size,
            fileName: file.name,
            blob: file,
            coverBlob: meta.coverBlob,
            year: meta.year,
            trackNumber: meta.trackNumber,
            addedAt: Date.now(),
            playCount: 0,
          };

          await dbSaveLocalTrack(record);
          const urls = registerUrls(record);
          const track = toLocalTrack(record, urls);
          setLocalTracks((current) => [track, ...current]);
          imported += 1;
          updateImportProgress(file.name, { status: 'done', progress: 1 });
        } catch (error) {
          failed += 1;
          updateImportProgress(file.name, {
            status: 'error',
            progress: 1,
            message: error instanceof Error ? error.message : 'Could not import this file.',
          });
        }
      }

      if (imported > 0) {
        toast({
          title: `${imported} ${imported === 1 ? 'track' : 'tracks'} imported`,
          description:
            failed > 0
              ? `${failed} file${failed === 1 ? '' : 's'} could not be read.`
              : 'Saved offline in this browser — find them in Local Library.',
          tone: 'success',
        });
      } else if (failed > 0) {
        notifyError('Import failed', 'None of the selected files could be read.');
      }
      if (unsupported > 0) {
        toast({
          title: `${unsupported} unsupported file${unsupported === 1 ? '' : 's'} skipped`,
          description: 'Supported formats: MP3, WAV, OGG, FLAC, M4A, AAC, WebM.',
          tone: 'info',
        });
      }

      return { imported, failed, unsupported };
    },
    [notifyError, toast, updateImportProgress],
  );

  const dismissImports = useCallback(() => setImporting([]), []);

  const deleteLocalTrack = useCallback<LibraryContextValue['deleteLocalTrack']>(
    async (id) => {
      const track = localTracks.find((item) => item.id === id);
      setLocalTracks((current) => current.filter((item) => item.id !== id));
      setFavourites((current) => current.filter((trackId) => trackId !== id));
      setRecent((current) => current.filter((entry) => entry.trackId !== id));
      const affected = playlists.filter((playlist) => playlist.trackIds.includes(id));
      setPlaylists((current) =>
        current.map((playlist) =>
          playlist.trackIds.includes(id)
            ? {
                ...playlist,
                trackIds: playlist.trackIds.filter((trackId) => trackId !== id),
                updatedAt: Date.now(),
              }
            : playlist,
        ),
      );
      releaseUrls(id);
      try {
        await dbDeleteLocalTrack(id);
        await dbRemoveFavourite(id);
        await dbRemoveRecent(id);
        await Promise.all(
          affected.map((playlist) =>
            dbSavePlaylist({
              ...playlist,
              trackIds: playlist.trackIds.filter((trackId) => trackId !== id),
              updatedAt: Date.now(),
            }),
          ),
        );
        toast({
          title: 'Track removed',
          description: track ? `“${track.title}” was deleted from this device.` : undefined,
          tone: 'default',
        });
      } catch {
        notifyError('Could not remove the file', 'It may already be missing from storage.');
      }
    },
    [localTracks, notifyError, playlists, toast],
  );

  const updateLocalTrack = useCallback<LibraryContextValue['updateLocalTrack']>(
    async (id, patch) => {
      try {
        const record = await dbUpdateLocalTrack(id, {
          title: patch.title?.trim() || undefined,
          artist: patch.artist?.trim() || undefined,
          album: patch.album?.trim() || undefined,
          year: patch.year,
        });
        if (!record) return;
        const urls = urlRegistry.current.get(record.id);
        if (!urls) return;
        const nextTrack = toLocalTrack(record, urls);
        setLocalTracks((current) => current.map((item) => (item.id === id ? nextTrack : item)));
        toast({ title: 'Track details updated', tone: 'success' });
      } catch {
        notifyError('Could not update the track details');
      }
    },
    [notifyError, toast],
  );

  /* ---------------------------------------------------------------- profile */
  const updateProfile = useCallback((patch: Partial<UserProfile>) => {
    setProfile((current) => {
      const next = { ...current, ...patch };
      void kvSet('profile', next).catch(() => undefined);
      return next;
    });
  }, []);

  /* ------------------------------------------------------------- maintenance */
  const clearFavourites = useCallback(async () => {
    setFavourites([]);
    try {
      await dbClearStore('favourites');
      toast({ title: 'Favourites cleared', tone: 'default' });
    } catch {
      notifyError('Could not clear favourites');
    }
  }, [notifyError, toast]);

  const clearPlaylists = useCallback(async () => {
    setPlaylists([]);
    try {
      await dbClearStore('playlists');
      toast({ title: 'Playlists cleared', tone: 'default' });
    } catch {
      notifyError('Could not clear playlists');
    }
  }, [notifyError, toast]);

  const eraseLibrary = useCallback(async () => {
    for (const entry of urlRegistry.current.keys()) releaseUrls(entry);
    setLocalTracks([]);
    setFavourites([]);
    setRecent([]);
    setPlaylists([]);
    try {
      await dbClearStore('tracks');
      await dbClearStore('favourites');
      await dbClearStore('recent');
      await dbClearStore('playlists');
      toast({
        title: 'Library erased',
        description: 'Local files, favourites, playlists and history were removed from this device.',
        tone: 'default',
      });
    } catch {
      notifyError('Could not erase everything', 'Some records may remain in IndexedDB.');
    }
  }, [notifyError, toast]);

  const getStorageEstimate = useCallback(() => dbStorageEstimate(), []);

  const value = useMemo<LibraryContextValue>(
    () => ({
      ready,
      initError,
      tracks,
      localTracks,
      albums,
      artists,
      playlists,
      favourites,
      favouriteTracks,
      recent,
      recentTracks,
      profile,
      importing,
      stats,
      searchSources,
      getTrack,
      getAlbum,
      getArtist,
      getPlaylist,
      tracksByIds,
      isFavourite,
      toggleFavourite,
      recordPlay,
      clearRecent,
      removeRecent,
      createPlaylist,
      updatePlaylist,
      deletePlaylist,
      addTracksToPlaylist,
      removeTrackFromPlaylist,
      movePlaylistTrack,
      importFiles,
      deleteLocalTrack,
      updateLocalTrack,
      updateProfile,
      clearFavourites,
      clearPlaylists,
      eraseLibrary,
      dismissImports,
      getStorageEstimate,
    }),
    [
      ready,
      initError,
      tracks,
      localTracks,
      albums,
      artists,
      playlists,
      favourites,
      favouriteTracks,
      recent,
      recentTracks,
      profile,
      importing,
      stats,
      searchSources,
      getTrack,
      getAlbum,
      getArtist,
      getPlaylist,
      tracksByIds,
      isFavourite,
      toggleFavourite,
      recordPlay,
      clearRecent,
      removeRecent,
      createPlaylist,
      updatePlaylist,
      deletePlaylist,
      addTracksToPlaylist,
      removeTrackFromPlaylist,
      movePlaylistTrack,
      importFiles,
      deleteLocalTrack,
      updateLocalTrack,
      updateProfile,
      clearFavourites,
      clearPlaylists,
      eraseLibrary,
      dismissImports,
      getStorageEstimate,
    ],
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

function sortPlaylists(playlists: Playlist[]): Playlist[] {
  return [...playlists].sort((a, b) => b.updatedAt - a.updatedAt);
}

function guessMime(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.wav')) return 'audio/wav';
  if (lower.endsWith('.ogg') || lower.endsWith('.oga')) return 'audio/ogg';
  if (lower.endsWith('.flac')) return 'audio/flac';
  if (lower.endsWith('.m4a')) return 'audio/mp4';
  if (lower.endsWith('.aac')) return 'audio/aac';
  if (lower.endsWith('.opus')) return 'audio/opus';
  if (lower.endsWith('.webm')) return 'audio/webm';
  return 'audio/mpeg';
}

export function useLibrary(): LibraryContextValue {
  const context = useContext(LibraryContext);
  if (!context) throw new Error('useLibrary must be used inside <LibraryProvider>');
  return context;
}

export type { FavouriteRecord };
