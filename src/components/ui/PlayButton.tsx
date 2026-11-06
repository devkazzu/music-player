import { Loader2, Pause, Play } from 'lucide-react';
import type { Track } from '@/types';
import { cn } from '@/lib/utils';
import { usePlayer } from '@/state/PlayerProvider';

interface PlayButtonProps {
  tracks: Track[];
  label: string;
  startIndex?: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'fab' | 'solid';
  /** Rendered instead of the icon when provided (e.g. "Play all"). */
  showText?: string;
}

const SIZES = {
  sm: 'size-9',
  md: 'size-12',
  lg: 'size-14',
} as const;

const ICONS = {
  sm: 'size-4',
  md: 'size-5',
  lg: 'size-6',
} as const;

/**
 * Context-aware play control: starts the surrounding album/playlist, and
 * becomes a pause button when that exact context is already playing.
 */
export function PlayButton({
  tracks,
  label,
  startIndex = 0,
  className,
  size = 'md',
  variant = 'fab',
  showText,
}: PlayButtonProps) {
  const player = usePlayer();
  const inContext =
    player.contextLabel === label && tracks.some((track) => track.id === player.currentTrack?.id);
  const isActive = player.isPlaying && inContext;
  const isLoading = player.isLoading && inContext;
  const disabled = tracks.length === 0;

  const handleClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (isActive) {
      player.toggle();
      return;
    }
    player.playQueue(tracks, startIndex, label);
  };

  const icon = isLoading ? (
    <Loader2 className={cn(ICONS[size], 'animate-spin')} aria-hidden />
  ) : isActive ? (
    <Pause className={cn(ICONS[size], 'fill-current')} aria-hidden />
  ) : (
    <Play className={cn(ICONS[size], 'translate-x-[1px] fill-current')} aria-hidden />
  );

  if (showText) {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        aria-label={`${isActive ? 'Pause' : 'Play'} ${label}`}
        className={cn('btn', variant === 'solid' ? 'btn-primary' : 'btn-glass', '!px-5', className)}
      >
        {icon}
        <span>{isActive ? 'Pause' : showText}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      aria-label={`${isActive ? 'Pause' : 'Play'} ${label}`}
      className={cn(
        variant === 'solid'
          ? 'grid place-items-center rounded-full bg-white text-[#04060f] shadow-lg transition hover:scale-105 active:scale-95'
          : 'play-fab',
        SIZES[size],
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
    >
      {icon}
    </button>
  );
}
