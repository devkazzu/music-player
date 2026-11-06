import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpDown, Heart, ListPlus, Shuffle, Trash2 } from 'lucide-react';
import { ART } from '@/data/catalog';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { PlayButton } from '@/components/ui/PlayButton';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TrackList } from '@/components/music/TrackList';
import { useLibrary } from '@/state/LibraryProvider';
import { usePlayer } from '@/state/PlayerProvider';
import { usePageTitle } from '@/hooks/usePageTitle';
import { TRACK_SORT_LABELS, sortTracks, type TrackSort } from '@/lib/sorting';
import { formatDuration, pluralize, shuffleArray } from '@/lib/utils';

export function FavouritesPage() {
  usePageTitle('Favourites');
  const { favouriteTracks, clearFavourites } = useLibrary();
  const { playQueue, addToQueue } = usePlayer();
  const [sort, setSort] = useState<TrackSort>('default');
  const [clearOpen, setClearOpen] = useState(false);

  const sorted = useMemo(() => sortTracks(favouriteTracks, sort), [favouriteTracks, sort]);
  const total = favouriteTracks.reduce((sum, track) => sum + track.duration, 0);
  const label = 'Favourites';

  return (
    <div>
      <PageHeader
        eyebrow="Saved to your heart"
        title="Favourite tracks"
        description="Everything you have ever hearted, in one quiet place. Stored on this device, available offline."
        image={ART.lanterns ?? undefined}
        compact
        actions={
          favouriteTracks.length > 0 ? (
            <>
              <PlayButton tracks={sorted} label={label} showText="Play favourites" variant="solid" size="sm" />
              <button
                type="button"
                onClick={() => playQueue(shuffleArray(sorted), 0, 'Favourites · Shuffle')}
                className="btn btn-glass"
              >
                <Shuffle className="size-4" aria-hidden />
                Shuffle
              </button>
              <button
                type="button"
                onClick={() => {
                  favouriteTracks.forEach((track) => addToQueue(track));
                }}
                className="btn btn-ghost"
              >
                <ListPlus className="size-4" aria-hidden />
                Queue all
              </button>
            </>
          ) : null
        }
      >
        {favouriteTracks.length > 0 ? (
          <p className="text-[11.5px] text-white/45">
            {pluralize(favouriteTracks.length, 'track')} · {formatDuration(total)}
          </p>
        ) : null}
      </PageHeader>

      {favouriteTracks.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="No favourites yet"
          description="Tap the heart beside any track and it lands here instantly — across the whole app."
          action={
            <>
              <Link to="/explore" className="btn btn-primary">
                Explore music
              </Link>
              <Link to="/search" className="btn btn-glass">
                Search the library
              </Link>
            </>
          }
        />
      ) : (
        <>
          <SectionHeader
            title="Your collection"
            description="Sorted however you like it."
            right={
              <div className="flex items-center gap-2">
                <ArrowUpDown className="size-3.5 text-white/40" aria-hidden />
                <label className="sr-only" htmlFor="favourites-sort">
                  Sort favourites
                </label>
                <select
                  id="favourites-sort"
                  value={sort}
                  onChange={(event) => setSort(event.target.value as TrackSort)}
                  className="rounded-full border border-white/12 bg-white/[0.05] px-3 py-1.5 text-[11.5px] text-white/75 outline-none"
                >
                  {(Object.keys(TRACK_SORT_LABELS) as TrackSort[]).map((key) => (
                    <option key={key} value={key} className="bg-[#0a0f1f]">
                      {TRACK_SORT_LABELS[key]}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setClearOpen(true)}
                  className="btn btn-ghost !px-2.5 !py-1.5 text-[11px]"
                >
                  <Trash2 className="size-3.5" aria-hidden />
                  Clear
                </button>
              </div>
            }
          />

          <div className="glass rounded-2xl p-2 sm:p-3">
            <TrackList tracks={sorted} label={label} />
          </div>
        </>
      )}

      <ConfirmDialog
        open={clearOpen}
        title="Clear all favourites?"
        description={`This removes ${pluralize(favouriteTracks.length, 'track')} from favourites. The tracks stay in your library.`}
        confirmLabel="Clear favourites"
        onClose={() => setClearOpen(false)}
        onConfirm={async () => {
          await clearFavourites();
          setClearOpen(false);
        }}
      />
    </div>
  );
}
