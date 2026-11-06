import type { AccentId, MotionPreference, PersistedQueue, RepeatMode, Settings, VisualizerStyle } from '@/types';
import { clamp } from './utils';

const SETTINGS_KEY = 'hiro:settings:v1';
const QUEUE_KEY = 'hiro:queue:v1';
const SEARCH_KEY = 'hiro:searches:v1';
const SPLASH_KEY = 'hiro:splash-entered:v1';
const INSTALL_KEY = 'hiro:install-dismissed:v1';

export const DEFAULT_SETTINGS: Settings = {
  volume: 0.8,
  muted: false,
  shuffle: false,
  repeat: 'all',
  rate: 1,
  accent: 'cyan',
  motion: 'system',
  visualizer: true,
  visualizerStyle: 'bars',
  showQueue: false,
  resumeLastTrack: true,
};

function readJSON<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJSON(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be full or blocked (private mode) — settings simply won't persist.
  }
}

const ACCENTS: AccentId[] = ['cyan', 'violet', 'sakura', 'gold'];
const MOTIONS: MotionPreference[] = ['system', 'reduced', 'full'];
const REPEATS: RepeatMode[] = ['off', 'all', 'one'];
const STYLES: VisualizerStyle[] = ['bars', 'wave', 'aurora'];

export function loadSettings(): Settings {
  const stored = readJSON<Partial<Settings>>(SETTINGS_KEY);
  if (!stored) return { ...DEFAULT_SETTINGS };
  return {
    volume: clamp(typeof stored.volume === 'number' ? stored.volume : DEFAULT_SETTINGS.volume, 0, 1),
    muted: typeof stored.muted === 'boolean' ? stored.muted : DEFAULT_SETTINGS.muted,
    shuffle: typeof stored.shuffle === 'boolean' ? stored.shuffle : DEFAULT_SETTINGS.shuffle,
    repeat: REPEATS.includes(stored.repeat as RepeatMode) ? (stored.repeat as RepeatMode) : DEFAULT_SETTINGS.repeat,
    rate: clamp(typeof stored.rate === 'number' ? stored.rate : DEFAULT_SETTINGS.rate, 0.5, 2),
    accent: ACCENTS.includes(stored.accent as AccentId) ? (stored.accent as AccentId) : DEFAULT_SETTINGS.accent,
    motion: MOTIONS.includes(stored.motion as MotionPreference)
      ? (stored.motion as MotionPreference)
      : DEFAULT_SETTINGS.motion,
    visualizer:
      typeof stored.visualizer === 'boolean' ? stored.visualizer : DEFAULT_SETTINGS.visualizer,
    visualizerStyle: STYLES.includes(stored.visualizerStyle as VisualizerStyle)
      ? (stored.visualizerStyle as VisualizerStyle)
      : DEFAULT_SETTINGS.visualizerStyle,
    showQueue: typeof stored.showQueue === 'boolean' ? stored.showQueue : DEFAULT_SETTINGS.showQueue,
    resumeLastTrack:
      typeof stored.resumeLastTrack === 'boolean'
        ? stored.resumeLastTrack
        : DEFAULT_SETTINGS.resumeLastTrack,
  };
}

export function saveSettings(settings: Settings): void {
  writeJSON(SETTINGS_KEY, settings);
}

export function loadQueue(): PersistedQueue | null {
  const stored = readJSON<PersistedQueue>(QUEUE_KEY);
  if (!stored || !Array.isArray(stored.trackIds) || stored.trackIds.length === 0) return null;
  return {
    trackIds: stored.trackIds.filter((id): id is string => typeof id === 'string'),
    index: typeof stored.index === 'number' ? stored.index : 0,
    time: typeof stored.time === 'number' ? stored.time : 0,
    label: typeof stored.label === 'string' ? stored.label : 'Your queue',
    updatedAt: typeof stored.updatedAt === 'number' ? stored.updatedAt : 0,
  };
}

export function saveQueue(queue: PersistedQueue): void {
  writeJSON(QUEUE_KEY, queue);
}

export function loadRecentSearches(): string[] {
  const stored = readJSON<string[]>(SEARCH_KEY);
  return Array.isArray(stored) ? stored.filter((s) => typeof s === 'string').slice(0, 8) : [];
}

export function saveRecentSearches(searches: string[]): void {
  writeJSON(SEARCH_KEY, searches.slice(0, 8));
}

export function hasEntered(): boolean {
  try {
    return window.sessionStorage.getItem(SPLASH_KEY) === '1';
  } catch {
    return false;
  }
}

export function markEntered(): void {
  try {
    window.sessionStorage.setItem(SPLASH_KEY, '1');
  } catch {
    // ignore
  }
}

export function clearEntered(): void {
  try {
    window.sessionStorage.removeItem(SPLASH_KEY);
  } catch {
    // ignore
  }
}

export function isInstallDismissed(): boolean {
  try {
    return window.localStorage.getItem(INSTALL_KEY) === '1';
  } catch {
    return true;
  }
}

export function markInstallDismissed(): void {
  try {
    window.localStorage.setItem(INSTALL_KEY, '1');
  } catch {
    // ignore
  }
}
