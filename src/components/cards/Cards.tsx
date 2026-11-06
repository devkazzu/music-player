import { Link } from 'react-router-dom';
import { ListMusic, Sparkles } from 'lucide-react';
import type { Album, Artist, Mood } from '@/types';
import { Cover } from '@/components/ui/Cover';
import { PlayButton } from '@/components/ui/PlayButton';
import { useLibrary } from '@/state/LibraryProvider';
import { cn, formatNumber } from '@/lib/utils';

/* -------------------------------------------------------------------- album */
export function AlbumCard({
  album,
  className,
  priority = false,
}: {
  album: Album;
  className?: string;
  priority?: boolean;
}) {
  const { tracksByIds } = useLibrary();
  const tracks = tracksByIds(album.trackIds);

  return (
    <article className={cn('group', className)}>
      <div className="relative">
        <Link
          to={`/album/${album.id}`}
          className="block overflow-hidden rounded-2xl focus-visible:outline-2"
          aria-label={`Open album ${album.title}`}
        >
          <Cover
            src={album.cover}
            alt={`${album.title} album artwork`}
            className="aspect-square w-full"
            rounded="rounded-2xl"
            overlay
            priority={priority}
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 220px"
          />
        </Link>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between p-3">
          <div className="pointer-events-auto translate-y-2 opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">
            <PlayButton tracks={tracks} label={`Album · ${album.title}`} size="md" />
          </div>
          <span className="pointer-events-none rounded-full border border-white/15 bg-black/45 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-white/70 backdrop-blur-md">
            {album.kind}
          </span>
        </div>
      </div>
      <div className="mt-3">
        <Link to={`/album/${album.id}`} className="block truncate text-sm font-medium text-white hover:underline">
          {album.title}
        </Link>
        <Link
          to={`/artist/${album.artistId}`}
          className="mt-0.5 block truncate text-xs text-mist hover:text-white/90"
        >
          {album.artist} · {album.year}
        </Link>
      </div>
    </article>
  );
}

/* ----------------------------------------------------------------- playlist */
export function PlaylistCover({
  covers,
  className,
  rounded = 'rounded-2xl',
}: {
  covers: string[];
  className?: string;
  rounded?: string;
}) {
  const quad = covers.slice(0, 4);
  return (
    <div
      className={cn(
        'cover-frame relative aspect-square w-full overflow-hidden bg-[linear-gradient(135deg,rgba(139,92,246,0.4),rgba(56,232,255,0.2))]',
        rounded,
        className,
      )}
      data-overlay="false"
    >
      {quad.length === 0 ? (
        <div className="grid size-full place-items-center">
          <ListMusic className="size-1/3 max-h-10 max-w-10 text-white/50" aria-hidden />
        </div>
      ) : quad.length === 1 ? (
        <img src={quad[0]} alt="" className="size-full object-cover" loading="lazy" />
      ) : (
        <div className="grid size-full grid-cols-2 grid-rows-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="overflow-hidden bg-white/5">
              {quad[index] ? (
                <img
                  src={quad[index]}
                  alt=""
                  className="size-full object-cover"
                  loading="lazy"
                />
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function PlaylistCard({
  id,
  name,
  description,
  covers,
  trackCount,
  className,
}: {
  id: string;
  name: string;
  description?: string;
  covers: string[];
  trackCount: number;
  className?: string;
}) {
  return (
    <article className={cn('group', className)}>
      <Link to={`/playlists/${id}`} className="block" aria-label={`Open playlist ${name}`}>
        <div className="relative overflow-hidden rounded-2xl">
          <PlaylistCover covers={covers} />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
        </div>
        <h3 className="mt-3 truncate text-sm font-medium text-white group-hover:underline">{name}</h3>
        <p className="mt-0.5 truncate text-xs text-mist">
          {description || `${trackCount} ${trackCount === 1 ? 'track' : 'tracks'}`}
        </p>
      </Link>
    </article>
  );
}

/* ------------------------------------------------------------------- artist */
export function ArtistCard({
  artist,
  className,
}: {
  artist: Artist;
  className?: string;
}) {
  return (
    <Link
      to={`/artist/${artist.id}`}
      className={cn('group block text-center sm:text-left', className)}
    >
      <div className="relative mx-auto aspect-square w-full max-w-44 overflow-hidden rounded-full border border-white/10 sm:mx-0">
        <Cover
          src={artist.image}
          alt={`${artist.name} portrait`}
          className="size-full"
          rounded="rounded-full"
          imgClassName="transition duration-700 group-hover:scale-105"
        />
        <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-t from-black/40 to-transparent opacity-0 transition group-hover:opacity-100" />
      </div>
      <h3 className="mt-3 truncate text-sm font-medium text-white group-hover:underline">{artist.name}</h3>
      <p className="mt-0.5 truncate text-xs text-mist">
        {artist.monthlyListeners > 0
          ? `${formatNumber(artist.monthlyListeners)} monthly listeners`
          : 'Local library'}
      </p>
    </Link>
  );
}

/* --------------------------------------------------------------------- mood */
export function MoodCard({ mood, className }: { mood: Mood; className?: string }) {
  return (
    <Link
      to={`/explore?mood=${mood.id}`}
      className={cn(
        'group relative block aspect-[16/10] overflow-hidden rounded-2xl border border-white/10',
        className,
      )}
    >
      <img
        src={mood.cover}
        alt=""
        className="size-full object-cover transition duration-700 group-hover:scale-105"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#04050c] via-[#04050c]/45 to-transparent" />
      <div className="absolute inset-0 flex flex-col justify-end p-4">
        <p className="jp text-[10px] text-white/55">{mood.japanese}</p>
        <p className="mt-0.5 font-display text-xl leading-none text-white">{mood.label}</p>
        <p className="mt-1 line-clamp-1 text-[11px] text-white/55">{mood.description}</p>
      </div>
      <span
        className="absolute right-3 top-3 grid size-7 place-items-center rounded-full border border-white/15 bg-black/35 backdrop-blur-md"
        aria-hidden
      >
        <Sparkles className="size-3.5" style={{ color: mood.accent }} />
      </span>
    </Link>
  );
}
