/**
 * HIRO SEGAWA — shared domain types.
 * Everything the UI renders flows through these definitions.
 */

export type GenreId = 'cinematic' | 'lofi' | 'piano' | 'ambient' | 'acoustic' | 'synthwave';

export type MoodId =
  | 'night-drive'
  | 'rainy-focus'
  | 'golden-hour'
  | 'starlit-sleep'
  | 'city-lights'
  | 'nostalgia';

export type TrackSource = 'demo' | 'local';

export interface Track {
  id: string;
  title: string;
  artist: string;
  artistId: string;
  album: string;
  albumId: string;
  /** Seconds. Replaced by real media duration once the file loads. */
  duration: number;
  cover: string;
  /** Resolved playable URL. For local imports this is an object URL. */
  src: string;
  genres: GenreId[];
  moods: MoodId[];
  year: number;
  trackNumber: number;
  source: TrackSource;
  /** Present for user-imported audio. */
  localId?: string;
  fileName?: string;
  /** File size in bytes for imported audio. */
  size?: number;
  mimeType?: string;
}

export type ReleaseKind = 'Album' | 'EP' | 'Single' | 'Soundtrack';

export interface Album {
  id: string;
  title: string;
  artist: string;
  artistId: string;
  cover: string;
  year: number;
  kind: ReleaseKind;
  genres: GenreId[];
  moods: MoodId[];
  description: string;
  trackIds: string[];
  featured?: boolean;
}

export interface Artist {
  id: string;
  name: string;
  image: string;
  bio: string;
  origin: string;
  genres: GenreId[];
  monthlyListeners: number;
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  trackIds: string[];
  createdAt: number;
  updatedAt: number;
  seeded?: boolean;
}

export interface Mood {
  id: MoodId;
  label: string;
  japanese: string;
  description: string;
  cover: string;
  accent: string;
}

export interface GenreMeta {
  id: GenreId;
  label: string;
  description: string;
  cover: string;
}

export interface LocalTrackRecord {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  mimeType: string;
  size: number;
  fileName: string;
  blob: Blob;
  coverBlob?: Blob;
  year?: number;
  trackNumber?: number;
  addedAt: number;
  playCount: number;
  lastPlayedAt?: number;
}

export interface FavouriteRecord {
  trackId: string;
  addedAt: number;
}

export interface RecentRecord {
  trackId: string;
  playedAt: number;
  playCount: number;
}

export interface UserProfile {
  name: string;
  tagline: string;
  avatar: string;
  joinedAt: number;
}

export type RepeatMode = 'off' | 'all' | 'one';
export type ThemeId =
  | 'sakura'
  | 'moonlight'
  | 'cyber'
  | 'aqua'
  | 'sunset'
  | 'midnight'
  | 'koi'
  | 'emerald';
export type MotionPreference = 'system' | 'reduced' | 'full';
export type VisualizerStyle = 'bars' | 'wave' | 'aura';
export type SakuraIntensity = 'gentle' | 'normal' | 'heavy';
export type PerformanceMode = 'auto' | 'quality' | 'battery';

export interface Settings {
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  rate: number;
  theme: ThemeId;
  motion: MotionPreference;
  visualizer: boolean;
  visualizerStyle: VisualizerStyle;
  showQueue: boolean;
  resumeLastTrack: boolean;
  /** Sakura petal effect switch. */
  sakura: boolean;
  sakuraIntensity: SakuraIntensity;
  /** Cinematic background motion (moon drift, fog, parallax). */
  backgroundAnimation: boolean;
  /** Glow multiplier for buttons, artwork and the visualizer (0.4–1.6). */
  glow: number;
  performanceMode: PerformanceMode;
}

export interface PersistedQueue {
  trackIds: string[];
  index: number;
  time: number;
  label: string;
  updatedAt: number;
}

export type SearchKind = 'track' | 'album' | 'artist' | 'playlist';

export interface SearchHit {
  kind: SearchKind;
  id: string;
  title: string;
  subtitle: string;
  cover: string;
  score: number;
  href: string;
  track?: Track;
}

export interface SearchResults {
  query: string;
  tracks: Track[];
  albums: Album[];
  artists: Artist[];
  playlists: Playlist[];
  hits: SearchHit[];
  total: number;
}

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  tone: 'default' | 'success' | 'error' | 'info';
  action?: { label: string; onClick: () => void };
}

export interface ImportProgress {
  fileName: string;
  status: 'queued' | 'reading' | 'saving' | 'done' | 'error';
  message?: string;
  progress: number;
}

export interface LibraryStats {
  tracks: number;
  artists: number;
  albums: number;
  minutes: number;
  topArtist: { name: string; plays: number } | null;
  topGenre: GenreId | null;
}
