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
import type { Track } from '@/types';
import { useLibrary } from './LibraryProvider';
import { usePlayer } from './PlayerProvider';
import { useUI } from './UIContext';

const STORAGE_KEY = 'hiro:focus-timer:v1';

export interface FocusTimerState {
  durationSec: number;
  running: boolean;
  endsAt: number | null;
  remainingWhenPaused: number | null;
  completedAt: number | null;
}

interface FocusTimerContextValue {
  state: FocusTimerState;
  remainingSec: number;
  progress: number;
  lofiTracks: Track[];
  start: (minutes: number) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  presets: number[];
}

const FocusTimerContext = createContext<FocusTimerContextValue | null>(null);

const DEFAULT_STATE: FocusTimerState = {
  durationSec: 25 * 60,
  running: false,
  endsAt: null,
  remainingWhenPaused: null,
  completedAt: null,
};

function loadState(): FocusTimerState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<FocusTimerState>;
    return {
      durationSec: typeof parsed.durationSec === 'number' ? parsed.durationSec : DEFAULT_STATE.durationSec,
      running: Boolean(parsed.running),
      endsAt: typeof parsed.endsAt === 'number' ? parsed.endsAt : null,
      remainingWhenPaused:
        typeof parsed.remainingWhenPaused === 'number' ? parsed.remainingWhenPaused : null,
      completedAt: typeof parsed.completedAt === 'number' ? parsed.completedAt : null,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

/** A soft two-note chime synthesised on the fly — no audio file needed. */
function playCompletionChime() {
  try {
    const Ctx = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const context = new Ctx();
    const now = context.currentTime;
    [523.25, 783.99].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, now + index * 0.18);
      gain.gain.linearRampToValueAtTime(0.12, now + index * 0.18 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.18 + 1.4);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(now + index * 0.18);
      oscillator.stop(now + index * 0.18 + 1.5);
    });
    window.setTimeout(() => void context.close().catch(() => undefined), 2200);
  } catch {
    // Chime is a bonus; the timer works without it.
  }
}

export function FocusTimerProvider({ children }: { children: ReactNode }) {
  const { tracks } = useLibrary();
  const player = usePlayer();
  const { toast } = useUI();
  const [state, setState] = useState<FocusTimerState>(() => loadState());
  const [now, setNow] = useState(() => Date.now());
  const completedRef = useRef(false);

  const lofiTracks = useMemo(
    () => tracks.filter((track) => track.genres.includes('lofi') || track.genres.includes('ambient') || track.genres.includes('piano')),
    [tracks],
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore storage limits
    }
  }, [state]);

  const remainingSec = state.running && state.endsAt
    ? Math.max(0, Math.round((state.endsAt - now) / 1000))
    : (state.remainingWhenPaused ?? Math.round(state.durationSec));

  useEffect(() => {
    if (!state.running) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [state.running]);

  // Completion
  useEffect(() => {
    if (!state.running || !state.endsAt) return;
    if (state.endsAt > now) {
      completedRef.current = false;
      return;
    }
    if (completedRef.current) return;
    completedRef.current = true;
    setState((current) => ({
      ...current,
      running: false,
      endsAt: null,
      remainingWhenPaused: 0,
      completedAt: Date.now(),
    }));
    player.pause();
    playCompletionChime();
    toast({
      title: 'Focus session complete',
      description: 'Playback paused. Stand up, stretch and drink some water.',
      tone: 'success',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, state.running, state.endsAt]);

  const start = useCallback(
    (minutes: number) => {
      const seconds = Math.max(1, Math.round(minutes * 60));
      completedRef.current = false;
      setNow(Date.now());
      setState({
        durationSec: seconds,
        running: true,
        endsAt: Date.now() + seconds * 1000,
        remainingWhenPaused: null,
        completedAt: null,
      });
      if (lofiTracks.length > 0) {
        player.playQueue(lofiTracks, 0, 'Lofi focus session');
      }
      toast({
        title: `${minutes} minute focus session`,
        description: 'Lofi is playing. Playback pauses automatically when the timer ends.',
        tone: 'success',
      });
    },
    [lofiTracks, player, toast],
  );

  const pause = useCallback(() => {
    setState((current) => {
      if (!current.running || !current.endsAt) return current;
      const remaining = Math.max(0, Math.round((current.endsAt - Date.now()) / 1000));
      return { ...current, running: false, endsAt: null, remainingWhenPaused: remaining };
    });
    player.pause();
  }, [player]);

  const resume = useCallback(() => {
    setState((current) => {
      const remaining = current.remainingWhenPaused ?? current.durationSec;
      if (remaining <= 0) return current;
      return {
        ...current,
        running: true,
        endsAt: Date.now() + remaining * 1000,
        remainingWhenPaused: null,
        completedAt: null,
      };
    });
    completedRef.current = false;
    if (!player.isPlaying && lofiTracks.length > 0) {
      player.playQueue(lofiTracks, 0, 'Lofi focus session');
    } else {
      player.play();
    }
  }, [lofiTracks, player]);

  const reset = useCallback(() => {
    completedRef.current = false;
    setState((current) => ({
      ...DEFAULT_STATE,
      durationSec: current.durationSec,
      remainingWhenPaused: current.durationSec,
    }));
  }, []);

  const progress = state.durationSec > 0 ? 1 - remainingSec / state.durationSec : 0;

  const value = useMemo<FocusTimerContextValue>(
    () => ({ state, remainingSec, progress, lofiTracks, start, pause, resume, reset, presets: [15, 25, 50] }),
    [state, remainingSec, progress, lofiTracks, start, pause, resume, reset],
  );

  return <FocusTimerContext.Provider value={value}>{children}</FocusTimerContext.Provider>;
}

export function useFocusTimer(): FocusTimerContextValue {
  const context = useContext(FocusTimerContext);
  if (!context) throw new Error('useFocusTimer must be used inside <FocusTimerProvider>');
  return context;
}
