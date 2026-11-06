import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { FavouriteRecord, LocalTrackRecord, Playlist, RecentRecord } from '@/types';

const DB_NAME = 'hiro-segawa';
const DB_VERSION = 1;

interface KvRecord {
  key: string;
  value: unknown;
}

interface HiroDB extends DBSchema {
  tracks: {
    key: string;
    value: LocalTrackRecord;
    indexes: { 'by-added': number };
  };
  playlists: {
    key: string;
    value: Playlist;
    indexes: { 'by-updated': number };
  };
  favourites: {
    key: string;
    value: FavouriteRecord;
    indexes: { 'by-added': number };
  };
  recent: {
    key: string;
    value: RecentRecord;
    indexes: { 'by-played': number };
  };
  kv: {
    key: string;
    value: KvRecord;
  };
}

let dbPromise: Promise<IDBPDatabase<HiroDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<HiroDB>> {
  if (!dbPromise) {
    dbPromise = openDB<HiroDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('tracks')) {
          const store = db.createObjectStore('tracks', { keyPath: 'id' });
          store.createIndex('by-added', 'addedAt');
        }
        if (!db.objectStoreNames.contains('playlists')) {
          const store = db.createObjectStore('playlists', { keyPath: 'id' });
          store.createIndex('by-updated', 'updatedAt');
        }
        if (!db.objectStoreNames.contains('favourites')) {
          const store = db.createObjectStore('favourites', { keyPath: 'trackId' });
          store.createIndex('by-added', 'addedAt');
        }
        if (!db.objectStoreNames.contains('recent')) {
          const store = db.createObjectStore('recent', { keyPath: 'trackId' });
          store.createIndex('by-played', 'playedAt');
        }
        if (!db.objectStoreNames.contains('kv')) {
          db.createObjectStore('kv', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

/* ----------------------------------------------------------------- favourites */
export async function dbGetFavourites(): Promise<FavouriteRecord[]> {
  const db = await getDB();
  return db.getAllFromIndex('favourites', 'by-added');
}

export async function dbAddFavourite(trackId: string): Promise<FavouriteRecord> {
  const db = await getDB();
  const record: FavouriteRecord = { trackId, addedAt: Date.now() };
  await db.put('favourites', record);
  return record;
}

export async function dbRemoveFavourite(trackId: string): Promise<void> {
  const db = await getDB();
  await db.delete('favourites', trackId);
}

/* --------------------------------------------------------------- recent plays */
export async function dbGetRecent(): Promise<RecentRecord[]> {
  const db = await getDB();
  const records = await db.getAllFromIndex('recent', 'by-played');
  return records.reverse();
}

export async function dbRecordPlay(trackId: string): Promise<RecentRecord> {
  const db = await getDB();
  const existing = await db.get('recent', trackId);
  const record: RecentRecord = {
    trackId,
    playedAt: Date.now(),
    playCount: (existing?.playCount ?? 0) + 1,
  };
  await db.put('recent', record);
  return record;
}

export async function dbClearRecent(): Promise<void> {
  const db = await getDB();
  await db.clear('recent');
}

export async function dbRemoveRecent(trackId: string): Promise<void> {
  const db = await getDB();
  await db.delete('recent', trackId);
}

/* ------------------------------------------------------------------- playlists */
export async function dbGetPlaylists(): Promise<Playlist[]> {
  const db = await getDB();
  return db.getAll('playlists');
}

export async function dbSavePlaylist(playlist: Playlist): Promise<void> {
  const db = await getDB();
  await db.put('playlists', playlist);
}

export async function dbDeletePlaylist(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('playlists', id);
}

/* ------------------------------------------------------------- local audio files */
export async function dbGetLocalTracks(): Promise<LocalTrackRecord[]> {
  const db = await getDB();
  const records = await db.getAllFromIndex('tracks', 'by-added');
  return records.reverse();
}

export async function dbSaveLocalTrack(record: LocalTrackRecord): Promise<void> {
  const db = await getDB();
  await db.put('tracks', record);
}

export async function dbDeleteLocalTrack(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('tracks', id);
}

export async function dbUpdateLocalTrack(
  id: string,
  patch: Partial<Omit<LocalTrackRecord, 'id'>>,
): Promise<LocalTrackRecord | null> {
  const db = await getDB();
  const existing = await db.get('tracks', id);
  if (!existing) return null;
  const next: LocalTrackRecord = { ...existing, ...patch, id };
  await db.put('tracks', next);
  return next;
}

export async function dbTouchLocalTrack(id: string): Promise<void> {
  const db = await getDB();
  const existing = await db.get('tracks', id);
  if (!existing) return;
  await db.put('tracks', {
    ...existing,
    playCount: existing.playCount + 1,
    lastPlayedAt: Date.now(),
  });
}

/* ------------------------------------------------------------------- key / value */
export async function kvGet<T>(key: string, fallback: T): Promise<T> {
  const db = await getDB();
  const record = await db.get('kv', key);
  return record ? (record.value as T) : fallback;
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  const db = await getDB();
  await db.put('kv', { key, value });
}

/* ----------------------------------------------------------------- maintenance */
export async function dbClearStore(
  store: 'favourites' | 'recent' | 'playlists' | 'tracks' | 'kv',
): Promise<void> {
  const db = await getDB();
  await db.clear(store);
}

export async function dbStorageEstimate(): Promise<{ usage: number; quota: number }> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
    return { usage: 0, quota: 0 };
  }
  const estimate = await navigator.storage.estimate();
  return { usage: estimate.usage ?? 0, quota: estimate.quota ?? 0 };
}

export async function dbPersistStorage(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) return false;
  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
