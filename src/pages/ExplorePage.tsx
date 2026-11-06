import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowUpDown, Compass, Disc3, Play, Sparkles, X } from 'lucide-react';
import { ALBUMS, ART, ARTISTS, GENRES, MOODS, MOOD_BY_ID, GENRE_BY_ID } from '@/data/catalog';
import type { GenreId, MoodId } from '@/types';
import { AlbumCard, ArtistCard, MoodCard } from '@/components/cards/Cards';
import { Cover } from '@/components/ui/Cover';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { PlayButton } from '@/components/ui/PlayButton';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { TrackList } from '@/components/music/TrackList';
import { useLibrary } from '@/state/LibraryProvider';
import { usePlayer } from '@/state/PlayerProvider';
import { usePageTitle } from '@/hooks/usePageTitle';
import { TRACK_SORT_LABELS, sortTracks, type TrackSort } from '@/lib/sorting';
import { cn, formatDuration, pluralize } from '@/lib/utils';

export function ExplorePage() {
  usePageTitle('Explore');
  const [params, setParams] = useSearchParams();
  const { tracks, albums, recent } = useLibrary();
  const { playQueue } = usePlayer();

  const moodParam = params.get('mood') as MoodId | null;
  const genreParam = params.get('genre') as GenreId | null;
  const sortParam = (params.get('sort') as TrackSort | null) ?? 'default';

  const activeMood = moodParam && MOOD_BY_ID[moodParam] ? MOOD_BY_ID[moodParam] : null;
  const activeGenre = genreParam && GENRE_BY_ID[genreParam] ? GENRE_BY_ID[genreParam] : null;

  const filteredTracks = useMemo(() => {
    let list = tracks;
    if (activeMood) list = list.filter((track) => track.moods.includes(activeMood.id));
    if (activeGenre) list = list.filter((track) => track.genres.includes(activeGenre.id));
    return sortTracks(
      list,
      sortParam,
      recent.map((entry) => entry.trackId),
    );
  }, [activeGenre, activeMood, recent, sortParam, tracks]);

  const filteredAlbums = useMemo(() => {
    let list = albums;
    if (activeMood) list = list.filter((album) => album.moods.includes(activeMood.id));
    if (activeGenre) list = list.filter((album) => album.genres.includes(activeGenre.id));
    return list;
  }, [activeGenre, activeMood, albums]);

  const filterLabel = activeMood?.label ?? activeGenre?.label ?? 'Everything';
  const queueLabel = `Explore · ${filterLabel}`;
  const totalDuration = filteredTracks.reduce((sum, track) => sum + track.duration, 0);

  const updateParam = (key: 'mood' | 'genre' | 'sort', value: string | null) => {
    const next = new URLSearchParams(params);
    if (!value) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const clearFilters = () => {
    const next = new URLSearchParams(params);
    next.delete('mood');
    next.delete('genre');
    setParams(next, { replace: true });
  };

  return (
    <div>
      <PageHeader
        eyebrow="Explore music"
        title="A city of sound, one tap away"
        description="Follow a mood or a genre through the catalogue. Every collection is playable, editable and available offline."
        image={ART.street}
        imageAlt="A rainy anime street at dusk with lanterns and neon reflections"
        actions={
          <>
            <PlayButton
              tracks={filteredTracks}
              label={queueLabel}
              showText={`Play ${filterLabel.toLowerCase()}`}
              variant="solid"
              size="sm"
            />
            <button
              type="button"
              onClick={() => playQueue(filteredTracks, 0, queueLabel)}
              className="btn btn-glass"
            >
              <Play className="size-4" aria-hidden />
              Queue all {filteredTracks.length}
            </button>
          </>
        }
      />

      {/* ------------------------------------------------------------- filters */}
      <section className="glass mb-8 rounded-2xl p-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="eyebrow mr-1">Mood</span>
          <button
            type="button"
            onClick={() => updateParam('mood', null)}
            className={cn('chip', !activeMood && '!bg-white/12 !text-white')}
            data-selected={!activeMood}
          >
            All
          </button>
          {MOODS.map((mood) => (
            <button
              key={mood.id}
              type="button"
              onClick={() => updateParam('mood', activeMood?.id === mood.id ? null : mood.id)}
              className="chip"
              data-selected={activeMood?.id === mood.id}
            >
              {mood.label}
            </button>
          ))}
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-white/6 pt-2.5">
          <span className="eyebrow mr-1">Genre</span>
          <button
            type="button"
            onClick={() => updateParam('genre', null)}
            className={cn('chip', !activeGenre && '!bg-white/12 !text-white')}
            data-selected={!activeGenre}
          >
            All
          </button>
          {GENRES.map((genre) => (
            <button
              key={genre.id}
              type="button"
              onClick={() => updateParam('genre', activeGenre?.id === genre.id ? null : genre.id)}
              className="chip"
              data-selected={activeGenre?.id === genre.id}
            >
              {genre.label}
            </button>
          ))}
          {(activeMood || activeGenre) && (
            <button type="button" onClick={clearFilters} className="chip ml-auto !normal-case">
              <X className="size-3" aria-hidden />
              Clear filters
            </button>
          )}
        </div>
      </section>

      {!activeMood && !activeGenre ? (
        <>
          {/* ------------------------------------------------------------ moods */}
          <section className="mb-10">
            <SectionHeader
              eyebrow="Start with a feeling"
              title="Mood collections"
              description="Every soundtrack in the catalogue is tagged by the feeling it creates."
            />
            <div className="stagger grid grid-cols-2 gap-3.5 sm:grid-cols-3">
              {MOODS.map((mood) => (
                <MoodCard key={mood.id} mood={mood} />
              ))}
            </div>
          </section>

          {/* ----------------------------------------------------------- genres */}
          <section className="mb-10">
            <SectionHeader eyebrow="By genre" title="Six sonic worlds" />
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
              {GENRES.map((genre) => {
                const count = tracks.filter((track) => track.genres.includes(genre.id)).length;
                return (
                  <Link
                    key={genre.id}
                    to={`/explore?genre=${genre.id}`}
                    className="group relative flex h-24 items-end overflow-hidden rounded-2xl border border-white/10 p-4 sm:h-28"
                  >
                    <img
                      src={genre.cover}
                      alt=""
                      className="absolute inset-0 size-full object-cover opacity-55 transition duration-700 group-hover:scale-105 group-hover:opacity-70"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#04050c] via-[#04050c]/55 to-transparent" />
                    <div className="relative">
                      <p className="text-sm font-medium text-white">{genre.label}</p>
                      <p className="text-[11px] text-white/55">{pluralize(count, 'track')}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* ---------------------------------------------------------- artists */}
          <section className="mb-10">
            <SectionHeader
              eyebrow="The people behind the score"
              title="Artists"
              action={{ label: 'All releases', to: '/explore?genre=cinematic' }}
            />
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
              {ARTISTS.map((artist) => (
                <ArtistCard key={artist.id} artist={artist} />
              ))}
            </div>
          </section>
        </>
      ) : (
        <section className="mb-8">
          <div className="glass relative mb-6 overflow-hidden rounded-3xl">
            <img
              src={activeMood?.cover ?? activeGenre?.cover ?? ART.hero}
              alt=""
              className="absolute inset-0 size-full object-cover opacity-35"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#04050c] via-[#04050c]/80 to-transparent" />
            <div className="relative flex flex-col gap-2 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="eyebrow">{activeMood ? 'Mood collection' : 'Genre collection'}</p>
                <h2 className="mt-1 font-display text-3xl text-white">
                  {activeMood?.label ?? activeGenre?.label}
                </h2>
                <p className="mt-1.5 max-w-lg text-[12.5px] text-mist">
                  {activeMood?.description ?? activeGenre?.description}
                </p>
                {activeMood ? <p className="jp mt-2 text-[10px] text-white/35">{activeMood.japanese}</p> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <PlayButton
                  tracks={filteredTracks}
                  label={queueLabel}
                  showText="Play collection"
                  variant="solid"
                  size="sm"
                />
                <button type="button" onClick={clearFilters} className="btn btn-glass">
                  <X className="size-4" aria-hidden />
                  Clear
                </button>
              </div>
            </div>
          </div>

          {filteredAlbums.length > 0 ? (
            <div className="mb-8">
              <SectionHeader title="Releases in this collection" />
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {filteredAlbums.map((album) => (
                  <AlbumCard key={album.id} album={album} />
                ))}
              </div>
            </div>
          ) : null}
        </section>
      )}

      {/* --------------------------------------------------------------- tracks */}
      <section>
        <SectionHeader
          eyebrow={filterLabel}
          title={activeMood || activeGenre ? 'Matching tracks' : 'The complete catalogue'}
          description={`${pluralize(filteredTracks.length, 'track')} · ${formatDuration(totalDuration)}`}
          right={
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="size-3.5 text-white/40" aria-hidden />
              <label className="sr-only" htmlFor="explore-sort">
                Sort tracks
              </label>
              <select
                id="explore-sort"
                value={sortParam}
                onChange={(event) => updateParam('sort', event.target.value === 'default' ? null : event.target.value)}
                className="rounded-full border border-white/12 bg-white/[0.05] px-3 py-1.5 text-[11.5px] text-white/75 outline-none"
              >
                {(Object.keys(TRACK_SORT_LABELS) as TrackSort[]).map((key) => (
                  <option key={key} value={key} className="bg-[#0a0f1f]">
                    {TRACK_SORT_LABELS[key]}
                  </option>
                ))}
              </select>
            </div>
          }
        />

        <div className="glass rounded-2xl p-2 sm:p-3">
          <TrackList
            tracks={filteredTracks}
            label={queueLabel}
            empty={
              <EmptyState
                icon={Compass}
                title="Nothing in this combination"
                description="Try another mood or genre — or clear the filters to see the whole catalogue."
                action={
                  <button type="button" onClick={clearFilters} className="btn btn-primary">
                    Clear filters
                  </button>
                }
              />
            }
          />
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="glass-soft flex items-center gap-3 rounded-2xl p-4">
            <Cover src={ART.portrait} alt="" className="size-14" rounded="rounded-xl" overlay={false} />
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[13px] font-medium text-white">
                <Sparkles className="size-3.5 text-[var(--accent)]" aria-hidden />
                Curated by Hiro
              </p>
              <p className="mt-0.5 text-[11.5px] leading-relaxed text-mist">
                Every score here was composed for this app — the whole catalogue is {ALBUMS.length} releases
                across {ARTISTS.length} artists.
              </p>
            </div>
          </div>
          <div className="glass-soft flex items-center gap-3 rounded-2xl p-4">
            <span className="grid size-14 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04]">
              <Disc3 className="size-5 text-[var(--accent)]" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-white">Have your own music?</p>
              <p className="mt-0.5 text-[11.5px] leading-relaxed text-mist">
                Import files into your local library — they show up in Explore alongside the originals.
              </p>
              <Link to="/library" className="mt-1.5 inline-block text-[11.5px] font-medium text-[var(--accent)] hover:underline">
                Open local library
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
