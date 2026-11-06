/**
 * The audio engine.
 *
 * A framework-agnostic singleton that owns exactly one HTMLAudioElement for the
 * lifetime of the app, so playback never stops when React routes change. On the
 * first play it also wires a Web Audio graph (MediaElementSource → Analyser →
 * Gain → destination) to feed the visualizer. If Web Audio is unavailable — or
 * the browser blocks analysis — the engine silently stays on the plain HTML5
 * path and reports `analysisAvailable: false` so the UI can fall back.
 */

export type EngineErrorCode = 'network' | 'decode' | 'unsupported' | 'blocked' | 'unknown';

export interface EngineSnapshot {
  src: string | null;
  playing: boolean;
  loading: boolean;
  currentTime: number;
  duration: number;
  buffered: number;
  volume: number;
  muted: boolean;
  rate: number;
  error: string | null;
  errorCode: EngineErrorCode | null;
  analysisAvailable: boolean;
}

type EngineListener = (snapshot: EngineSnapshot) => void;
type EngineTimeListener = (payload: { currentTime: number; duration: number; buffered: number }) => void;

type AudioContextConstructor = typeof AudioContext;

function getAudioContextConstructor(): AudioContextConstructor | null {
  if (typeof window === 'undefined') return null;
  const w = window as Window & { webkitAudioContext?: AudioContextConstructor };
  return window.AudioContext ?? w.webkitAudioContext ?? null;
}

class AudioEngine {
  private audio: HTMLAudioElement | null = null;
  private context: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private graphAttempted = false;
  private frequencyBuffer: Uint8Array<ArrayBuffer> | null = null;

  private listeners = new Set<EngineListener>();
  private timeListeners = new Set<EngineTimeListener>();
  private endedListeners = new Set<() => void>();

  private snapshot: EngineSnapshot = {
    src: null,
    playing: false,
    loading: false,
    currentTime: 0,
    duration: 0,
    buffered: 0,
    volume: 0.8,
    muted: false,
    rate: 1,
    error: null,
    errorCode: null,
    analysisAvailable: false,
  };

  private lastTimeEmit = 0;
  private pendingSeek: number | null = null;

  /* --------------------------------------------------------------- lifecycle */

  private ensureAudio(): HTMLAudioElement {
    if (this.audio) return this.audio;
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.setAttribute('playsinline', 'true');
    audio.volume = this.snapshot.muted ? 0 : this.snapshot.volume;

    audio.addEventListener('loadedmetadata', this.handleLoadedMetadata);
    audio.addEventListener('durationchange', this.handleLoadedMetadata);
    audio.addEventListener('timeupdate', this.handleTimeUpdate);
    audio.addEventListener('seeking', this.handleTimeUpdate);
    audio.addEventListener('progress', this.handleProgress);
    audio.addEventListener('waiting', this.handleWaiting);
    audio.addEventListener('stalled', this.handleWaiting);
    audio.addEventListener('canplay', this.handleCanPlay);
    audio.addEventListener('playing', this.handlePlaying);
    audio.addEventListener('pause', this.handlePause);
    audio.addEventListener('ended', this.handleEnded);
    audio.addEventListener('error', this.handleError);

    this.audio = audio;
    return audio;
  }

  /** Creates the Web Audio graph once. Safe to call repeatedly. */
  ensureGraph(): boolean {
    if (this.sourceNode && this.context) return true;
    if (this.graphAttempted) return this.snapshot.analysisAvailable;
    this.graphAttempted = true;

    const Ctx = getAudioContextConstructor();
    if (!Ctx) {
      this.patch({ analysisAvailable: false });
      return false;
    }

    try {
      const audio = this.ensureAudio();
      const context = new Ctx();
      const source = context.createMediaElementSource(audio);
      const analyser = context.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.82;
      analyser.minDecibels = -92;
      analyser.maxDecibels = -12;
      const gain = context.createGain();
      gain.gain.value = this.snapshot.muted ? 0 : this.snapshot.volume;

      source.connect(analyser);
      analyser.connect(gain);
      gain.connect(context.destination);

      this.context = context;
      this.sourceNode = source;
      this.analyserNode = analyser;
      this.gainNode = gain;
      this.frequencyBuffer = new Uint8Array(analyser.frequencyBinCount);
      // Element-level volume must be 1 now that the graph controls loudness.
      audio.volume = 1;
      this.patch({ analysisAvailable: true });
      return true;
    } catch {
      // The browser refused audio analysis — element playback continues untouched.
      this.graphAttempted = false;
      this.patch({ analysisAvailable: false, volume: this.snapshot.volume });
      return false;
    }
  }

