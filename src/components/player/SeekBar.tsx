import { useCallback, useEffect, useRef, useState } from 'react';
import { Slider } from '@/components/ui/Slider';
import { usePlayer } from '@/state/PlayerProvider';
import { cn, formatTime } from '@/lib/utils';

interface SeekBarProps {
  className?: string;
  size?: 'sm' | 'lg';
  showTimes?: boolean;
}

/** Progress bar with optimistic dragging so the thumb never fights the clock. */
export function SeekBar({ className, size = 'sm', showTimes = true }: SeekBarProps) {
  const { currentTime, duration, seek, isLoading } = usePlayer();
  const [draft, setDraft] = useState<number | null>(null);
  const draftRef = useRef<number | null>(null);

  const begin = useCallback(() => {
    draftRef.current = currentTime;
    setDraft(currentTime);
  }, [currentTime]);

  const change = useCallback((value: number) => {
    draftRef.current = value;
    setDraft(value);
  }, []);

  const commit = useCallback(() => {
    if (draftRef.current !== null) {
      seek(draftRef.current);
      draftRef.current = null;
      setDraft(null);
    }
  }, [seek]);

  useEffect(() => {
    if (draft === null) return;
    const onRelease = () => commit();
    window.addEventListener('pointerup', onRelease);
    window.addEventListener('pointercancel', onRelease);
    return () => {
      window.removeEventListener('pointerup', onRelease);
      window.removeEventListener('pointercancel', onRelease);
    };
  }, [draft, commit]);

  const value = draft ?? currentTime;
  const max = duration > 0 ? duration : 1;

  return (
    <div className={cn('group/seek flex w-full items-center gap-2.5', className)}>
      {showTimes ? (
        <span className="w-9 shrink-0 text-right text-[10px] tabular-nums text-white/55 sm:text-[11px]">
          {formatTime(value)}
        </span>
      ) : null}
      <div className="relative flex-1">
        <Slider
          value={value}
          max={max}
          step={0.1}
          size={size}
          ariaLabel="Seek through the track"
          onChange={change}
          onDragStart={begin}
          onDragEnd={commit}
          onCommit={() => commit()}
          disabled={duration <= 0 || isLoading}
        />
      </div>
      {showTimes ? (
        <span className="w-9 shrink-0 text-[10px] tabular-nums text-white/55 sm:text-[11px]">
          {formatTime(duration)}
        </span>
      ) : null}
    </div>
  );
}
