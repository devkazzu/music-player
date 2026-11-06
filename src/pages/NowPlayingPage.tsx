import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  Disc3,
  Gauge,
  HardDrive,
  Heart,
  ListMusic,
  Maximize2,
  Minimize2,
  Music4,
  Pause,
  Play,
  Repeat,
  Repeat1,
  RotateCcw,
  Shuffle,
  SkipBack,
  SkipForward,
  Sparkles,
  TriangleAlert,
} from 'lucide-react';
import { GENRE_BY_ID, MOOD_BY_ID } from '@/data/catalog';
import { Cover } from '@/components/ui/Cover';
import { EmptyState } from '@/components/ui/EmptyState';
import { LikeButton } from '@/components/ui/LikeButton';
import { Menu } from '@/components/ui/Menu';
import { Particles } from '@/components/ui/Particles';
import { SeekBar } from '@/components/player/SeekBar';
import { QueuePanel } from '@/components/player/QueuePanel';
import { Visualizer } from '@/components/player/Visualizer';
import { VolumeControl } from '@/components/player/VolumeControl';
import { useLibrary } from '@/state/LibraryProvider';
import { usePlayer } from '@/state/PlayerProvider';
import { useSettings } from '@/state/SettingsProvider';
import { usePageTitle } from '@/hooks/usePageTitle';
import { absoluteUrl, formatBytes, formatTime } from '@/lib/utils';

