import { useEffect, useRef } from 'react';
import { audioEngine } from '@/audio/engine';
import { cn } from '@/lib/utils';
import { usePlayer } from '@/state/PlayerProvider';
import { useSettings } from '@/state/SettingsProvider';

interface VisualizerProps {
  className?: string;
  variant?: 'bars' | 'wave' | 'aurora';
  /** Decorative usage in the player bar — smaller, calmer. */
  compact?: boolean;
}

function cssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

/**
 * Audio-reactive visualizer.
 *
 * Reads real FFT data from the engine's AnalyserNode. When the browser refuses
 * audio analysis (unsupported Web Audio, blocked context, cross-origin media),
 * it renders a slow "ambient" motion instead and the UI labels it honestly.
 */
export function Visualizer({ className, variant = 'bars', compact = false }: VisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { isPlaying, analysisAvailable } = usePlayer();
  const { reducedMotion } = useSettings();
  const playingRef = useRef(isPlaying);

  useEffect(() => {
    playingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let frame = 0;
    let smooth: Float32Array<ArrayBuffer> | null = null;
    const start = performance.now();
    let disposed = false;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, Math.floor(rect.width));
      height = Math.max(1, Math.floor(rect.height));
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const accent = cssVar('--accent', '#38e8ff');
    const accent2 = cssVar('--accent-2', '#8b5cf6');
    const accent3 = cssVar('--accent-3', '#ff7ab8');

    const barCount = compact ? 28 : Math.max(24, Math.min(76, Math.floor(width / 12)));

    const ambientValue = (index: number, time: number): number => {
      const phase = (index / barCount) * Math.PI * 2;
      const slow = Math.sin(time * 0.55 + phase * 1.6) * 0.5 + 0.5;
      const medium = Math.sin(time * 1.25 + phase * 3.1) * 0.5 + 0.5;
      const detail = Math.sin(time * 2.4 + index * 0.9) * 0.5 + 0.5;
      return (slow * 0.5 + medium * 0.3 + detail * 0.2) * (compact ? 0.5 : 0.7);
    };

    const drawBars = (values: Float32Array<ArrayBuffer>, time: number) => {
      context.clearRect(0, 0, width, height);
      const gap = compact ? 2 : 3;
      const barWidth = Math.max(1.5, (width - gap * (barCount - 1)) / barCount);
      const totalWidth = barWidth * barCount + gap * (barCount - 1);
      const offsetX = (width - totalWidth) / 2;

      for (let i = 0; i < barCount; i += 1) {
        const value = Math.max(0.05, Math.min(1, values[i] ?? 0));
        const barHeight = Math.max(compact ? 2 : 3, value * height * 0.94);
        const x = offsetX + i * (barWidth + gap);
        const y = height - barHeight;
        const gradient = context.createLinearGradient(0, y, 0, height);
        gradient.addColorStop(0, accent);
        gradient.addColorStop(0.55, accent2);
        gradient.addColorStop(1, 'rgba(139,92,246,0.15)');
        context.fillStyle = gradient;
        context.shadowBlur = compact ? 6 : 16;
        context.shadowColor = accent;
        const radius = Math.min(barWidth / 2, 4);
        context.beginPath();
        context.roundRect(x, y, barWidth, barHeight, radius);
        context.fill();

        // Soft mirrored reflection for a cinematic feel.
        context.globalAlpha = 0.1;
        context.shadowBlur = 0;
        context.beginPath();
        context.roundRect(x, height - barHeight * 0.55, barWidth, Math.min(barHeight * 0.35, 22), radius);
        context.fill();
        context.globalAlpha = 1;
      }
      context.shadowBlur = 0;

      // Slow light sweep
      if (!compact && playingRef.current) {
        const sweep = ((time * 0.08) % 1) * width;
        const gradient = context.createLinearGradient(sweep - 80, 0, sweep + 80, 0);
        gradient.addColorStop(0, 'rgba(255,255,255,0)');
        gradient.addColorStop(0.5, 'rgba(255,255,255,0.05)');
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
        context.fillStyle = gradient;
        context.fillRect(0, 0, width, height);
      }
    };

    const drawWave = (values: Float32Array<ArrayBuffer>, time: number) => {
      context.clearRect(0, 0, width, height);
      const points = 90;
      const middle = height / 2;
      const gradient = context.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, accent);
      gradient.addColorStop(0.5, accent3);
      gradient.addColorStop(1, accent2);

      const path = new Path2D();
      for (let i = 0; i <= points; i += 1) {
        const ratio = i / points;
        const sourceIndex = Math.floor(ratio * (values.length - 1));
        const base = values[sourceIndex] ?? 0;
        const wobble = Math.sin(ratio * Math.PI * 4 + time * 0.9) * 0.08;
        const y = middle + (base * 0.85 + wobble) * (middle * 0.8) * Math.sin(ratio * Math.PI * 3 + 0.4);
        if (i === 0) path.moveTo(ratio * width, y);
        else path.lineTo(ratio * width, y);
      }

      context.lineWidth = compact ? 1.5 : 2.5;
      context.strokeStyle = gradient;
      context.shadowBlur = compact ? 8 : 22;
      context.shadowColor = accent;
      context.stroke(path);

      context.globalAlpha = 0.16;
      context.lineWidth = compact ? 5 : 11;
      context.stroke(path);
      context.globalAlpha = 1;
      context.shadowBlur = 0;
    };

    const drawAurora = (values: Float32Array<ArrayBuffer>, time: number) => {
      context.clearRect(0, 0, width, height);
      const blobs = compact ? 3 : 5;
      for (let i = 0; i < blobs; i += 1) {
        const energy = values[Math.floor((i / blobs) * values.length)] ?? 0.2;
        const x = width * (0.15 + 0.7 * ((i + 0.5) / blobs)) + Math.sin(time * 0.4 + i) * width * 0.05;
        const y = height * (0.62 - energy * 0.28) + Math.cos(time * 0.5 + i * 1.7) * height * 0.1;
        const radius = (compact ? 26 : 70) + energy * (compact ? 34 : 110);
        const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
        const color = i % 3 === 0 ? accent : i % 3 === 1 ? accent2 : accent3;
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, 'rgba(4,5,12,0)');
        context.globalAlpha = 0.16 + energy * 0.3;
        context.fillStyle = gradient;
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
      }
      context.globalAlpha = 1;
    };

    const render = (now: number) => {
      if (disposed) return;
      frame = requestAnimationFrame(render);
      const time = (now - start) / 1000;
      const active = playingRef.current ? 1 : 0.42;

      if (!smooth || smooth.length !== barCount) smooth = new Float32Array(barCount) as Float32Array<ArrayBuffer>;

      const data = analysisAvailable ? audioEngine.getFrequencyData() : null;
      if (data) {
        const usable = Math.min(data.length, Math.floor(data.length * 0.72));
        for (let i = 0; i < barCount; i += 1) {
          const from = Math.floor((i / barCount) * usable);
          const to = Math.max(from + 1, Math.floor(((i + 1) / barCount) * usable));
          let sum = 0;
          for (let j = from; j < to; j += 1) sum += data[j];
          const average = sum / (to - from) / 255;
          const target = Math.pow(average, 1.25) * (compact ? 0.85 : 1) * active;
          smooth[i] += (target - smooth[i]) * 0.22;
        }
      } else {
        for (let i = 0; i < barCount; i += 1) {
          const target = ambientValue(i, time) * active;
          smooth[i] += (target - smooth[i]) * 0.05;
        }
      }

      if (variant === 'wave') drawWave(smooth, time);
      else if (variant === 'aurora') drawAurora(smooth, time);
      else drawBars(smooth, time);
    };

    if (reducedMotion) {
      // A single static frame — no motion, but the component still renders.
      if (!smooth) smooth = new Float32Array(barCount) as Float32Array<ArrayBuffer>;
      for (let i = 0; i < barCount; i += 1) smooth[i] = ambientValue(i, 0) * 0.5;
      if (variant === 'wave') drawWave(smooth, 0);
      else if (variant === 'aurora') drawAurora(smooth, 0);
      else drawBars(smooth, 0);
    } else {
      frame = requestAnimationFrame(render);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [variant, compact, analysisAvailable, reducedMotion]);

  return (
    <div className={cn('relative', className)}>
      <canvas ref={canvasRef} className="size-full" aria-hidden />
      {!analysisAvailable ? (
        <span className="pointer-events-none absolute -top-1 right-0 text-[10px] uppercase tracking-[0.18em] text-white/30">
          ambient mode
        </span>
      ) : null}
    </div>
  );
}
