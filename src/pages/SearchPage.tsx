import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowUpDown,
  CornerDownLeft,
  History,
  Play,
  Search,
  SearchX,
  Sparkles,
  TrendingUp,
  X,
} from 'lucide-react';
import { POPULAR_SEARCHES } from '@/data/catalog';
import type { SearchHit } from '@/types';
import { AlbumCard, ArtistCard, PlaylistCard } from '@/components/cards/Cards';
import { Cover } from '@/components/ui/Cover';
import { EmptyState } from '@/components/ui/EmptyState';
import { PlayButton } from '@/components/ui/PlayButton';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { TrackList } from '@/components/music/TrackList';
import { useLibrary } from '@/state/LibraryProvider';
import { usePlayer } from '@/state/PlayerProvider';
import { usePageTitle } from '@/hooks/usePageTitle';
import { loadRecentSearches, saveRecentSearches } from '@/lib/storage';
import { searchLibrary, suggestionTerms } from '@/lib/search';
import { sortTracks, type TrackSort } from '@/lib/sorting';
import { cn, pluralize } from '@/lib/utils';

export function SearchPage() {
  usePageTitle('Search');
  const [params, setParams] = useSearchParams();
  const urlQuery = params.get('q') ?? '';
  const [query, setQuery] = useState(urlQuery);
  const deferredQuery = useDeferredValue(query);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => loadRecentSearches());
  const [sort, setSort] = useState<TrackSort>('default');
  const inputRef = useRef<HTMLInputElement>(null);
  const pushedRef = useRef(urlQuery);
  const navigate = useNavigate();
  const { searchSources, playlists, tracksByIds } = useLibrary();
  const { playQueue } = usePlayer();

  const results = useMemo(() => searchLibrary(deferredQuery, searchSources), [deferredQuery, searchSources]);
  const suggestions = useMemo(
    () => suggestionTerms(deferredQuery, searchSources),
    [deferredQuery, searchSources],
  );

  const sortedTracks = useMemo(
    () => sortTracks(results.tracks, sort),
    [results.tracks, sort],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = new URLSearchParams(params);
      const trimmed = query.trim();
      if (trimmed) next.set('q', trimmed);
      else next.delete('q');
      pushedRef.current = trimmed;
      setParams(next, { replace: true });
    }, 280);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    // Only adopt the URL value when it was changed somewhere else (nav, back/forward).
    if (urlQuery !== pushedRef.current) {
      pushedRef.current = urlQuery;
      setQuery(urlQuery);
    }
  }, [urlQuery]);

  useEffect(() => {
    if (!urlQuery) {
      const timer = window.setTimeout(() => inputRef.current?.focus(), 240);
      return () => window.clearTimeout(timer);
    }
  }, [urlQuery]);

  const remember = (term: string) => {
    const value = term.trim();
    if (!value) return;
    const next = [value, ...recentSearches.filter((item) => item.toLowerCase() !== value.toLowerCase())].slice(0, 8);
    setRecentSearches(next);
    saveRecentSearches(next);
  };

  const submit = (term: string) => {
    setQuery(term);
    remember(term);
  };

  const clearRecent = () => {
    setRecentSearches([]);
    saveRecentSearches([]);
  };

  const handleHit = (hit: SearchHit) => {
    remember(query);
    if (hit.kind === 'track' && hit.track) {
      playQueue(results.tracks.length > 0 ? results.tracks : [hit.track], 
        Math.max(0, results.tracks.findIndex((track) => track.id === hit.track?.id)),
        `Search · ${query}`);
      return;
    }
    navigate(hit.href);
  };

  const hasQuery = deferredQuery.trim().length > 0;
  const topHit = results.hits[0];

  return (
    <div>
      <header className="mb-6">
        <p className="eyebrow mb-2">Global search</p>
        <h1 className="display text-[clamp(2rem,5vw,3.2rem)] text-white">Find your next scene</h1>
        <p className="mt-2 max-w-2xl text-sm text-mist">
          Search across songs, artists, albums and playlists — instantly, including everything you imported
          from your device.
        </p>
      </header>

      <div className="sticky top-14 z-20 -mx-4 mb-6 bg-[#05070f]/80 px-4 py-3 backdrop-blur-xl sm:top-16 sm:mx-0 sm:rounded-2xl sm:px-4">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit(query);
          }}
          role="search"
          className="relative"
        >
          <Search
            className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-white/40"
            aria-hidden
          />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search songs, artists, albums, playlists…"
            aria-label="Search the music library"
            className="h-14 w-full rounded-2xl border border-white/12 bg-white/[0.05] pl-12 pr-24 text-[15px] text-white outline-none transition placeholder:text-white/35 focus:border-[rgba(var(--accent-rgb),0.55)] focus:bg-white/[0.07] focus:shadow-[0_0_0_4px_rgba(var(--accent-rgb),0.1)]"
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
              className="icon-btn absolute right-14 top-1/2 size-8 -translate-y-1/2"
            >
              <X className="size-4" aria-hidden />
            </button>
          ) : null}
          <button
            type="submit"
            className="absolute right-2.5 top-1/2 hidden -translate-y-1/2 items-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.06] px-3 py-2 text-[11px] text-white/60 sm:flex"
          >
            Search
            <CornerDownLeft className="size-3" aria-hidden />
          </button>
        </form>

        {hasQuery && suggestions.length > 0 ? (
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <Sparkles className="size-3.5 text-white/30" aria-hidden />
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => submit(suggestion)}
                className="chip !normal-case"
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* ---------------------------------------------------------- empty state */}
      {!hasQuery ? (
        <div className="space-y-8">
          {recentSearches.length > 0 ? (
            <section>
              <SectionHeader
                eyebrow="Your history"
                title="Recent searches"
                action={{ label: 'Clear', onClick: clearRecent }}
              />
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => submit(term)}
                    className="chip !normal-case"
                  >
                    <History className="size-3" aria-hidden />
                    {term}
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <SectionHeader eyebrow="Trending" title="Popular searches" />
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
              {POPULAR_SEARCHES.map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => submit(term)}
                  className="glass-soft hover-lift flex items-center gap-3 rounded-xl p-3 text-left"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.04]">
                    <TrendingUp className="size-3.5 text-[var(--accent)]" aria-hidden />
                  </span>
                  <span className="min-w-0 truncate text-[12.5px] text-white/85">{term}</span>
                </button>
              ))}
            </div>
          </section>

          <section>
            <SectionHeader eyebrow="Or explore" title="Mood doorways" action={{ label: 'Explore', to: '/explore' }} />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                { label: 'Rainy Focus', to: '/explore?mood=rainy-focus', art: '/art/rainfall-sonata.jpg' },
                { label: 'Night Drive', to: '/explore?mood=night-drive', art: '/art/neon-requiem.jpg' },
                { label: 'Golden Hour', to: '/explore?mood=golden-hour', art: '/art/paper-lanterns.jpg' },
              ].map((item) => (
                <Link
                  key={item.label}
                  to={item.to}
                  className="group relative flex h-24 items-end overflow-hidden rounded-2xl border border-white/10 p-4"
                >
                  <img
                    src={item.art}
                    alt=""
                    className="absolute inset-0 size-full object-cover opacity-50 transition duration-700 group-hover:scale-105 group-hover:opacity-65"
                    loading="lazy"
                  />
                  <span className="absolute inset-0 bg-gradient-to-t from-[#04050c] to-transparent" />
                  <span className="relative text-sm text-white">{item.label}</span>
                </Link>
              ))}
            </div>
          </section>

          <EmptyState
            icon={Search}
            title="Search everything at once"
            description="Type a title, an artist, an album, a playlist — or a mood like “rain”. Results appear as you type."
            action={
              <button type="button" onClick={() => inputRef.current?.focus()} className="btn btn-primary">
                <Search className="size-4" aria-hidden />
                Start searching
              </button>
            }
          />
        </div>
      ) : results.total === 0 ? (
        <EmptyState
          icon={SearchX}
          title={`No results for “${deferredQuery}”`}
          description="Try a different spelling, a shorter phrase, or one of the suggestions below."
          action={
            <>
              {POPULAR_SEARCHES.slice(0, 3).map((term) => (
                <button key={term} type="button" onClick={() => submit(term)} className="btn btn-glass">
                  {term}
                </button>
              ))}
            </>
          }
        />
      ) : (
        <div className="space-y-9">
          {/* --------------------------------------------------------- top result */}
          <div className="grid gap-5 lg:grid-cols-[0.95fr_1.15fr]">
            {topHit ? <TopResult hit={topHit} onSelect={() => handleHit(topHit)} /> : null}

            <div className="glass rounded-3xl p-4">
              <p className="eyebrow mb-2 px-1">Quick results</p>
              <div className="space-y-1">
                {results.hits.map((hit) => (
                  <button
                    key={`${hit.kind}-${hit.id}`}
                    type="button"
                    onClick={() => handleHit(hit)}
                    className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-white/[0.06]"
                  >
                    {hit.cover ? (
                      <Cover src={hit.cover} alt="" className="size-10 shrink-0" rounded="rounded-lg" overlay={false} />
                    ) : (
                      <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.04]">
                        <Play className="size-3.5 text-white/60" aria-hidden />
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] text-white">{hit.title}</span>
                      <span className="block truncate text-[11px] capitalize text-mist">
                        {hit.kind} · {hit.subtitle}
                      </span>
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.14em] text-white/30">
                      {hit.kind === 'track' ? 'Play' : 'Open'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------------- tracks */}
          {results.tracks.length > 0 ? (
            <section>
              <SectionHeader
                title="Songs"
                description={pluralize(results.tracks.length, 'matching track')}
                right={
                  <div className="flex items-center gap-2">
                    <ArrowUpDown className="size-3.5 text-white/40" aria-hidden />
                    <label className="sr-only" htmlFor="search-sort">
                      Sort songs
                    </label>
                    <select
                      id="search-sort"
                      value={sort}
                      onChange={(event) => setSort(event.target.value as TrackSort)}
                      className="rounded-full border border-white/12 bg-white/[0.05] px-3 py-1.5 text-[11.5px] text-white/75 outline-none"
                    >
                      <option value="default" className="bg-[#0a0f1f]">Best match</option>
                      <option value="title" className="bg-[#0a0f1f]">Title (A–Z)</option>
                      <option value="artist" className="bg-[#0a0f1f]">Artist (A–Z)</option>
                      <option value="recent" className="bg-[#0a0f1f]">Recently played</option>
                    </select>
                    <PlayButton
                      tracks={sortedTracks}
                      label={`Search · ${query}`}
                      size="sm"
                      showText="Play all"
                      className="!px-3.5 !py-1.5 text-[12px]"
                    />
                  </div>
                }
              />
              <div className="glass rounded-2xl p-2 sm:p-3">
                <TrackList tracks={sortedTracks} label={`Search · ${query}`} />
              </div>
            </section>
          ) : null}

          {results.albums.length > 0 ? (
            <section>
              <SectionHeader title="Albums" description={pluralize(results.albums.length, 'release')} />
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {results.albums.map((album) => (
                  <AlbumCard key={album.id} album={album} />
                ))}
              </div>
            </section>
          ) : null}

          {results.artists.length > 0 ? (
            <section>
              <SectionHeader title="Artists" />
              <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
                {results.artists.map((artist) => (
                  <ArtistCard key={artist.id} artist={artist} />
                ))}
              </div>
            </section>
          ) : null}

          {results.playlists.length > 0 ? (
            <section>
              <SectionHeader title="Playlists" action={{ label: 'All playlists', to: '/playlists' }} />
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {results.playlists.map((playlist) => (
                  <PlaylistCard
                    key={playlist.id}
                    id={playlist.id}
                    name={playlist.name}
                    description={playlist.description}
                    covers={tracksByIds(playlist.trackIds).slice(0, 4).map((track) => track.cover)}
                    trackCount={playlist.trackIds.length}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {results.playlists.length === 0 && playlists.length > 0 ? (
            <p className="text-center text-[11px] text-white/30">
              No playlist matched “{deferredQuery}”. You have {pluralize(playlists.length, 'playlist')} in your library.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

function TopResult({ hit, onSelect }: { hit: SearchHit; onSelect: () => void }) {
  return (
    <div className="glass relative overflow-hidden rounded-3xl p-5">
      <div
        className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full opacity-40 blur-3xl"
        style={{ background: 'radial-gradient(circle, var(--accent), transparent 70%)' }}
        aria-hidden
      />
      <p className="eyebrow">Top result</p>
      <div className="mt-4 flex items-end gap-4">
        <Cover
          src={hit.cover}
          alt=""
          className="size-24 shrink-0 sm:size-28"
          rounded="rounded-2xl"
          priority
        />
        <div className="min-w-0">
          <p className="truncate font-display text-2xl leading-tight text-white sm:text-3xl">{hit.title}</p>
          <p className="mt-1 truncate text-[12px] text-mist">{hit.subtitle}</p>
          <p className="mt-2 inline-flex rounded-full border border-white/12 bg-white/[0.05] px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-white/50">
            {hit.kind}
          </p>
        </div>
      </div>
      <div className="mt-5 flex gap-2">
        <button type="button" onClick={onSelect} className="btn btn-primary">
          <Play className="size-4 fill-current" aria-hidden />
          {hit.kind === 'track' ? 'Play now' : 'Open'}
        </button>
        {hit.kind !== 'track' ? (
          <Link to={hit.href} className={cn('btn btn-glass', '!px-4')}>
            Details
          </Link>
        ) : null}
      </div>
    </div>
  );
}
