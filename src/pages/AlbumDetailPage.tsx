import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Disc3, ListPlus, MoreHorizontal, Shuffle, Sparkles } from 'lucide-react';
import { GENRE_BY_ID, MOOD_BY_ID } from '@/data/catalog';
import { AlbumCard } from '@/components/cards/Cards';
import { Cover } from '@/components/ui/Cover';
import { EmptyState } from '@/components/ui/EmptyState';
import { Menu } from '@/components/ui/Menu';
import { PlayButton } from '@/components/ui/PlayButton';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { TrackList } from '@/components/music/TrackList';
import { useLibrary } from '@/state/LibraryProvider';
import { usePlayer } from '@/state/PlayerProvider';
import { usePlaylistPicker } from '@/state/PlaylistPickerProvider';
import { useUI } from '@/state/UIContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import { formatDuration, pluralize, shuffleArray } from '@/lib/utils';

export function AlbumDetailPage() {
  const { albumId = '' } = useParams();
  const { getAlbum, tracksByIds, albums } = useLibrary();
  const { playQueue, addToQueue } = usePlayer();
  const { openPlaylistPicker } = usePlaylistPicker();
  const { toast } = useUI();
  const navigate = useNavigate();

  const album = getAlbum(albumId);
  const tracks = useMemo(() => (album ? tracksByIds(album.trackIds) : []), [album, tracksByIds]);
  const total = tracks.reduce((sum, track) => sum + track.duration, 0);
  const artistAlbums = album ? albums.filter((item) => item.artistId === album.artistId && item.id !== album.id) : [];

  usePageTitle(album?.title ?? 'Album');

  if (!album) {
    return (
      <EmptyState
        icon={Disc3}
        title="Album not found"
        description="This release may have been removed from your library."
        action={
          <Link to="/explore" className="btn btn-primary">
            Back to explore
          </Link>
        }
      />
    );
  }

  const label = `Album · ${album.title}`;

  return (
    <div>
      <section className="relative mb-8 overflow-hidden rounded-3xl border border-white/10">
        <Cover
          src={album.cover}
          alt=""
          className="absolute inset-0 size-full"
          rounded="rounded-3xl"
          priority
          overlay={false}
          imgClassName="scale-110 blur-2xl opacity-45"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#04050c]/96 via-[#04050c]/80 to-[#04050c]/40" />
        <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-end sm:gap-7 sm:p-8">
          <Cover
            src={album.cover}
            alt={`${album.title} cover art`}
            className="w-40 shrink-0 sm:w-52"
            rounded="rounded-2xl ring-glow"
            priority
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="chip" data-selected="true">
                {album.kind}
              </span>
              <span className="text-[11px] uppercase tracking-[0.16em] text-white/45">
                {album.year} · {pluralize(tracks.length, 'track')} · {formatDuration(total)}
              </span>
            </div>
            <h1 className="display mt-3 text-[clamp(2.1rem,5.6vw,3.8rem)] text-white">{album.title}</h1>
            <Link
              to={`/artist/${album.artistId}`}
              className="mt-1.5 inline-block text-[13.5px] text-white/70 underline-offset-4 hover:text-white hover:underline"
            >
              {album.artist}
            </Link>
            <p className="mt-3 max-w-xl text-[12.5px] leading-relaxed text-white/55">{album.description}</p>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {album.genres.map((genre) => (
                <Link key={genre} to={`/explore?genre=${genre}`} className="chip !normal-case">
                  {GENRE_BY_ID[genre]?.label ?? genre}
                </Link>
              ))}
              {album.moods.slice(0, 2).map((mood) => (
                <Link key={mood} to={`/explore?mood=${mood}`} className="chip !normal-case">
                  <Sparkles className="size-3" aria-hidden />
                  {MOOD_BY_ID[mood]?.label ?? mood}
                </Link>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <PlayButton tracks={tracks} label={label} showText="Play album" variant="solid" size="sm" />
              <button
                type="button"
                onClick={() => playQueue(shuffleArray(tracks), 0, `Shuffle · ${album.title}`)}
                className="btn btn-glass"
              >
                <Shuffle className="size-4" aria-hidden />
                Shuffle
              </button>
              <button
                type="button"
                onClick={() => {
                  tracks.forEach((track) => addToQueue(track));
                  toast({
                    title: 'Album queued',
                    description: `${pluralize(tracks.length, 'track')} from ${album.title} added.`,
                    tone: 'success',
                  });
                }}
                className="btn btn-ghost"
              >
                <ListPlus className="size-4" aria-hidden />
                Queue album
              </button>
              <Menu
                label="Album actions"
                items={[
                  {
                    id: 'add-playlist',
                    label: 'Add album to playlist',
                    onSelect: () => openPlaylistPicker(tracks.map((track) => track.id)),
                  },
                  {
                    id: 'view-artist',
                    label: 'View artist',
                    onSelect: () => navigate(`/artist/${album.artistId}`),
                  },
                ]}
                trigger={(props) => (
                  <button {...props} type="button" className="icon-btn size-9" aria-label="More album actions">
                    <MoreHorizontal className="size-4" aria-hidden />
                  </button>
                )}
              />
            </div>
          </div>
        </div>
      </section>

      <div className="glass rounded-2xl p-2 sm:p-3">
        <TrackList tracks={tracks} label={label} />
      </div>

      {artistAlbums.length > 0 ? (
        <section className="mt-9">
          <SectionHeader
            eyebrow={`More from ${album.artist}`}
            title="Other releases"
            action={{ label: 'Artist', to: `/artist/${album.artistId}` }}
          />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {artistAlbums.map((item) => (
              <AlbumCard key={item.id} album={item} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
