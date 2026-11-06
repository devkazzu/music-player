import { Link, useNavigate } from 'react-router-dom';
import {
  ChevronUp,
  Gauge,
  ListMusic,
  Maximize2,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  TriangleAlert,
} from 'lucide-react';
import { Cover } from '@/components/ui/Cover';
import { Menu } from '@/components/ui/Menu';
import { LikeButton } from '@/components/ui/LikeButton';
import { SeekBar } from './SeekBar';
import { VolumeControl } from './VolumeControl';
import { usePlayer } from '@/state/PlayerProvider';
import { cn, percent } from '@/lib/utils';

interface PlayerBarProps {
  onToggleQueue: () => void;
  queueOpen: boolean;
}

const RATES = [0.75, 1, 1.25, 1.5, 2];

export function PlayerBar({ onToggleQueue, queueOpen }: PlayerBarProps) {
  const player = usePlayer();
  const navigate = useNavigate();
  const track = player.currentTrack;
  if (!track) return null;

  const progress = percent(player.currentTime, player.duration);
  const RepeatIcon = player.repeat === 'one' ? Repeat1 : Repeat;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] z-40 md:bottom-0">
      {/* ------------------------------------------------------------ mobile */}
      <div className="chrome-mini pointer-events-auto mx-2 mb-2 overflow-hidden rounded-2xl border backdrop-blur-2xl md:hidden">
        <div className="h-[2px] w-full bg-white/10">
          <div
            className="h-full bg-[linear-gradient(90deg,var(--accent),var(--accent-2))] transition-[width] duration-300 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center gap-3 px-2.5 py-2">
          <button
            type="button"
            onClick={() => navigate('/now-playing')}
            className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
            aria-label="Open full-screen player"
          >
            <Cover
              src={track.cover}
              alt=""
              className="size-11 shrink-0"
              rounded="rounded-lg"
              overlay={false}
            />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <span className="truncate text-[13px] font-medium text-white">{track.title}</span>
                {player.isPlaying ? (
                  <span className="eq-bars shrink-0" aria-hidden>
                    <span />
                    <span />
                    <span />
                  </span>
                ) : null}
              </span>
              <span className="mt-0.5 block truncate text-[11px] text-mist">
                {track.artist}
                {player.isLoading ? ' · loading…' : ''}
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={player.toggle}
            aria-label={player.isPlaying ? 'Pause' : 'Play'}
            className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-[#04060f] transition active:scale-95"
          >
            {player.isPlaying ? (
              <Pause className="size-[18px] fill-current" aria-hidden />
            ) : (
              <Play className="size-[18px] translate-x-[1px] fill-current" aria-hidden />
            )}
          </button>
          <button
            type="button"
            onClick={player.next}
            aria-label="Next track"
            className="icon-btn size-9 shrink-0"
          >
            <SkipForward className="size-[18px] fill-current" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => navigate('/now-playing')}
            aria-label="Expand player"
            className="icon-btn size-8 shrink-0"
          >
            <ChevronUp className="size-4" aria-hidden />
          </button>
        </div>
      </div>

      {/* ----------------------------------------------------------- desktop */}
      <div className="glass-bar pointer-events-auto hidden md:block">
        <div className="mx-auto grid h-[92px] max-w-[1800px] grid-cols-[minmax(0,1fr)_minmax(320px,520px)_minmax(0,1fr)] items-center gap-4 px-4 lg:px-6">
          {/* now playing */}
          <div className="flex min-w-0 items-center gap-3">
            <Link
              to="/now-playing"
              className="group relative shrink-0"
              aria-label="Open full-screen player"
            >
              <Cover
                src={track.cover}
                alt=""
                className="size-[60px]"
                rounded="rounded-xl"
                overlay={false}
              />
              <span className="absolute inset-0 grid place-items-center rounded-xl bg-black/50 opacity-0 transition group-hover:opacity-100">
                <Maximize2 className="size-4 text-white" aria-hidden />
              </span>
            </Link>
            <div className="min-w-0">
              <Link
                to="/now-playing"
                className="block truncate text-[13.5px] font-medium text-white hover:underline"
              >
                {track.title}
              </Link>
              <Link
                to={`/artist/${track.artistId}`}
                className="mt-0.5 block truncate text-[11.5px] text-mist hover:text-white/85"
              >
                {track.artist}
              </Link>
              {player.error ? (
                <button
                  type="button"
                  onClick={player.retry}
                  className="mt-1 flex items-center gap-1 text-[10.5px] text-rose-300 hover:text-rose-200"
                  title={player.error}
                >
                  <TriangleAlert className="size-3" aria-hidden />
                  Playback issue · retry
                </button>
              ) : null}
            </div>
            <LikeButton track={track} size="sm" className="ml-1" />
          </div>

          {/* transport */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={player.toggleShuffle}
                aria-label={player.shuffle ? 'Turn shuffle off' : 'Turn shuffle on'}
                aria-pressed={player.shuffle}
                data-active={player.shuffle}
                className="icon-btn size-8"
                title="Shuffle (S)"
              >
                <Shuffle className="size-[15px]" aria-hidden />
              </button>
              <button
                type="button"
                onClick={player.previous}
                aria-label="Previous track"
                className="icon-btn size-9"
                title="Previous"
              >
                <SkipBack className="size-[18px] fill-current" aria-hidden />
              </button>
              <button
                type="button"
                onClick={player.toggle}
                aria-label={player.isPlaying ? 'Pause' : 'Play'}
                className={cn(
                  'mx-1 grid size-11 place-items-center rounded-full bg-white text-[#04060f] transition hover:scale-105 active:scale-95',
                  player.isLoading && 'opacity-80',
                )}
                title="Play / pause (Space)"
              >
                {player.isPlaying ? (
                  <Pause className="size-5 fill-current" aria-hidden />
                ) : (
                  <Play className="size-5 translate-x-[1px] fill-current" aria-hidden />
                )}
              </button>
              <button
                type="button"
                onClick={player.next}
                aria-label="Next track"
                className="icon-btn size-9"
                title="Next"
              >
                <SkipForward className="size-[18px] fill-current" aria-hidden />
              </button>
              <button
                type="button"
                onClick={player.cycleRepeat}
                aria-label={`Repeat mode: ${player.repeat}`}
                aria-pressed={player.repeat !== 'off'}
                data-active={player.repeat !== 'off'}
                className="icon-btn size-8"
                title={`Repeat: ${player.repeat} (R)`}
              >
                <RepeatIcon className="size-[15px]" aria-hidden />
              </button>
            </div>
            <SeekBar className="w-full max-w-lg" />
          </div>

          {/* utilities */}
          <div className="flex items-center justify-end gap-1.5">
            <Menu
              label="Playback speed"
              align="right"
              items={RATES.map((rate) => ({
                id: `rate-${rate}`,
                label: `${rate}×${rate === player.rate ? '  ✓' : ''}`,
                onSelect: () => player.setRate(rate),
              }))}
              trigger={(props) => (
                <button
                  {...props}
                  type="button"
                  className="icon-btn h-8 gap-1 rounded-full px-2.5 text-[11px] tabular-nums"
                  aria-label={`Playback speed ${player.rate}×`}
                  title="Playback speed"
                >
                  <Gauge className="size-4" aria-hidden />
                  <span>{player.rate}×</span>
                </button>
              )}
            />
            <button
              type="button"
              onClick={onToggleQueue}
              aria-label={queueOpen ? 'Hide queue' : 'Show queue'}
              aria-pressed={queueOpen}
              data-active={queueOpen}
              className="icon-btn size-8"
              title="Queue"
            >
              <ListMusic className="size-[17px]" aria-hidden />
            </button>
            <VolumeControl />
            <Link
              to="/now-playing"
              className="icon-btn hidden size-8 lg:inline-flex"
              aria-label="Full-screen player"
              title="Full-screen player"
            >
              <Maximize2 className="size-[16px]" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
