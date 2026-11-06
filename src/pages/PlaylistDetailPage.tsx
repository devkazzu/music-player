import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowDown,
  ArrowUp,
  ListMusic,
  Pencil,
  Plus,
  Search,
  Shuffle,
  Trash2,
} from 'lucide-react';
import { Cover } from '@/components/ui/Cover';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { PlayButton } from '@/components/ui/PlayButton';
import { PlaylistCover } from '@/components/cards/Cards';
import { PlaylistDialog } from '@/components/ui/PlaylistDialog';
import { TrackList } from '@/components/music/TrackList';
import { useLibrary } from '@/state/LibraryProvider';
import { usePlayer } from '@/state/PlayerProvider';
import { useUI } from '@/state/UIContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import { cn, formatDuration, pluralize, shuffleArray } from '@/lib/utils';

export function PlaylistDetailPage() {
  const { playlistId = '' } = useParams();
  const navigate = useNavigate();
  const { getPlaylist, tracksByIds, tracks, deletePlaylist, updatePlaylist, removeTrackFromPlaylist, movePlaylistTrack, addTracksToPlaylist } =
    useLibrary();
  const { playQueue } = usePlayer();
  const { toast } = useUI();

  const playlist = getPlaylist(playlistId);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const playlistTracks = useMemo(
    () => (playlist ? tracksByIds(playlist.trackIds) : []),
    [playlist, tracksByIds],
  );
  const total = playlistTracks.reduce((sum, track) => sum + track.duration, 0);

  usePageTitle(playlist?.name ?? 'Playlist');

  if (!playlist) {
    return (
      <EmptyState
        icon={ListMusic}
        title="Playlist not found"
        description="It may have been deleted. Your other playlists are safe."
        action={
          <Link to="/playlists" className="btn btn-primary">
            Back to playlists
          </Link>
        }
      />
    );
  }

  const label = `Playlist · ${playlist.name}`;

  return (
    <div>
      <section className="relative mb-7 overflow-hidden rounded-3xl border border-white/10">
        <img
          src={playlistTracks[0]?.cover ?? '/art/rainy-street-wide.jpg'}
          alt=""
          className="absolute inset-0 size-full scale-110 object-cover blur-2xl opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#04050c]/95 via-[#04050c]/85 to-[#04050c]/55" />
        <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-end sm:gap-7 sm:p-8">
          <PlaylistCover
            covers={playlistTracks.slice(0, 4).map((track) => track.cover)}
            className="w-36 shrink-0 shadow-2xl ring-1 ring-white/10 sm:w-48"
            rounded="rounded-2xl"
          />
          <div className="min-w-0 flex-1">
            <p className="eyebrow">Playlist</p>
            <h1 className="display mt-2 break-words text-[clamp(2rem,5.4vw,3.6rem)] text-white">
              {playlist.name}
            </h1>
            <p className="mt-2 max-w-xl text-[12.5px] leading-relaxed text-white/55">
              {playlist.description || 'No description yet — edit this playlist to add one.'}
            </p>
            <p className="mt-2 text-[11.5px] text-white/40">
              {pluralize(playlistTracks.length, 'track')} · {formatDuration(total)}
              {playlist.seeded ? ' · curated starter' : ' · your playlist'}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <PlayButton tracks={playlistTracks} label={label} showText="Play" variant="solid" size="sm" />
              <button
                type="button"
                disabled={playlistTracks.length === 0}
                onClick={() => playQueue(shuffleArray(playlistTracks), 0, `Shuffle · ${playlist.name}`)}
                className="btn btn-glass disabled:opacity-40"
              >
                <Shuffle className="size-4" aria-hidden />
                Shuffle
              </button>
              <button type="button" onClick={() => setAddOpen(true)} className="btn btn-glass">
                <Plus className="size-4" aria-hidden />
                Add tracks
              </button>
              <button type="button" onClick={() => setRenameOpen(true)} className="btn btn-ghost">
                <Pencil className="size-4" aria-hidden />
                Edit
              </button>
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                className="icon-btn size-9 hover:text-rose-300"
                aria-label="Delete playlist"
                title="Delete playlist"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="glass rounded-2xl p-2 sm:p-3">
        <TrackList
          tracks={playlistTracks}
          label={label}
          rowExtras={(track, index) => [
            {
              id: 'move-up',
              label: 'Move up',
              icon: ArrowUp,
              separatorBefore: true,
              onSelect: () => void movePlaylistTrack(playlist.id, track.id, -1),
            },
            {
              id: 'move-down',
              label: 'Move down',
              icon: ArrowDown,
              onSelect: () => void movePlaylistTrack(playlist.id, track.id, 1),
            },
            {
              id: 'remove',
              label: 'Remove from playlist',
              icon: Trash2,
              danger: true,
              onSelect: () => {
                void removeTrackFromPlaylist(playlist.id, track.id);
                toast({
                  title: 'Removed from playlist',
                  description: `${track.title} was removed from “${playlist.name}”.`,
                  tone: 'default',
                });
              },
            },
          ].filter((action) => {
            if (action.id === 'move-up') return index > 0;
            if (action.id === 'move-down') return index < playlistTracks.length - 1;
            return true;
          })}
          empty={
            <EmptyState
              icon={ListMusic}
              title="This playlist is empty"
              description="Add songs from your library, explore the catalogue, or import your own audio."
              action={
                <>
                  <button type="button" onClick={() => setAddOpen(true)} className="btn btn-primary">
                    <Plus className="size-4" aria-hidden />
                    Add tracks
                  </button>
                  <Link to="/explore" className="btn btn-glass">
                    Explore music
                  </Link>
                </>
              }
            />
          }
        />
      </div>

      <PlaylistDialog
        open={renameOpen}
        mode="rename"
        initialName={playlist.name}
        initialDescription={playlist.description}
        onClose={() => setRenameOpen(false)}
        onSubmit={async ({ name, description }) => {
          await updatePlaylist(playlist.id, { name, description });
          toast({ title: 'Playlist updated', tone: 'success' });
        }}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="Delete playlist?"
        description={`“${playlist.name}” will be removed from this device. The tracks themselves are not deleted.`}
        confirmLabel="Delete playlist"
        onClose={() => setDeleteOpen(false)}
        onConfirm={async () => {
          await deletePlaylist(playlist.id);
          setDeleteOpen(false);
          navigate('/playlists');
        }}
      />

      <AddTracksDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        existingIds={playlist.trackIds}
        onAdd={async (ids) => {
          const added = await addTracksToPlaylist(playlist.id, ids);
          toast({
            title: `${added} ${added === 1 ? 'track' : 'tracks'} added`,
            description: `Added to “${playlist.name}”.`,
            tone: 'success',
          });
          setAddOpen(false);
        }}
        libraryTracks={tracks}
      />
    </div>
  );
}