export function NowPlayingPage() {
  const player = usePlayer();
  const { getAlbum, getArtist } = useLibrary();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [queueOpen, setQueueOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const track = player.currentTrack;
  usePageTitle(track ? `${track.title} · ${track.artist}` : 'Now playing');

  const album = track ? getAlbum(track.albumId) : undefined;
  const artist = track ? getArtist(track.artistId) : undefined;
  const RepeatIcon = player.repeat === 'one' ? Repeat1 : Repeat;
  const canGoBack = typeof window !== 'undefined' && window.history.length > 1;

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const close = () => {
    if (canGoBack) navigate(-1);
    else navigate('/');
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      // Fullscreen can be blocked by the browser; the route already fills the viewport.
    }
  };

  if (!track) {
    return (
      <div className="grid h-full place-items-center bg-[#04050c] px-6">
        <EmptyState
          icon={Music4}
          title="Nothing is playing"
          description="Choose a track from Home, Explore or your own library — the player stays with you across every page."
          action={
            <>
              <Link to="/" className="btn btn-primary" onClick={close}>
                Back to Home
              </Link>
              <Link to="/explore" className="btn btn-glass">
                Explore music
              </Link>
            </>
          }
        />
      </div>
    );
  }

  return (
    <div className="relative h-full overflow-y-auto scroll-thin bg-[#04050c]">
      {/* ---------------------------------------------------------- atmosphere */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <img
          key={track.cover}
          src={track.cover}
          alt=""
          className="size-full scale-125 object-cover opacity-40 blur-[70px] transition-opacity duration-1000"
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,transparent_0%,rgba(4,5,12,0.6)_55%,#04050c_100%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#04050c]/40 via-transparent to-[#04050c]" />
        <Particles count={26} seed={7} tone="accent" />
      </div>

      <div className="relative flex min-h-full flex-col">
        {/* -------------------------------------------------------------- header */}
        <header className="safe-top sticky top-0 z-30 flex items-center gap-3 px-4 py-3 backdrop-blur-md sm:px-6">
          <button
            type="button"
            onClick={close}
            className="icon-btn size-10 border border-white/10 bg-white/[0.05] backdrop-blur-md"
            aria-label="Close full-screen player"
          >
            <ChevronDown className="size-5" aria-hidden />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <p className="eyebrow !text-[9px]">Now playing</p>
            <p className="truncate text-[12px] text-white/70">{player.contextLabel}</p>
          </div>
          <button
            type="button"
            onClick={() => setQueueOpen(true)}
            className="icon-btn size-10 border border-white/10 bg-white/[0.05] backdrop-blur-md"
            aria-label="Open queue"
            title="Queue (Q)"
          >
            <ListMusic className="size-[18px]" aria-hidden />
          </button>
        </header>

        {/* ---------------------------------------------------------------- main */}
        <div className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 items-center gap-8 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-12 lg:py-8">
          {/* artwork */}
          <div className="relative mx-auto w-full max-w-[340px] lg:max-w-[400px]">
            <div
              className="absolute -inset-6 rounded-[2rem] opacity-70 blur-3xl"
              style={{ background: 'radial-gradient(circle at 50% 45%, rgba(var(--accent-rgb),0.45), transparent 70%)' }}
              aria-hidden
            />
            <div
              className="vinyl-spin absolute -right-4 top-6 hidden size-[86%] rounded-full border border-white/10 bg-[radial-gradient(circle,rgba(12,16,32,0.95)_28%,rgba(4,5,12,0.98)_29%),repeating-radial-gradient(circle,rgba(255,255,255,0.055)_0_1px,transparent_1px_6px)] sm:block"
              style={{ animationPlayState: player.isPlaying ? 'running' : 'paused' }}
              aria-hidden
            >
              <div className="absolute inset-[38%] rounded-full border border-white/10 bg-white/[0.04]" />
            </div>

            <div className="relative animate-[breathe_9s_ease-in-out_infinite]">
              <Cover
                src={track.cover}
                alt={`${track.album} artwork`}
                className="aspect-square w-full rounded-[1.6rem] ring-1 ring-white/15"
                rounded="rounded-[1.6rem]"
                priority
                overlay
                imgClassName="shadow-[0_30px_90px_-30px_rgba(0,0,0,0.9)]"
              />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-4">
                <div className="min-w-0">
                  <p className="jp text-[9px] text-white/50">再生中</p>
                  <p className="truncate text-[11px] text-white/70">{track.album}</p>
                </div>
                <span className="chip shrink-0 !bg-black/40 !py-1 backdrop-blur-md">
                  {track.year}
                </span>
              </div>
            </div>

            {player.isLoading ? (
              <div className="absolute inset-0 grid place-items-center rounded-[1.6rem] bg-black/35 backdrop-blur-[2px]">
                <span className="flex items-center gap-2 rounded-full border border-white/15 bg-black/50 px-4 py-2 text-[11px] text-white/80">
                  <Disc3 className="size-4 animate-spin" aria-hidden />
                  Loading audio…
                </span>
              </div>
            ) : null}
          </div>

          {/* details */}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {track.source === 'local' ? (
                <span className="chip !normal-case">
                  <HardDrive className="size-3" aria-hidden />
                  Local file
                </span>
              ) : (
                <span className="chip !normal-case" data-selected="true">
                  <Sparkles className="size-3" aria-hidden />
                  Original score
                </span>
              )}
              {track.genres.slice(0, 2).map((genre) => (
                <Link key={genre} to={`/explore?genre=${genre}`} className="chip !normal-case">
                  {GENRE_BY_ID[genre]?.label ?? genre}
                </Link>
              ))}
              {track.moods.slice(0, 1).map((mood) => (
                <Link key={mood} to={`/explore?mood=${mood}`} className="chip !normal-case">
                  {MOOD_BY_ID[mood]?.label ?? mood}
                </Link>
              ))}
            </div>

            <h1 className="display mt-4 break-words text-[clamp(2rem,5.4vw,3.5rem)] leading-[1.02] text-white">
              {track.title}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px]">
              <Link
                to={`/artist/${track.artistId}`}
                className="text-white/75 underline-offset-4 hover:text-white hover:underline"
              >
                {track.artist}
              </Link>
              <span className="text-white/25" aria-hidden>
                ·
              </span>
              <Link
                to={`/album/${track.albumId}`}
                className="text-white/50 underline-offset-4 hover:text-white/80 hover:underline"
              >
                {track.album}
              </Link>
            </div>

            {player.error ? (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-400/25 bg-rose-500/10 p-3 text-[11.5px] text-rose-100">
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                <div className="flex-1">
                  <p>{player.error}</p>
                  <button
                    type="button"
                    onClick={player.retry}
                    className="mt-1.5 inline-flex items-center gap-1 font-medium underline decoration-dotted underline-offset-4"
                  >
                    <RotateCcw className="size-3" aria-hidden />
                    Retry playback
                  </button>
                </div>
              </div>
            ) : null}

            {/* progress */}
            <div className="mt-6">
              <SeekBar size="lg" />
            </div>

            {/* transport */}
            <div className="mt-3 flex items-center justify-between gap-1 sm:gap-2">
              <button
                type="button"
                onClick={player.toggleShuffle}
                aria-label={player.shuffle ? 'Turn shuffle off' : 'Turn shuffle on'}
                aria-pressed={player.shuffle}
                data-active={player.shuffle}
                className="icon-btn size-10"
              >
                <Shuffle className="size-[18px]" aria-hidden />
              </button>
              <button
                type="button"
                onClick={player.previous}
                aria-label="Previous track"
                className="icon-btn size-11"
              >
                <SkipBack className="size-6 fill-current" aria-hidden />
              </button>
              <button
                type="button"
                onClick={player.toggle}
                aria-label={player.isPlaying ? 'Pause' : 'Play'}
                className="grid size-[68px] place-items-center rounded-full bg-white text-[#04060f] shadow-[0_18px_50px_-18px_rgba(var(--accent-rgb),0.9)] transition hover:scale-[1.04] active:scale-95"
              >
                {player.isPlaying ? (
                  <Pause className="size-7 fill-current" aria-hidden />
                ) : (
                  <Play className="size-7 translate-x-[1px] fill-current" aria-hidden />
                )}
              </button>
              <button type="button" onClick={player.next} aria-label="Next track" className="icon-btn size-11">
                <SkipForward className="size-6 fill-current" aria-hidden />
              </button>
              <button
                type="button"
                onClick={player.cycleRepeat}
                aria-label={`Repeat mode: ${player.repeat}`}
                aria-pressed={player.repeat !== 'off'}
                data-active={player.repeat !== 'off'}
                className="icon-btn size-10"
              >
                <RepeatIcon className="size-[18px]" aria-hidden />
              </button>
            </div>

            {/* secondary controls */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <LikeButton track={track} size="md" withLabel />
              <Menu
                label="Playback speed"
                items={[0.75, 1, 1.25, 1.5, 2].map((rate) => ({
                  id: `rate-${rate}`,
                  label: `${rate}×${rate === player.rate ? '  ✓' : ''}`,
                  onSelect: () => player.setRate(rate),
                }))}
                trigger={(props) => (
                  <button
                    {...props}
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-2 text-[11.5px] text-white/70 transition hover:bg-white/[0.07]"
                    aria-label={`Playback speed ${player.rate}×`}
                  >
                    <Gauge className="size-3.5" aria-hidden />
                    {player.rate}×
                  </button>
                )}
              />
              <button
                type="button"
                onClick={() => setQueueOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-2 text-[11.5px] text-white/70 transition hover:bg-white/[0.07]"
              >
                <ListMusic className="size-3.5" aria-hidden />
                Queue
              </button>
              <button
                type="button"
                onClick={() => void toggleFullscreen()}
                className="icon-btn size-9"
                aria-label={isFullscreen ? 'Exit full screen' : 'Enter full screen'}
                title="Browser full screen"
              >
                {isFullscreen ? <Minimize2 className="size-4" aria-hidden /> : <Maximize2 className="size-4" aria-hidden />}
              </button>
              <VolumeControl className="ml-auto" compact />
            </div>

            {/* visualizer */}
            {settings.visualizer ? (
              <div className="mt-5">
                <div className="relative h-20 overflow-hidden rounded-2xl border border-white/8 bg-black/25 p-2 sm:h-24">
                  <Visualizer variant={settings.visualizerStyle} className="size-full" />
                </div>
                <p className="mt-1.5 flex items-center gap-1.5 text-[10px] text-white/30">
                  {player.analysisAvailable ? (
                    <>
                      <Sparkles className="size-2.5" aria-hidden />
                      Live frequency analysis via the Web Audio API
                    </>
                  ) : (
                    <>
                      <TriangleAlert className="size-2.5" aria-hidden />
                      Ambient mode — this browser did not allow audio analysis. Playback is unaffected.
                    </>
                  )}
                </p>
              </div>
            ) : null}
          </div>
        </div>

        {/* --------------------------------------------------------------- details */}
        <div className="mx-auto w-full max-w-6xl px-4 pb-28 sm:px-6 lg:pb-10">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="glass rounded-2xl p-4">
              <p className="eyebrow">About this track</p>
              <dl className="mt-2.5 space-y-2 text-[11.5px]">
                <div className="flex justify-between gap-3">
                  <dt className="text-white/40">Album</dt>
                  <dd className="truncate text-right text-white/80">{track.album}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-white/40">Artist</dt>
                  <dd className="truncate text-right text-white/80">{track.artist}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-white/40">Released</dt>
                  <dd className="text-right text-white/80">
                    {album?.year ?? track.year} · {album?.kind ?? 'Track'}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-white/40">Length</dt>
                  <dd className="text-right text-white/80">{formatTime(player.duration)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-white/40">File</dt>
                  <dd className="truncate text-right text-white/80">
                    {track.source === 'local'
                      ? `${(track.mimeType ?? 'audio').replace('audio/', '').toUpperCase()}${
                          track.size ? ` · ${formatBytes(track.size)}` : ''
                        }`
                      : 'MP3 · 96 kbps · original score'}
                  </dd>
                </div>
              </dl>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Link to={`/album/${track.albumId}`} className="chip !normal-case">
                  <Disc3 className="size-3" aria-hidden />
                  Open album
                </Link>
                <Link to={`/artist/${track.artistId}`} className="chip !normal-case">
                  <Heart className="size-3" aria-hidden />
                  {artist ? artist.name : 'Artist'}
                </Link>
              </div>
            </div>

            <div className="glass rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <p className="eyebrow">Up next</p>
                <span className="text-[10.5px] text-white/35">
                  {Math.max(0, player.queue.length - player.index - 1)} remaining
                </span>
              </div>
              <div className="mt-2 space-y-1">
                {player.queue.slice(player.index + 1, player.index + 4).map((nextTrack, offset) => (
                  <button
                    key={`${nextTrack.id}-${offset}`}
                    type="button"
                    onClick={() => player.jumpTo(player.index + 1 + offset)}
                    className="flex w-full items-center gap-2.5 rounded-xl p-1.5 text-left transition hover:bg-white/[0.06]"
                  >
                    <Cover src={nextTrack.cover} alt="" className="size-9" rounded="rounded-md" overlay={false} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] text-white/85">{nextTrack.title}</span>
                      <span className="block truncate text-[10.5px] text-white/40">{nextTrack.artist}</span>
                    </span>
                    <Play className="size-3 shrink-0 text-white/35" aria-hidden />
                  </button>
                ))}
                {player.index >= player.queue.length - 1 ? (
                  <p className="py-4 text-center text-[11.5px] text-white/35">
                    End of queue. {player.repeat === 'all' ? 'Repeat all is on.' : 'Nothing queued next.'}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setQueueOpen(true)}
                className="mt-2 w-full rounded-xl border border-white/10 py-1.5 text-[11px] text-white/60 transition hover:bg-white/[0.06] hover:text-white"
              >
                View full queue
              </button>
            </div>
          </div>

          <p className="mt-5 text-center text-[10px] uppercase tracking-[0.2em] text-white/20">
            <a href={absoluteUrl(track.src)} download className="hover:text-white/40">
              Audio source
            </a>{' '}
            · Procedurally composed for HIRO SEGAWA
          </p>
        </div>
      </div>

      {/* -------------------------------------------------------------- queue drawer */}
      {queueOpen ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close queue"
            className="absolute inset-0 animate-[fade_0.2s_ease_both] bg-black/70 backdrop-blur-sm"
            onClick={() => setQueueOpen(false)}
          />
          <div className="glass absolute inset-y-0 right-0 w-[88%] max-w-sm animate-[rise_0.32s_cubic-bezier(0.16,1,0.3,1)_both] border-l border-white/10">
            <QueuePanel onClose={() => setQueueOpen(false)} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