  subscribe(listener: EngineListener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => {
      this.listeners.delete(listener);
    };
  }

  subscribeTime(listener: EngineTimeListener): () => void {
    this.timeListeners.add(listener);
    return () => {
      this.timeListeners.delete(listener);
    };
  }

  subscribeEnded(listener: () => void): () => void {
    this.endedListeners.add(listener);
    return () => {
      this.endedListeners.delete(listener);
    };
  }

  getSnapshot(): EngineSnapshot {
    return this.snapshot;
  }

  getFrequencyData(): Uint8Array<ArrayBuffer> | null {
    if (!this.analyserNode || !this.frequencyBuffer) return null;
    if (this.context?.state !== 'running') return null;
    this.analyserNode.getByteFrequencyData(this.frequencyBuffer);
    return this.frequencyBuffer;
  }

  getAnalyser(): AnalyserNode | null {
    return this.analyserNode;
  }

  /** Current position, including seeks requested before metadata arrived. */
  getCurrentTime(): number {
    if (this.pendingSeek !== null) return this.pendingSeek;
    return this.audio?.currentTime ?? 0;
  }

  /* --------------------------------------------------------------- playback */

  load(src: string, options: { autoplay?: boolean; startAt?: number } = {}): void {
    const audio = this.ensureAudio();
    const { autoplay = false, startAt = 0 } = options;

    this.pendingSeek = startAt > 0 ? startAt : null;
    this.patch({
      src,
      currentTime: startAt,
      duration: 0,
      buffered: 0,
      loading: true,
      error: null,
      errorCode: null,
      playing: false,
    });

    audio.src = src;
    audio.load();

    if (autoplay) {
      void this.play();
    }
  }

  async play(): Promise<boolean> {
    const audio = this.ensureAudio();
    if (!audio.src) return false;
    this.patch({ loading: true, error: null, errorCode: null });
    try {
      await audio.play();
      this.ensureGraph();
      if (this.context && this.context.state === 'suspended') {
        try {
          await this.context.resume();
        } catch {
          // Analysis may stay unavailable; audio is already playing.
        }
      }
      this.patch({ playing: true });
      return true;
    } catch (error) {
      const name = error instanceof Error ? error.name : '';
      const blocked = name === 'NotAllowedError' || name === 'AbortError';
      this.patch({
        playing: false,
        loading: false,
        error: blocked
          ? 'Your browser paused playback. Press play to start listening.'
          : 'Playback could not start. Please try again.',
        errorCode: blocked ? 'blocked' : 'unknown',
      });
      return false;
    }
  }

  pause(): void {
    this.audio?.pause();
  }

  async toggle(): Promise<void> {
    if (!this.audio?.src) return;
    if (this.audio.paused) await this.play();
    else this.pause();
  }

  seek(seconds: number): void {
    const audio = this.ensureAudio();
    const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    const target = Math.max(0, duration > 0 ? Math.min(seconds, duration - 0.05) : seconds);
    if (audio.readyState < 1) {
      // Metadata has not arrived yet — remember the position and apply it later.
      this.pendingSeek = target;
      this.patch({ currentTime: target });
      this.emitTime(true);
      return;
    }
    try {
      audio.currentTime = target;
      this.patch({ currentTime: target });
      this.emitTime(true);
    } catch {
      this.pendingSeek = target;
    }
  }

