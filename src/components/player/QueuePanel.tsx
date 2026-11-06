import { ArrowDown, ArrowUp, ListMusic, Play, Trash2, X } from 'lucide-react';
import { Cover } from '@/components/ui/Cover';
import { EmptyState } from '@/components/ui/EmptyState';
import { usePlayer } from '@/state/PlayerProvider';
import { cn, formatTime } from '@/lib/utils';

interface QueuePanelProps {
  className?: string;
  onClose?: () => void;
  compact?: boolean;
}

export function QueuePanel({ className, onClose, compact = false }: QueuePanelProps) {
  const {
    queue,
    index,
    currentTrack,
    contextLabel,
    isPlaying,
    jumpTo,
    removeFromQueue,
    moveInQueue,
    clearQueue,
  } = usePlayer();

  const upNext = queue
    .map((track, trackIndex) => ({ track, trackIndex }))
    .filter((item) => item.trackIndex > index);

  return (
    <div className={cn('flex h-full min-h-0 flex-col', className)}>
      <div className="flex items-start justify-between gap-3 px-4 pb-3 pt-4">
        <div className="min-w-0">
          <p className="eyebrow">Up next</p>
          <h2 className="mt-1 truncate font-display text-xl text-white">{contextLabel}</h2>
          <p className="mt-0.5 text-[11px] text-mist">
            {queue.length} {queue.length === 1 ? 'track' : 'tracks'} in queue
          </p>
        </div>
        <div className="flex items-center gap-1">
          {upNext.length > 0 ? (
            <button
              type="button"
              onClick={clearQueue}
              className="btn btn-ghost !px-2.5 !py-1.5 text-[11px]"
              title="Clear everything after the current track"
            >
              Clear
            </button>
          ) : null}
          {onClose ? (
            <button type="button" onClick={onClose} className="icon-btn size-8" aria-label="Close queue">
              <X className="size-4" aria-hidden />
            </button>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto scroll-thin px-2 pb-4">
        {currentTrack ? (
          <div className="mb-3">
            <p className="px-2 pb-1.5 text-[10px] uppercase tracking-[0.18em] text-white/35">Now playing</p>
            <div className="flex items-center gap-3 rounded-xl bg-white/[0.05] p-2">
              <Cover
                src={currentTrack.cover}
                alt=""
                className="size-11 shrink-0"
                rounded="rounded-lg"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-[var(--accent)]">{currentTrack.title}</p>
                <p className="truncate text-[11px] text-mist">{currentTrack.artist}</p>
              </div>
              {isPlaying ? (
                <span className="eq-bars mr-1" aria-hidden>
                  <span />
                  <span />
                  <span />
                  <span />
                </span>
              ) : (
                <span className="text-[10px] uppercase tracking-[0.14em] text-white/35">Paused</span>
              )}
            </div>
          </div>
        ) : null}

        {upNext.length === 0 ? (
          <EmptyState
            icon={ListMusic}
            title="Nothing queued"
            description="Add tracks with “Play next” or “Add to queue” from any list."
            compact
            className="mx-2 mt-2"
          />
        ) : (
          <div className="space-y-0.5">
            <p className="px-2 pb-1 pt-1 text-[10px] uppercase tracking-[0.18em] text-white/35">Next in queue</p>
            {upNext.map(({ track, trackIndex }) => (
              <div
                key={`${track.id}-${trackIndex}`}
                className="group flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition hover:bg-white/[0.06]"
              >
                <button
                  type="button"
                  onClick={() => jumpTo(trackIndex)}
                  className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                  aria-label={`Play ${track.title}`}
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-md border border-white/10 bg-white/[0.03] text-white/50 transition group-hover:text-[var(--accent)]">
                    <Play className="size-3 fill-current" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] text-white/88">{track.title}</span>
                    <span className="block truncate text-[11px] text-mist">{track.artist}</span>
                  </span>
                  <span className="text-[10px] tabular-nums text-white/35">{formatTime(track.duration)}</span>
                </button>
                <div className="flex shrink-0 items-center opacity-100 transition focus-within:opacity-100 md:opacity-0 md:group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => moveInQueue(trackIndex, trackIndex - 1)}
                    className="icon-btn size-6"
                    aria-label="Move up"
                    disabled={trackIndex === index + 1}
                  >
                    <ArrowUp className="size-3.5" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveInQueue(trackIndex, trackIndex + 1)}
                    className="icon-btn size-6"
                    aria-label="Move down"
                  >
                    <ArrowDown className="size-3.5" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFromQueue(trackIndex)}
                    className="icon-btn size-6 hover:text-rose-300"
                    aria-label="Remove from queue"
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {!compact ? (
        <div className="border-t border-white/8 px-4 py-3 text-[11px] leading-relaxed text-white/40">
          Playback keeps running while you browse — queue changes apply instantly.
        </div>
      ) : null}
    </div>
  );
}