interface AddTracksDialogProps {
  open: boolean;
  onClose: () => void;
  existingIds: string[];
  libraryTracks: ReturnType<typeof useLibrary>['tracks'];
  onAdd: (ids: string[]) => Promise<void>;
}

function AddTracksDialog({ open, onClose, existingIds, libraryTracks, onAdd }: AddTracksDialogProps) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const available = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return libraryTracks
      .filter((track) => !existingIds.includes(track.id))
      .filter((track) =>
        normalized
          ? `${track.title} ${track.artist} ${track.album}`.toLowerCase().includes(normalized)
          : true,
      )
      .slice(0, 60);
  }, [existingIds, libraryTracks, query]);

  const toggle = (id: string) => {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const submit = async () => {
    if (selected.length === 0) return;
    setBusy(true);
    try {
      await onAdd(selected);
      setSelected([]);
      setQuery('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add tracks"
      description="Pick from your full library — including files you imported."
      footer={
        <>
          <button type="button" className="btn btn-glass" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void submit()}
            disabled={selected.length === 0 || busy}
          >
            <Plus className="size-4" aria-hidden />
            Add {selected.length > 0 ? `${selected.length} ` : ''}
            {selected.length === 1 ? 'track' : 'tracks'}
          </button>
        </>
      }
    >
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-mist" aria-hidden />
        <input
          className="field pl-9"
          placeholder="Search your library"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search your library"
        />
      </div>

      {available.length === 0 ? (
        <p className="py-8 text-center text-sm text-mist">
          {libraryTracks.length === existingIds.length
            ? 'Every track in your library is already in this playlist.'
            : 'No matching tracks.'}
        </p>
      ) : (
        <div className="max-h-72 space-y-0.5 overflow-y-auto scroll-thin pr-0.5">
          {available.map((track) => {
            const isSelected = selected.includes(track.id);
            return (
              <button
                key={track.id}
                type="button"
                onClick={() => toggle(track.id)}
                aria-pressed={isSelected}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl p-2 text-left transition',
                  isSelected ? 'bg-[rgba(var(--accent-rgb),0.12)]' : 'hover:bg-white/[0.06]',
                )}
              >
                <Cover src={track.cover} alt="" className="size-10 shrink-0" rounded="rounded-lg" overlay={false} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] text-white">{track.title}</span>
                  <span className="block truncate text-[11px] text-mist">
                    {track.artist} · {track.album}
                  </span>
                </span>
                <span
                  className={cn(
                    'grid size-6 shrink-0 place-items-center rounded-full border text-[10px]',
                    isSelected
                      ? 'border-[var(--accent)] bg-[var(--accent)] text-black'
                      : 'border-white/20 text-transparent',
                  )}
                  aria-hidden
                >
                  ✓
                </span>
              </button>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
