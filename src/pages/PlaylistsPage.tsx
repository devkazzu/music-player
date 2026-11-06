import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ListMusic, Plus } from 'lucide-react';
import { PlaylistCard } from '@/components/cards/Cards';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { PlaylistDialog } from '@/components/ui/PlaylistDialog';
import { useLibrary } from '@/state/LibraryProvider';
import { usePageTitle } from '@/hooks/usePageTitle';
import { formatDuration, pluralize } from '@/lib/utils';

export function PlaylistsPage() {
  usePageTitle('Playlists');
  const { playlists, tracksByIds, createPlaylist, ready } = useLibrary();
  const [dialogOpen, setDialogOpen] = useState(false);
  const navigate = useNavigate();

  const totalTracks = playlists.reduce((sum, playlist) => sum + playlist.trackIds.length, 0);

  return (
    <div>
      <PageHeader
        eyebrow="Your collections"
        title="Playlists"
        description="Build a scene, name it, keep it forever. Playlists are stored on this device and stay available offline."
        actions={
          <button type="button" onClick={() => setDialogOpen(true)} className="btn btn-primary">
            <Plus className="size-4" aria-hidden />
            New playlist
          </button>
        }
      >
        <div className="flex flex-wrap gap-4 text-[11.5px] text-white/45">
          <span>{pluralize(playlists.length, 'playlist')}</span>
          <span>{pluralize(totalTracks, 'track')} in collections</span>
        </div>
      </PageHeader>

      {!ready ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="space-y-3">
              <div className="skeleton aspect-square w-full rounded-2xl" />
              <div className="skeleton h-3.5 w-3/4" />
              <div className="skeleton h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : playlists.length === 0 ? (
        <EmptyState
          icon={ListMusic}
          title="No playlists yet"
          description="A playlist is the fastest way to keep a mood. Create one and add tracks from anywhere in the app."
          action={
            <button type="button" onClick={() => setDialogOpen(true)} className="btn btn-primary">
              <Plus className="size-4" aria-hidden />
              Create your first playlist
            </button>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {playlists.map((playlist) => {
              const tracks = tracksByIds(playlist.trackIds);
              return (
                <PlaylistCard
                  key={playlist.id}
                  id={playlist.id}
                  name={playlist.name}
                  description={`${pluralize(tracks.length, 'track')} · ${formatDuration(
                    tracks.reduce((sum, track) => sum + track.duration, 0),
                  )}`}
                  covers={tracks.slice(0, 4).map((track) => track.cover)}
                  trackCount={tracks.length}
                />
              );
            })}
          </div>

          <div className="glass-soft mt-8 flex flex-col items-start gap-3 rounded-2xl p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[13px] font-medium text-white">Looking for something specific?</p>
              <p className="mt-0.5 text-[12px] text-mist">
                Search the whole library, or use the heart button to save tracks to favourites.
              </p>
            </div>
            <div className="flex gap-2">
              <Link to="/search" className="btn btn-glass">
                Search music
              </Link>
              <Link to="/favourites" className="btn btn-ghost">
                Favourites
              </Link>
            </div>
          </div>
        </>
      )}

      <PlaylistDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={async ({ name, description }) => {
          const playlist = await createPlaylist({ name, description });
          if (playlist) navigate(`/playlists/${playlist.id}`);
        }}
      />
    </div>
  );
}
