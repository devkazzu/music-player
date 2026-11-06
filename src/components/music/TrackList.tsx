import type { ReactNode } from 'react';
import type { Track } from '@/types';
import { Clock3 } from 'lucide-react';
import { TrackRow, type TrackRowExtraAction } from './TrackRow';
import { cn } from '@/lib/utils';

interface TrackListProps {
  tracks: Track[];
  label: string;
  showAlbum?: boolean;
  showHeader?: boolean;
  showCover?: boolean;
  empty?: ReactNode;
  rowExtras?: (track: Track, index: number) => TrackRowExtraAction[];
  className?: string;
}

export function TrackList({
  tracks,
  label,
  showAlbum = true,
  showHeader = true,
  showCover = true,
  empty,
  rowExtras,
  className,
}: TrackListProps) {
  if (tracks.length === 0) return <>{empty}</>;

  return (
    <div className={cn('w-full', className)}>
      {showHeader ? (
        <div className="mb-1 hidden items-center gap-3 border-b border-white/8 px-3 pb-2 text-[10px] uppercase tracking-[0.18em] text-white/35 sm:flex">
          <span className="w-5 text-center">#</span>
          {showCover ? <span className="w-11" aria-hidden /> : null}
          <span className="flex-1">Title</span>
          {showAlbum ? <span className="w-[26%]">Album</span> : null}
          <span className="w-8" aria-hidden />
          <span className="flex w-11 items-center justify-end" title="Duration">
            <Clock3 className="size-3.5" aria-hidden />
          </span>
          <span className="w-8" aria-hidden />
        </div>
      ) : null}

      <div className="stagger space-y-0.5">
        {tracks.map((track, index) => (
          <TrackRow
            key={`${track.id}-${index}`}
            track={track}
            index={index}
            queue={tracks}
            label={label}
            showAlbum={showAlbum}
            showCover={showCover}
            extraActions={rowExtras?.(track, index)}
          />
        ))}
      </div>
    </div>
  );
}