  stop(): void {
    const audio = this.audio;
    if (!audio) return;
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    this.patch({
      src: null,
      playing: false,
      loading: false,
      currentTime: 0,
      duration: 0,
      buffered: 0,
      error: null,
      errorCode: null,
    });
  }

  /* ------------------------------------------------------------------ levels */

  setVolume(volume: number): void {
    const clamped = Math.min(1, Math.max(0, volume));
    this.patch({ volume: clamped });
    this.applyGain();
  }

  setMuted(muted: boolean): void {
    this.patch({ muted });
    this.applyGain();
  }

  setRate(rate: number): void {
    const audio = this.ensureAudio();
    const clamped = Math.min(2, Math.max(0.5, rate));
    audio.defaultPlaybackRate = clamped;
    audio.playbackRate = clamped;
    this.patch({ rate: clamped });
  }

  private applyGain(): void {
    const audio = this.ensureAudio();
    const effective = this.snapshot.muted ? 0 : this.snapshot.volume;
    if (this.gainNode && this.context) {
      const now = this.context.currentTime;
      this.gainNode.gain.cancelScheduledValues(now);
      this.gainNode.gain.setTargetAtTime(effective, now, 0.02);
    } else {
      audio.volume = effective;
    }
  }

  /* ---------------------------------------------------------------- handlers */

  private handleLoadedMetadata = (): void => {
    const audio = this.ensureAudio();
    const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    if (this.pendingSeek !== null) {
      try {
        audio.currentTime = Math.min(this.pendingSeek, Math.max(0, duration - 0.05));
      } catch {
        // ignore — metadata timing edge case
      }
      this.pendingSeek = null;
    }
    this.patch({ duration, loading: false });
    this.emitTime(true);
  };

  private handleTimeUpdate = (): void => {
    this.patch({ currentTime: this.audio?.currentTime ?? 0 });
    this.emitTime(false);
  };

  private handleProgress = (): void => {
    const audio = this.audio;
    if (!audio) return;
    let buffered = 0;
    try {
      if (audio.buffered.length > 0) {
        buffered = audio.buffered.end(audio.buffered.length - 1);
      }
    } catch {
      buffered = 0;
    }
    this.patch({ buffered });
  };

  private handleWaiting = (): void => {
    this.patch({ loading: true });
  };

  private handleCanPlay = (): void => {
    this.patch({ loading: false, error: null, errorCode: null });
  };

  private handlePlaying = (): void => {
    this.patch({ playing: true, loading: false });
  };

  private handlePause = (): void => {
    this.patch({ playing: false, loading: false });
  };

  private handleEnded = (): void => {
    this.patch({ playing: false, loading: false, currentTime: this.snapshot.duration });
    for (const listener of this.endedListeners) listener();
  };

  private handleError = (): void => {
    const audio = this.audio;
    const code = audio?.error?.code ?? 0;
    const messages: Record<number, { message: string; code: EngineErrorCode }> = {
      1: { message: 'Playback was interrupted.', code: 'unknown' },
      2: { message: 'A network error stopped the audio. Check your connection and retry.', code: 'network' },
      3: { message: 'This audio file could not be decoded.', code: 'decode' },
      4: { message: 'This audio format is not supported by your browser.', code: 'unsupported' },
    };
    const mapped = messages[code] ?? {
      message: 'Something went wrong while playing this track.',
      code: 'unknown' as EngineErrorCode,
    };
    this.patch({
      loading: false,
      playing: false,
      error: mapped.message,
      errorCode: mapped.code,
    });
  };

  private emitTime(force: boolean): void {
    const now = performance.now();
    if (!force && now - this.lastTimeEmit < 120) return;
    this.lastTimeEmit = now;
    const payload = {
      currentTime: this.getCurrentTime(),
      duration: this.snapshot.duration,
      buffered: this.snapshot.buffered,
    };
    for (const listener of this.timeListeners) listener(payload);
  }

  private patch(partial: Partial<EngineSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...partial };
    for (const listener of this.listeners) listener(this.snapshot);
  }
}

export const audioEngine = new AudioEngine();
