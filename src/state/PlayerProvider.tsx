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
import type { EngineErrorCode, EngineSnapshot } from '@/audio/engine';
import { audioEngine } from '@/audio/engine';
import type { RepeatMode, Track } from '@/types';
import {
  adjustIndexAfterMove,
  adjustIndexAfterRemoval,
  computeNextIndex,
} from '@/lib/queue';
import { loadQueue, saveQueue } from '@/lib/storage';
import { absoluteUrl, clamp, pickRandom } from '@/lib/utils';
import { useLibrary } from './LibraryProvider';
import { useSettings } from './SettingsProvider';
import { useUI } from './UIContext';

interface PlayOptions {
  /** Contextual queue, e.g. the album or playlist being viewed. */
  queue?: Track[];
  label?: string;
}

interface PlayerContextValue {
  queue: Track[];
  currentTrack: Track | null;
  index: number;
  contextLabel: string;
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  buffered: number;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  rate: number;
  error: string | null;
  errorCode: EngineErrorCode | null;
  analysisAvailable: boolean;
  restored: boolean;
  playTrack: (track: Track, options?: PlayOptions) => void;
  playQueue: (tracks: Track[], startIndex?: number, label?: string) => void;
  toggle: () => void;
  play: () => void;
  pause: () => void;
  next: () => void;
  previous: () => void;
  seek: (seconds: number) => void;
  seekBy: (delta: number) => void;
  setVolume: (value: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  setRepeat: (mode: RepeatMode) => void;
  setRate: (rate: number) => void;
  addToQueue: (track: Track) => void;
  addNext: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  moveInQueue: (from: number, to: number) => void;
  clearQueue: () => void;
  jumpTo: (index: number) => void;
  retry: () => void;
  stop: () => void;
  isCurrent: (trackId: string) => boolean;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

const REPEAT_LABEL: Record<RepeatMode, string> = {
  off: 'Repeat off',
  all: 'Repeat all',
  one: 'Repeat one',
};

export function PlayerProvider({ children }: { children: ReactNode }) {
  const { settings, update } = useSettings();
  const { tracksByIds, recordPlay, ready: libraryReady, getTrack } = useLibrary();
  const { toast } = useUI();

  const [queue, setQueue] = useState<Track[]>([]);
  const [index, setIndex] = useState(-1);
  const [contextLabel, setContextLabel] = useState('Your queue');
  const [engineState, setEngineState] = useState<EngineSnapshot>(() => audioEngine.getSnapshot());
  const [currentTime, setCurrentTime] = useState(0);
  const [engineDuration, setEngineDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [restored, setRestored] = useState(false);

  const recentIndices = useRef<number[]>([]);
  const history = useRef<string[]>([]);
  const timeRef = useRef(0);
  const restoredRef = useRef(false);
  const currentTrack = queue[index] ?? null;

  /* ---------------------------------------------------------- engine wiring */
  useEffect(() => {
    const unsubscribe = audioEngine.subscribe((snapshot) => {
      setEngineState(snapshot);
      setCurrentTime(snapshot.currentTime);
      if (snapshot.duration > 0) setEngineDuration(snapshot.duration);
      if (snapshot.buffered > 0 || snapshot.src === null) setBuffered(snapshot.buffered);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = audioEngine.subscribeTime(({ currentTime: time, duration, buffered: buf }) => {
      timeRef.current = time;
      setCurrentTime(time);
      if (duration > 0) setEngineDuration(duration);
      setBuffered(buf);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    audioEngine.setVolume(settings.volume);
  }, [settings.volume]);

  useEffect(() => {
    audioEngine.setMuted(settings.muted);
  }, [settings.muted]);

  useEffect(() => {
    audioEngine.setRate(settings.rate);
  }, [settings.rate]);

  /* --------------------------------------------------------------- helpers */
  const startTrack = useCallback((track: Track, autoplay = true, startAt = 0) => {
    setEngineDuration(0);
    setCurrentTime(startAt);
    audioEngine.load(track.src, { autoplay, startAt });
  }, []);

  const playTrack = useCallback<PlayerContextValue['playTrack']>(
    (track, options) => {
      const nextQueue = options?.queue && options.queue.length > 0 ? options.queue : [track];
      let startIndex = nextQueue.findIndex((item) => item.id === track.id);
      if (startIndex < 0) {
        nextQueue.unshift(track);
        startIndex = 0;
      }
      setQueue([...nextQueue]);
      setIndex(startIndex);
      setContextLabel(options?.label ?? 'Your queue');
      history.current = [];
      recentIndices.current = [startIndex];
      startTrack(track, true);
      recordPlay(track.id);
    },
    [recordPlay, startTrack],
  );

  const playQueue = useCallback<PlayerContextValue['playQueue']>(
    (tracks, startIndex = 0, label = 'Your queue') => {
      const list = tracks.filter(Boolean);
      if (list.length === 0) return;
      const safeIndex = clamp(startIndex, 0, list.length - 1);
      setQueue(list);
      setIndex(safeIndex);
      setContextLabel(label);
      history.current = [];
      recentIndices.current = [safeIndex];
      startTrack(list[safeIndex], true);
      recordPlay(list[safeIndex].id);
    },
    [recordPlay, startTrack],
  );

  const play = useCallback(() => {
    if (!currentTrack) {
      const featured = getTrack('neon-requiem');
      if (featured) playTrack(featured, { queue: [featured], label: 'Start listening' });
      return;
    }
    void audioEngine.play();
  }, [currentTrack, getTrack, playTrack]);

  const pause = useCallback(() => {
    audioEngine.pause();
  }, []);

  const toggle = useCallback(() => {
    if (!currentTrack) {
      play();
      return;
    }
    void audioEngine.toggle();
  }, [currentTrack, play]);

  const next = useCallback(() => {
    if (!currentTrack) return;
    const nextIndex = computeNextIndex({
      length: queue.length,
      index,
      repeat: settings.repeat,
      shuffle: settings.shuffle,
      recentIndices: recentIndices.current,
    });
    if (nextIndex === null) {
      audioEngine.pause();
      return;
    }
    history.current = [currentTrack.id, ...history.current].slice(0, 30);
    setIndex(nextIndex);
    startTrack(queue[nextIndex], true);
    recordPlay(queue[nextIndex].id);
    recentIndices.current = [nextIndex, ...recentIndices.current.filter((i) => i !== nextIndex)].slice(0, 3);
  }, [currentTrack, index, queue, recordPlay, settings.repeat, settings.shuffle, startTrack]);

  const previous = useCallback(() => {
    if (!currentTrack) return;
    if (currentTime > 3.2) {
      audioEngine.seek(0);
      return;
    }
    if (settings.shuffle) {
      const lastId = history.current[0];
      if (lastId) {
        const historyIndex = queue.findIndex((track) => track.id === lastId);
        if (historyIndex >= 0) {
          history.current = history.current.slice(1);
          setIndex(historyIndex);
          startTrack(queue[historyIndex], true);
          return;
        }
      }
      const randomIndex = pickRandom(
        queue.map((_, i) => i).filter((i) => i !== index),
      );
      if (typeof randomIndex === 'number' && queue[randomIndex]) {
        setIndex(randomIndex);
        startTrack(queue[randomIndex], true);
      }
      return;
    }
    const previousIndex = index - 1 >= 0 ? index - 1 : settings.repeat === 'all' ? queue.length - 1 : -1;
    if (previousIndex >= 0) {
      setIndex(previousIndex);
      startTrack(queue[previousIndex], true);
      recordPlay(queue[previousIndex].id);
    } else {
      audioEngine.seek(0);
    }
  }, [currentTime, currentTrack, index, queue, recordPlay, settings.repeat, settings.shuffle, startTrack]);

  const seek = useCallback((seconds: number) => {
    audioEngine.seek(Math.max(0, seconds));
  }, []);

  const seekBy = useCallback((delta: number) => {
    audioEngine.seek(Math.max(0, audioEngine.getCurrentTime() + delta));
  }, []);

  const setVolume = useCallback(
    (value: number) => {
      update({ volume: clamp(value, 0, 1), muted: false });
    },
    [update],
  );

  const toggleMute = useCallback(() => {
    update({ muted: !settings.muted });
  }, [settings.muted, update]);

  const toggleShuffle = useCallback(() => {
    const nextValue = !settings.shuffle;
    update({ shuffle: nextValue });
    toast({
      title: nextValue ? 'Shuffle on' : 'Shuffle off',
      description: nextValue ? 'The queue will play in a random order.' : 'The queue will play in order.',
      tone: 'default',
    });
  }, [settings.shuffle, toast, update]);

  const cycleRepeat = useCallback(() => {
    const order: RepeatMode[] = ['off', 'all', 'one'];
    const nextMode = order[(order.indexOf(settings.repeat) + 1) % order.length];
    update({ repeat: nextMode });
    toast({ title: REPEAT_LABEL[nextMode], tone: 'default' });
  }, [settings.repeat, toast, update]);

  const setRepeat = useCallback(
    (mode: RepeatMode) => {
      update({ repeat: mode });
    },
    [update],
  );

  const setRate = useCallback(
    (rate: number) => {
      update({ rate: clamp(rate, 0.5, 2) });
    },
    [update],
  );

  const addToQueue = useCallback(
    (track: Track) => {
      if (!currentTrack) {
        playTrack(track, { queue: [track], label: 'Your queue' });
        return;
      }
      setQueue((current) => [...current, track]);
      toast({ title: 'Added to queue', description: `${track.title} · ${track.artist}`, tone: 'success' });
    },
    [currentTrack, playTrack, toast],
  );

  const addNext = useCallback(
    (track: Track) => {
      if (!currentTrack) {
        playTrack(track, { queue: [track], label: 'Your queue' });
        return;
      }
      setQueue((current) => {
        const copy = [...current];
        copy.splice(index + 1, 0, track);
        return copy;
      });
      toast({ title: 'Playing next', description: `${track.title} · ${track.artist}`, tone: 'success' });
    },
    [currentTrack, index, playTrack, toast],
  );

  const removeFromQueue = useCallback(
    (removeIndex: number) => {
      if (removeIndex < 0 || removeIndex >= queue.length) return;
      const nextQueue = queue.filter((_, i) => i !== removeIndex);
      if (nextQueue.length === 0) {
        audioEngine.stop();
        setQueue([]);
        setIndex(-1);
        return;
      }
      const wasPlaying = engineState.playing;
      const nextCurrent = adjustIndexAfterRemoval(index, removeIndex, nextQueue.length);
      setQueue(nextQueue);
      setIndex(nextCurrent);
      if (removeIndex === index) {
        startTrack(nextQueue[nextCurrent], wasPlaying);
      }
    },
    [engineState.playing, index, queue, startTrack],
  );

  const moveInQueue = useCallback(
    (from: number, to: number) => {
      if (from === to || from < 0 || to < 0 || from >= queue.length || to >= queue.length) return;
      const nextQueue = [...queue];
      const [moved] = nextQueue.splice(from, 1);
      nextQueue.splice(to, 0, moved);
      setQueue(nextQueue);
      setIndex((current) => adjustIndexAfterMove(current, from, to));
    },
    [index, queue],
  );

  const clearQueue = useCallback(() => {
    if (!currentTrack) return;
    setQueue([currentTrack]);
    setIndex(0);
    toast({ title: 'Up next cleared', tone: 'default' });
  }, [currentTrack, toast]);

  const jumpTo = useCallback(
    (targetIndex: number) => {
      if (targetIndex < 0 || targetIndex >= queue.length) return;
      setIndex(targetIndex);
      startTrack(queue[targetIndex], true);
      recordPlay(queue[targetIndex].id);
    },
    [queue, recordPlay, startTrack],
  );

  const retry = useCallback(() => {
    if (!currentTrack) return;
    startTrack(currentTrack, true, audioEngine.getCurrentTime());
  }, [currentTrack, startTrack]);

  const stop = useCallback(() => {
    audioEngine.stop();
    setQueue([]);
    setIndex(-1);
    setCurrentTime(0);
    setEngineDuration(0);
    setContextLabel('Your queue');
  }, []);

  const isCurrent = useCallback((trackId: string) => currentTrack?.id === trackId, [currentTrack]);

  /* --------------------------------------------------------------- autoplay */
  const handleEnded = useCallback(() => {
    const repeat = settings.repeat;
    if (repeat === 'one' && currentTrack) {
      audioEngine.seek(0);
      void audioEngine.play();
      return;
    }
    const nextIndex = computeNextIndex({
      length: queue.length,
      index,
      repeat,
      shuffle: settings.shuffle,
      recentIndices: recentIndices.current,
    });
    if (nextIndex === null) return;
    const upcoming = queue[nextIndex];
    if (!upcoming) return;
    setIndex(nextIndex);
    startTrack(upcoming, true);
    recordPlay(upcoming.id);
    recentIndices.current = [nextIndex, ...recentIndices.current.filter((i) => i !== nextIndex)].slice(0, 3);
  }, [currentTrack, index, queue, recordPlay, settings.repeat, settings.shuffle, startTrack]);

  useEffect(() => audioEngine.subscribeEnded(handleEnded), [handleEnded]);

  /* ------------------------------------------------------- restore last song */
  useEffect(() => {
    if (!libraryReady || restoredRef.current) return;
    restoredRef.current = true;
    setRestored(true);
    if (!settings.resumeLastTrack) return;
    const saved = loadQueue();
    if (!saved) return;
    const tracks = tracksByIds(saved.trackIds);
    if (tracks.length === 0) return;
    const safeIndex = clamp(saved.index, 0, tracks.length - 1);
    const track = tracks[safeIndex];
    setQueue(tracks);
    setIndex(safeIndex);
    setContextLabel(saved.label);
    setEngineDuration(track.duration);
    setCurrentTime(0);
    audioEngine.load(track.src, { autoplay: false, startAt: saved.time });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [libraryReady]);

  /* ---------------------------------------------------------- persist queue */
  useEffect(() => {
    if (!restored || queue.length === 0 || index < 0) return;
    saveQueue({
      trackIds: queue.map((track) => track.id),
      index,
      time: timeRef.current,
      label: contextLabel,
      updatedAt: Date.now(),
    });
  }, [queue, index, contextLabel, restored, engineState.playing]);

  useEffect(() => {
    if (!engineState.playing || queue.length === 0 || index < 0) return;
    const interval = window.setInterval(() => {
      saveQueue({
        trackIds: queue.map((track) => track.id),
        index,
        time: timeRef.current,
        label: contextLabel,
        updatedAt: Date.now(),
      });
    }, 5000);
    return () => window.clearInterval(interval);
  }, [engineState.playing, queue, index, contextLabel]);

  /* ------------------------------------------------------------ media session */
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator) || !currentTrack) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: currentTrack.album,
        artwork: [
          {
            src: absoluteUrl(currentTrack.cover),
            sizes: '512x512',
            type: 'image/jpeg',
          },
        ],
      });
    } catch {
      // Media Session metadata is a progressive enhancement.
    }

    const handlers: Array<[MediaSessionAction, MediaSessionActionHandler]> = [
      ['play', () => void audioEngine.play()],
      ['pause', () => audioEngine.pause()],
      ['previoustrack', () => previous()],
      ['nexttrack', () => next()],
      [
        'seekto',
        (details) => {
          if (typeof details.seekTime === 'number') audioEngine.seek(details.seekTime);
        },
      ],
      ['seekbackward', () => seekBy(-10)],
      ['seekforward', () => seekBy(10)],
    ];

    for (const [action, handler] of handlers) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        // Unsupported action — ignore.
      }
    }

    return () => {
      for (const [action] of handlers) {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch {
          // ignore
        }
      }
    };
  }, [currentTrack, next, previous, seekBy]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    if (!currentTrack) return;
    try {
      navigator.mediaSession.playbackState = engineState.playing ? 'playing' : 'paused';
    } catch {
      // ignore
    }
  }, [engineState.playing, currentTrack]);

  const duration = engineDuration > 0 ? engineDuration : (currentTrack?.duration ?? 0);

  const value = useMemo<PlayerContextValue>(
    () => ({
      queue,
      currentTrack,
      index,
      contextLabel,
      isPlaying: engineState.playing,
      isLoading: engineState.loading,
      currentTime,
      duration,
      buffered,
      volume: settings.volume,
      muted: settings.muted,
      shuffle: settings.shuffle,
      repeat: settings.repeat,
      rate: settings.rate,
      error: engineState.error,
      errorCode: engineState.errorCode,
      analysisAvailable: engineState.analysisAvailable,
      restored,
      playTrack,
      playQueue,
      toggle,
      play,
      pause,
      next,
      previous,
      seek,
      seekBy,
      setVolume,
      toggleMute,
      toggleShuffle,
      cycleRepeat,
      setRepeat,
      setRate,
      addToQueue,
      addNext,
      removeFromQueue,
      moveInQueue,
      clearQueue,
      jumpTo,
      retry,
      stop,
      isCurrent,
    }),
    [
      queue,
      currentTrack,
      index,
      contextLabel,
      engineState.playing,
      engineState.loading,
      engineState.error,
      engineState.errorCode,
      engineState.analysisAvailable,
      currentTime,
      duration,
      buffered,
      settings.volume,
      settings.muted,
      settings.shuffle,
      settings.repeat,
      settings.rate,
      restored,
      playTrack,
      playQueue,
      toggle,
      play,
      pause,
      next,
      previous,
      seek,
      seekBy,
      setVolume,
      toggleMute,
      toggleShuffle,
      cycleRepeat,
      setRepeat,
      setRate,
      addToQueue,
      addNext,
      removeFromQueue,
      moveInQueue,
      clearQueue,
      jumpTo,
      retry,
      stop,
      isCurrent,
    ],
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer(): PlayerContextValue {
  const context = useContext(PlayerContext);
  if (!context) throw new Error('usePlayer must be used inside <PlayerProvider>');
  return context;
}
