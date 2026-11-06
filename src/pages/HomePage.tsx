import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  Clapperboard,
  Clock3,
  Disc3,
  HardDrive,
  Heart,
  Play,
  Plus,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import {
  ALBUMS,
  ART,
  DEMO_TRACKS,
  FEATURED_ALBUM_ID,
  GENRE_BY_ID,
  MOODS,
  SAKURA_ART,
} from '@/data/catalog';
import { AlbumCard, MoodCard, PlaylistCard } from '@/components/cards/Cards';
import { Cover } from '@/components/ui/Cover';
import { EmptyState } from '@/components/ui/EmptyState';
import { Particles } from '@/components/ui/Particles';
import { PlayButton } from '@/components/ui/PlayButton';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { TrackList } from '@/components/music/TrackList';
import { FoxMark } from '@/components/atmosphere/SakuraLogo';
import { THEMES } from '@/lib/themes';
import { useLibrary } from '@/state/LibraryProvider';
import { usePlayer } from '@/state/PlayerProvider';
import { useSettings } from '@/state/SettingsProvider';
import { usePageTitle } from '@/hooks/usePageTitle';
import { formatDuration, formatRelativeTime, greetingForHour, pluralize } from '@/lib/utils';

export function HomePage() {
  usePageTitle('Home');
  const { profile, recentTracks, recent, favouriteTracks, playlists, tracksByIds, tracks, localTracks } =
    useLibrary();
  const { playQueue } = usePlayer();
  const { settings, update } = useSettings();

  const featuredAlbum = ALBUMS.find((album) => album.id === FEATURED_ALBUM_ID) ?? ALBUMS[0];
  const featuredTracks = tracksByIds(featuredAlbum.trackIds);
  const heroQueue = useMemo(
    () => [...featuredTracks, ...DEMO_TRACKS.filter((track) => !featuredAlbum.trackIds.includes(track.id))],
    [featuredAlbum.trackIds, featuredTracks],
  );

  const soundtracks = ALBUMS.filter((album) =>
    album.genres.some((genre) => genre === 'cinematic' || genre === 'synthwave' || genre === 'ambient'),
  );

  const recommended = useMemo(() => {
    const recentIds = new Set(recent.map((entry) => entry.trackId));
    return DEMO_TRACKS.filter((track) => !recentIds.has(track.id)).slice(0, 5);
  }, [recent]);

  const continueTracks = recentTracks.slice(0, 5);
  const greeting = greetingForHour(new Date().getHours());
  const totalMinutes = tracks.reduce((sum, track) => sum + track.duration, 0) / 60;

  return (
    <div className="space-y-11">
      {/* ---------------------------------------------------------------- hero */}
      <section className="relative overflow-hidden rounded-[1.75rem] border border-white/10">
        <div className="absolute inset-0">
          <img
            src={SAKURA_ART.hero}
            alt="Anime listener with headphones under a giant violet moon, cherry blossoms and a torii gate reflected in a lake"
            className="size-full object-cover object-[60%_42%]"
          />
          <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(11,7,20,0.97)_0%,rgba(16,8,28,0.86)_42%,rgba(16,8,28,0.24)_74%,rgba(11,7,20,0.7)_100%)]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B0714] via-transparent to-transparent" />
        </div>
        <Particles count={14} seed={3} />

        <div className="relative flex min-h-[440px] flex-col justify-end gap-6 p-5 sm:min-h-[480px] sm:p-8 lg:min-h-[510px] lg:p-10">
          <div className="max-w-2xl">
            <div className="mb-5 flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-2xl border border-[color:var(--hairline)] bg-black/30 backdrop-blur-md">
                <FoxMark className="size-6" />
              </span>
              <span>
                <span className="logo-wordmark block text-[13px] leading-none">HIRO SEGAWA</span>
                <span className="jp mt-1 block text-[8.5px] tracking-[0.32em] text-white/45">
                  桜の夜・音の夢
                </span>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <span className="chip !py-1" data-selected="true">
                <Sparkles className="size-3" aria-hidden />
                Featured score
              </span>
              <span className="text-[11px] uppercase tracking-[0.18em] text-white/45">
                {featuredAlbum.kind} · {featuredAlbum.year}
              </span>
            </div>

            <p className="mt-5 text-[12px] uppercase tracking-[0.18em] text-white/55">
              {greeting}, {profile.name.split(' ')[0]}
            </p>
            <h1 className="display mt-2 text-[clamp(2.4rem,6.4vw,4.4rem)] text-white">
              Your night,
              <br className="sm:hidden" /> <span className="text-gradient">beautifully scored.</span>
            </h1>
            <p className="mt-4 max-w-lg text-[13.5px] leading-relaxed text-white/60 sm:text-sm">
              {featuredAlbum.title} — {featuredAlbum.description}
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-2.5">
              <PlayButton
                tracks={heroQueue}
                label={`Featured · ${featuredAlbum.title}`}
                size="lg"
                showText="Play featured"
              />
              <button
                type="button"
                onClick={() => playQueue(DEMO_TRACKS, 0, 'HIRO SEGAWA · Original Score')}
                className="btn btn-glass !py-3"
              >
                <Disc3 className="size-4" aria-hidden />
                Play the full score
              </button>
              <Link to="/explore" className="btn btn-ghost !py-3">
                Explore
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-4 text-[11px] text-white/45">
              <Link to={`/artist/${featuredAlbum.artistId}`} className="group flex items-center gap-2 hover:text-white">
                <Cover src={featuredAlbum.cover} alt="" className="size-9" rounded="rounded-lg" overlay={false} />
                <span>
                  <span className="block text-[11.5px] font-medium text-white/80 group-hover:text-white">
                    {featuredAlbum.artist}
                  </span>
                  <span className="block">Artist</span>
                </span>
              </Link>
              <span className="hidden h-8 w-px bg-white/10 sm:block" aria-hidden />
              <span>{pluralize(DEMO_TRACKS.length, 'original track')}</span>
              <span className="hidden h-8 w-px bg-white/10 sm:block" aria-hidden />
              <span>{formatDuration(totalMinutes)} of music</span>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------- continue listening */}
      <section>
        <SectionHeader
          eyebrow="Pick up where you left off"
          title="Continue listening"
          action={{ label: 'History', to: '/recent' }}
        />
        {continueTracks.length > 0 ? (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
            {continueTracks.map((track, index) => {
              const entry = recent.find((item) => item.trackId === track.id);
              return (
                <button
                  key={track.id}
                  type="button"
                  onClick={() => playQueue(continueTracks, index, 'Continue listening')}
                  className="glass-soft hover-lift group flex items-center gap-3 overflow-hidden rounded-2xl p-2.5 text-left"
                >
                  <Cover
                    src={track.cover}
                    alt=""
                    className="size-12 shrink-0"
                    rounded="rounded-xl"
                    overlay={false}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-medium text-white">{track.title}</span>
                    <span className="mt-0.5 block truncate text-[11px] text-mist">{track.artist}</span>
                    <span className="mt-1 flex items-center gap-1 text-[10px] text-white/35">
                      <Clock3 className="size-2.5" aria-hidden />
                      {entry ? formatRelativeTime(entry.playedAt) : 'Queued'}
                    </span>
                  </span>
                  <span className="grid size-8 shrink-0 place-items-center rounded-full border border-white/12 bg-white/[0.06] text-white/70 opacity-0 transition group-hover:opacity-100">
                    <Play className="size-3 fill-current" aria-hidden />
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={Play}
            title="Your first session is waiting"
            description="Press play and HIRO SEGAWA will remember your place across the whole app."
            compact
            action={
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => playQueue(DEMO_TRACKS, 0, 'HIRO SEGAWA · Original Score')}
              >
                <Play className="size-4 fill-current" aria-hidden />
                Start listening
              </button>
            }
          />
        )}
      </section>

      {/* ------------------------------------------------------ featured albums */}
      <section>
        <SectionHeader
          eyebrow="Curated this week"
          title="Featured albums"
          description="Four original releases from artists inside the HIRO SEGAWA universe."
          action={{ label: 'All albums', to: '/explore' }}
        />
        <div className="stagger grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {ALBUMS.filter((album) => album.featured)
            .concat(ALBUMS.filter((album) => !album.featured).slice(0, 1))
            .slice(0, 4)
            .map((album, index) => (
              <AlbumCard key={album.id} album={album} priority={index === 0} />
            ))}
        </div>
      </section>

      {/* ------------------------------------------------ trending soundtracks */}
      <section>
        <SectionHeader
          eyebrow="Anime soundtracks"
          title="Trending in the cinematic universe"
          description="The scores people keep replaying at 2 a.m."
          action={{ label: 'Soundtracks', to: '/soundtracks' }}
        />
        <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 no-scrollbar sm:mx-0 sm:px-0">
          {soundtracks.map((album) => (
            <div key={album.id} className="w-[172px] shrink-0 snap-start sm:w-[200px]">
              <AlbumCard album={album} />
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------- recommendations */}
      <section className="grid gap-5 lg:grid-cols-[1.55fr_1fr]">
        <div className="glass rounded-3xl p-4 sm:p-5">
          <SectionHeader
            eyebrow="Made for you"
            title="Recommended right now"
            description="Based on the moods you have played — all original, all offline."
            action={{ label: 'Explore', to: '/explore' }}
          />
          <TrackList
            tracks={recommended}
            label="Recommended for you"
            showAlbum={false}
            showHeader={false}
            empty={
              <EmptyState
                icon={Disc3}
                title="You have heard everything"
                description="Replay a favourite or import your own music to keep the night going."
                compact
                action={
                  <Link to="/library" className="btn btn-glass">
                    <HardDrive className="size-4" aria-hidden />
                    Import music
                  </Link>
                }
              />
            }
          />
        </div>

        {/* favourites quick access */}
        <div className="flex flex-col gap-4">
          <div className="glass relative overflow-hidden rounded-3xl p-5">
            <div
              className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full opacity-40 blur-3xl"
              style={{ background: 'radial-gradient(circle, var(--accent), transparent 70%)' }}
              aria-hidden
            />
            <div className="flex items-center justify-between">
              <div>
                <p className="eyebrow">Quick access</p>
                <h2 className="mt-1 font-display text-2xl text-white">Favourites</h2>
              </div>
              <Link to="/favourites" className="icon-btn size-9" aria-label="Open favourites">
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>

            {favouriteTracks.length > 0 ? (
              <div className="mt-4 flex items-center gap-3">
                <div className="flex -space-x-3">
                  {favouriteTracks.slice(0, 4).map((track) => (
                    <Cover
                      key={track.id}
                      src={track.cover}
                      alt=""
                      className="size-12 ring-2 ring-[#0a0f1e]"
                      rounded="rounded-full"
                      overlay={false}
                    />
                  ))}
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-white">{pluralize(favouriteTracks.length, 'track')} saved</p>
                  <p className="truncate text-[11px] text-mist">All stored on this device</p>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-[12.5px] leading-relaxed text-mist">
                No favourites yet. Tap the heart on any track — it will live here, permanently.
              </p>
            )}

            <div className="mt-4 flex gap-2">
              <PlayButton
                tracks={favouriteTracks}
                label="Favourites"
                size="sm"
                showText="Play favourites"
                className="!px-3.5 !py-2 text-[12px]"
              />
              <Link to="/favourites" className="btn btn-ghost !px-3 !py-2 text-[12px]">
                <Heart className="size-3.5" aria-hidden />
                View all
              </Link>
            </div>
          </div>

          <div className="glass-soft flex flex-1 flex-col justify-between rounded-3xl border-dashed p-5">
            <div>
              <div className="flex items-center gap-2 text-[var(--accent)]">
                <HardDrive className="size-4" aria-hidden />
                <p className="eyebrow !text-[var(--accent)]">Your device</p>
              </div>
              <h2 className="mt-2 font-display text-xl text-white">Local music library</h2>
              <p className="mt-1.5 text-[12px] leading-relaxed text-mist">
                {localTracks.length > 0
                  ? `${pluralize(localTracks.length, 'track')} imported and available offline.`
                  : 'Import MP3, WAV, OGG or FLAC files and they stay in this browser — offline.'}
              </p>
            </div>
            <Link to="/library" className="btn btn-glass mt-4 w-full !py-2.5 text-[12.5px]">
              <Plus className="size-4" aria-hidden />
              {localTracks.length > 0 ? 'Manage library' : 'Import music'}
            </Link>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- playlists */}
      <section>
        <SectionHeader
          eyebrow="Collections"
          title="Popular playlists"
          description="Hand-built moods you can edit, extend or rename."
          action={{ label: 'All playlists', to: '/playlists' }}
        />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {playlists.slice(0, 5).map((playlist) => (
            <PlaylistCard
              key={playlist.id}
              id={playlist.id}
              name={playlist.name}
              description={playlist.description}
              covers={tracksByIds(playlist.trackIds)
                .slice(0, 4)
                .map((track) => track.cover)}
              trackCount={playlist.trackIds.length}
            />
          ))}
        </div>
      </section>

      {/* ----------------------------------------------------------------- moods */}
      <section>
        <SectionHeader
          eyebrow="Follow the feeling"
          title="Mood categories"
          description="Six atmospheres, each one a doorway into the catalogue."
          action={{ label: 'Explore music', to: '/explore' }}
        />
        <div className="stagger grid grid-cols-2 gap-3.5 sm:grid-cols-3">
          {MOODS.map((mood) => (
            <MoodCard key={mood.id} mood={mood} />
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------------- themes */}
      <section>
        <SectionHeader
          eyebrow="Choose your night"
          title="Sakura Dream themes"
          description="Eight atmospheres. Each one recolours the sky, the moon, the petals and every glow."
          action={{ label: 'All settings', to: '/settings' }}
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {THEMES.map((theme) => {
            const active = settings.theme === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => update({ theme: theme.id })}
                aria-pressed={active}
                data-active={active}
                className="theme-card"
                style={{
                  background: `linear-gradient(165deg, ${theme.swatch[0]} 0%, ${theme.swatch[1]} 62%, ${theme.swatch[2]} 130%)`,
                }}
              >
                <span className="flex items-start justify-between gap-2">
                  <span>
                    <span className="block text-[12.5px] font-semibold text-white">{theme.label}</span>
                    <span className="jp mt-0.5 block text-[9.5px] tracking-[0.24em] text-white/70">
                      {theme.jp}
                    </span>
                  </span>
                  {active ? <Check className="size-4 shrink-0 text-white" aria-hidden /> : null}
                </span>
                <span className="mt-6 block text-[10px] leading-snug text-white/60">{theme.tagline}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* --------------------------------------------------------------- footer cta */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10">
        <img src={ART.street} alt="" className="absolute inset-0 size-full object-cover opacity-45" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#04050c] via-[#04050c]/85 to-[#04050c]/40" />
        <div className="relative flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <p className="eyebrow">Lofi collection</p>
            <h2 className="mt-1.5 font-display text-2xl text-white sm:text-3xl">
              A focus timer that plays real rain-soaked lofi
            </h2>
            <p className="mt-2 max-w-xl text-[12.5px] leading-relaxed text-mist">
              Start a 25-minute session: the timer works while you browse, and playback fades out when the
              session ends.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/lofi" className="btn btn-primary">
              <Clapperboard className="size-4" aria-hidden />
              Open lofi studio
            </Link>
            <Link to="/soundtracks" className="btn btn-glass">
              <TrendingUp className="size-4" aria-hidden />
              Soundtracks
            </Link>
          </div>
        </div>
      </section>

      <p className="pb-2 text-center text-[10.5px] text-white/25">
        Genre focus: {GENRE_BY_ID.cinematic.label} · {tracks.length} tracks in library
      </p>
    </div>
  );
}
