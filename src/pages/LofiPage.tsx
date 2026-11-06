import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Coffee, Pause, Play, RotateCcw, Timer, Volume2 } from 'lucide-react';
import { ALBUMS, ART, MOOD_BY_ID, MOODS } from '@/data/catalog';
import { AlbumCard, MoodCard } from '@/components/cards/Cards';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { PlayButton } from '@/components/ui/PlayButton';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { TrackList } from '@/components/music/TrackList';
import { useFocusTimer } from '@/state/FocusTimerProvider';
import { useLibrary } from '@/state/LibraryProvider';
import { usePlayer } from '@/state/PlayerProvider';
import { usePageTitle } from '@/hooks/usePageTitle';
import { cn, formatDuration, formatTime, pluralize } from '@/lib/utils';

export function LofiPage() {
  usePageTitle('Lofi Collection');
  const { tracks } = useLibrary();
  const { lofiTracks, state, remainingSec, progress, start, pause, resume, reset, presets } =
    useFocusTimer();
  const { currentTrack, isPlaying, playQueue } = usePlayer();
  const [preset, setPreset] = useState(25);

  const lofiAlbums = ALBUMS.filter((album) =>
    album.genres.some((genre) => genre === 'lofi' || genre === 'piano' || genre === 'ambient'),
  );
  const focusMoods = [MOOD_BY_ID['rainy-focus'], MOOD_BY_ID['starlit-sleep'], MOOD_BY_ID['nostalgia']];
  const total = lofiTracks.reduce((sum, track) => sum + track.duration, 0);
  const running = state.running;
  const sessionActive = running || (state.remainingWhenPaused !== null && remainingSec < state.durationSec);

  useEffect(() => {
    if (state.durationSec > 0) setPreset(Math.round(state.durationSec / 60));
  }, [state.durationSec]);

  const circumference = 2 * Math.PI * 54;

  return (
    <div>
      <PageHeader
        eyebrow="Lofi collection"
        title="Rain, tape hiss and a timer"
        description="A focus studio built around real audio: choose a session length, and the lofi queue starts with it. Everything keeps playing while you browse."
        image={ART.rain}
        imageAlt="Rain on a window with neon city bokeh"
        actions={
          <>
            <PlayButton
              tracks={lofiTracks}
              label="Lofi Collection"
              showText="Play lofi"
              variant="solid"
              size="sm"
            />
            <button
              type="button"
              onClick={() => playQueue(lofiTracks, 0, 'Lofi Collection')}
              className="btn btn-glass"
            >
              <Coffee className="size-4" aria-hidden />
              {pluralize(lofiTracks.length, 'track')} · {formatDuration(total)}
            </button>
          </>
        }
      />

      <div className="mb-9 grid gap-5 lg:grid-cols-[1.05fr_1fr]">
        {/* -------------------------------------------------------- focus timer */}
        <section className="glass relative overflow-hidden rounded-3xl p-5 sm:p-6">
          <div
            className="pointer-events-none absolute -left-20 -top-20 size-56 rounded-full opacity-30 blur-3xl"
            style={{ background: 'radial-gradient(circle, var(--accent), transparent 70%)' }}
            aria-hidden
          />
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow flex items-center gap-1.5">
                <Timer className="size-3" aria-hidden />
                Focus session
              </p>
              <h2 className="mt-1 font-display text-2xl text-white">
                {state.completedAt && !running ? 'Session complete' : running ? 'In the zone' : 'Set a session'}
              </h2>
            </div>
            <span className="chip">{preset} min</span>
          </div>

          <div className="mt-5 flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-7">
            <div className="relative grid size-36 shrink-0 place-items-center">
              <svg viewBox="0 0 120 120" className="absolute inset-0 size-full -rotate-90">
                <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke="url(#focus-gradient)"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - Math.min(1, Math.max(0, progress)))}
                  style={{ transition: 'stroke-dashoffset 1s linear' }}
                />
                <defs>
                  <linearGradient id="focus-gradient" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" />
                    <stop offset="100%" stopColor="var(--accent-2)" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="text-center">
                <p className="font-display text-3xl tabular-nums text-white">{formatTime(remainingSec)}</p>
                <p className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-white/40">
                  {running ? 'remaining' : state.completedAt ? 'done' : 'ready'}
                </p>
              </div>
            </div>

            <div className="w-full flex-1">
              <div className="flex flex-wrap gap-1.5">
                {presets.map((minutes) => (
                  <button
                    key={minutes}
                    type="button"
                    onClick={() => setPreset(minutes)}
                    className="chip"
                    data-selected={preset === minutes}
                    disabled={running}
                  >
                    {minutes} min
                  </button>
                ))}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {running ? (
                  <button type="button" onClick={pause} className="btn btn-primary">
                    <Pause className="size-4 fill-current" aria-hidden />
                    Pause session
                  </button>
                ) : sessionActive && remainingSec > 0 ? (
                  <button type="button" onClick={resume} className="btn btn-primary">
                    <Play className="size-4 fill-current" aria-hidden />
                    Resume
                  </button>
                ) : (
                  <button type="button" onClick={() => start(preset)} className="btn btn-primary">
                    <Play className="size-4 fill-current" aria-hidden />
                    Start {preset} min
                  </button>
                )}
                <button type="button" onClick={reset} className="btn btn-glass" disabled={!sessionActive && !running}>
                  <RotateCcw className="size-4" aria-hidden />
                  Reset
                </button>
              </div>

              <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-white/40">
                <Volume2 className="mt-0.5 size-3 shrink-0" aria-hidden />
                {currentTrack && isPlaying
                  ? `Now scoring your session: ${currentTrack.title}.`
                  : 'Starting a session also starts the lofi queue — audio begins from your tap.'}
              </p>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------- selection */}
        <section className="grid gap-3 sm:grid-cols-2">
          {focusMoods.map((mood) => (
            <MoodCard key={mood.id} mood={mood} className="aspect-[16/11] sm:first:col-span-2 sm:first:aspect-[16/7]" />
          ))}
        </section>
      </div>

      <section className="mb-9">
        <SectionHeader
          eyebrow="The lofi queue"
          title="Heard through rain"
          description="Dusty, slow and endlessly loopable — the exact queue the focus timer plays."
          action={{ label: 'All lofi releases', to: '/explore?genre=lofi' }}
        />
        <div className="glass rounded-2xl p-2 sm:p-3">
          <TrackList
            tracks={lofiTracks}
            label="Lofi Collection"
            empty={
              <EmptyState
                icon={Coffee}
                title="No lofi tracks yet"
                description="Import your own ambient files into the local library and they will join this queue."
                action={
                  <Link to="/library" className="btn btn-primary">
                    Import music
                  </Link>
                }
              />
            }
          />
        </div>
      </section>

      <section className="mb-9">
        <SectionHeader eyebrow="Releases" title="Lofi & ambient albums" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {lofiAlbums.map((album) => (
            <AlbumCard key={album.id} album={album} />
          ))}
        </div>
      </section>

      <section>
        <SectionHeader eyebrow="Keep exploring" title="All moods" action={{ label: 'Explore', to: '/explore' }} />
        <div className={cn('grid grid-cols-2 gap-3 sm:grid-cols-3')}>
          {MOODS.map((mood) => (
            <MoodCard key={mood.id} mood={mood} />
          ))}
        </div>
      </section>

      <p className="mt-8 text-center text-[11px] text-white/30">
        {pluralize(tracks.length, 'track')} in total · {pluralize(lofiTracks.length, 'lofi track')} in this collection
      </p>
    </div>
  );
}
