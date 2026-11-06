import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MapPin, Play, Shuffle, UserRound } from 'lucide-react';
import { GENRE_BY_ID } from '@/data/catalog';
import { AlbumCard } from '@/components/cards/Cards';
import { Cover } from '@/components/ui/Cover';
import { EmptyState } from '@/components/ui/EmptyState';
import { PlayButton } from '@/components/ui/PlayButton';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { TrackList } from '@/components/music/TrackList';
import { useLibrary } from '@/state/LibraryProvider';
import { usePlayer } from '@/state/PlayerProvider';
import { usePageTitle } from '@/hooks/usePageTitle';
import { formatNumber, pluralize, shuffleArray } from '@/lib/utils';

export function ArtistDetailPage() {
  const { artistId = '' } = useParams();
  const { getArtist, tracks, albums } = useLibrary();
  const { playQueue } = usePlayer();
  const artist = getArtist(artistId);

  const artistTracks = useMemo(
    () => tracks.filter((track) => track.artistId === artistId),
    [artistId, tracks],
  );
  const artistAlbums = useMemo(
    () => albums.filter((album) => album.artistId === artistId),
    [albums, artistId],
  );

  usePageTitle(artist?.name ?? 'Artist');

  if (!artist) {
    return (
      <EmptyState
        icon={UserRound}
        title="Artist not found"
        description="This artist is not part of your library right now."
        action={
          <Link to="/explore" className="btn btn-primary">
            Explore music
          </Link>
        }
      />
    );
  }

  const label = `Artist · ${artist.name}`;

  return (
    <div>
      <section className="relative mb-7 overflow-hidden rounded-3xl border border-white/10">
        <img src={artist.image} alt="" className="absolute inset-0 size-full scale-110 object-cover blur-2xl opacity-35" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#04050c]/95 via-[#04050c]/80 to-[#04050c]/45" />
        <div className="relative flex flex-col items-start gap-5 p-5 sm:flex-row sm:items-end sm:p-8">
          <Cover
            src={artist.image}
            alt={`${artist.name} portrait`}
            className="w-32 shrink-0 sm:w-44"
            rounded="rounded-full ring-glow"
            priority
          />
          <div className="min-w-0 flex-1">
            <p className="eyebrow flex items-center gap-1.5">
              <UserRound className="size-3" aria-hidden />
              Artist
            </p>
            <h1 className="display mt-2 text-[clamp(2.2rem,5.8vw,4rem)] text-white">{artist.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-white/55">
              {artist.origin ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3" aria-hidden />
                  {artist.origin}
                </span>
              ) : null}
              <span aria-hidden>·</span>
              <span>
                {artist.monthlyListeners > 0
                  ? `${formatNumber(artist.monthlyListeners)} monthly listeners`
                  : 'Imported from your device'}
              </span>
              <span aria-hidden>·</span>
              <span>{pluralize(artistTracks.length, 'track')}</span>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {artist.genres.map((genre) => (
                <Link key={genre} to={`/explore?genre=${genre}`} className="chip !normal-case">
                  {GENRE_BY_ID[genre]?.label ?? genre}
                </Link>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <PlayButton tracks={artistTracks} label={label} showText="Play all" variant="solid" size="sm" />
              <button
                type="button"
                onClick={() => playQueue(shuffleArray(artistTracks), 0, `Shuffle · ${artist.name}`)}
                className="btn btn-glass"
              >
                <Shuffle className="size-4" aria-hidden />
                Shuffle
              </button>
              <button
                type="button"
                onClick={() => playQueue(artistTracks, 0, label)}
                className="btn btn-ghost"
              >
                <Play className="size-4" aria-hidden />
                Start radio-style queue
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section>
          <SectionHeader eyebrow="Popular" title="Tracks" />
          <div className="glass rounded-2xl p-2 sm:p-3">
            <TrackList
              tracks={artistTracks}
              label={label}
              empty={
                <EmptyState
                  icon={UserRound}
                  title="No tracks yet"
                  description="Import audio credited to this artist to fill the page."
                  compact
                />
              }
            />
          </div>
        </section>

        <aside className="space-y-4">
          <div className="glass rounded-2xl p-5">
            <p className="eyebrow">About</p>
            <p className="mt-2 text-[12.5px] leading-relaxed text-mist">{artist.bio}</p>
          </div>
          <div className="glass-soft rounded-2xl p-5">
            <p className="eyebrow">At a glance</p>
            <dl className="mt-3 space-y-2.5 text-[12.5px]">
              <div className="flex justify-between gap-3">
                <dt className="text-white/45">Tracks</dt>
                <dd className="text-white">{artistTracks.length}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-white/45">Releases</dt>
                <dd className="text-white">{artistAlbums.length}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-white/45">Genres</dt>
                <dd className="text-right text-white">
                  {artist.genres.map((genre) => GENRE_BY_ID[genre]?.label ?? genre).join(', ') || '—'}
                </dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>

      {artistAlbums.length > 0 ? (
        <section className="mt-9">
          <SectionHeader eyebrow="Discography" title={`Releases by ${artist.name}`} />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {artistAlbums.map((album) => (
              <AlbumCard key={album.id} album={album} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
