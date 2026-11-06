import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Check, ListMusic, Plus, Search } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Cover } from '@/components/ui/Cover';
import { useLibrary } from './LibraryProvider';
import { useUI } from './UIContext';
import { cn } from '@/lib/utils';

interface PlaylistPickerContextValue {
  openPlaylistPicker: (trackIds: string[]) => void;
}

const PlaylistPickerContext = createContext<PlaylistPickerContextValue | null>(null);

export function PlaylistPickerProvider({ children }: { children: ReactNode }) {
  const { playlists, addTracksToPlaylist, createPlaylist, getTrack } = useLibrary();
  const { toast, notifyError } = useUI();
  const [trackIds, setTrackIds] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const openPlaylistPicker = useCallback((ids: string[]) => {
    setTrackIds(ids);
    setQuery('');
    setCreating(false);
    setNewName('');
    setOpen(true);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  const addTo = useCallback(
    async (playlistId: string) => {
      setBusyId(playlistId);
      try {
        const added = await addTracksToPlaylist(playlistId, trackIds);
        const playlist = playlists.find((item) => item.id === playlistId);
        if (added === 0) {
          toast({
            title: 'Already in this playlist',
            description: playlist ? `“${playlist.name}” already contains these tracks.` : undefined,
            tone: 'info',
          });
        } else {
          toast({
            title: `${added} ${added === 1 ? 'track' : 'tracks'} added`,
            description: playlist ? `Added to “${playlist.name}”.` : undefined,
            tone: 'success',
          });
        }
        close();
      } catch {
        notifyError('Could not add tracks to the playlist');
      } finally {
        setBusyId(null);
      }
    },
    [addTracksToPlaylist, close, notifyError, playlists, toast, trackIds],
  );

  const createAndAdd = useCallback(async () => {
    const name = newName.trim();
    if (!name) return;
    const playlist = await createPlaylist({ name, trackIds });
    if (playlist) close();
  }, [close, createPlaylist, newName, trackIds]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return playlists;
    return playlists.filter((playlist) => playlist.name.toLowerCase().includes(normalized));
  }, [playlists, query]);

  const preview = trackIds
    .map((id) => getTrack(id))
    .filter((track): track is NonNullable<typeof track> => Boolean(track))
    .slice(0, 3);

  const value = useMemo(() => ({ openPlaylistPicker }), [openPlaylistPicker]);

  return (
    <PlaylistPickerContext.Provider value={value}>
      {children}
      <Modal
        open={open}
        onClose={close}
        title="Add to playlist"
        description={
          trackIds.length === 1
            ? 'Choose a playlist for this track, or create a new one.'
            : `Choose a playlist for these ${trackIds.length} tracks.`
        }
        size="sm"
      >
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.04] p-2">
          {preview.map((track) => (
            <Cover
              key={track.id}
              src={track.cover}
              alt={track.title}
              className="size-9 shrink-0"
              rounded="rounded-md"
            />
          ))}
          <p className="min-w-0 flex-1 truncate text-xs text-mist">
            {preview.length > 0
              ? preview.map((track) => track.title).join(' · ') +
                (trackIds.length > preview.length ? ` +${trackIds.length - preview.length} more` : '')
              : 'No tracks selected'}
          </p>
        </div>

        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-mist" aria-hidden />
          <input
            className="field pl-9"
            placeholder="Find a playlist"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search playlists"
          />
        </div>

        <div className="max-h-56 space-y-1 overflow-y-auto scroll-thin pr-0.5">
          {filtered.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-mist">
              No playlists match “{query}”.
            </p>
          ) : (
            filtered.map((playlist) => (
              <button
                key={playlist.id}
                type="button"
                onClick={() => void addTo(playlist.id)}
                disabled={busyId === playlist.id}
                className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-white/8 disabled:opacity-60"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.04]">
                  {busyId === playlist.id ? (
                    <Check className="size-4 text-[var(--accent)]" aria-hidden />
                  ) : (
                    <ListMusic className="size-4 text-white/60" aria-hidden />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-white">{playlist.name}</span>
                  <span className="block text-[11px] text-mist">
                    {playlist.trackIds.length} {playlist.trackIds.length === 1 ? 'track' : 'tracks'}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>

        <div className="mt-3 border-t border-white/8 pt-3">
          {creating ? (
            <div className="flex gap-2">
              <input
                className="field"
                placeholder="New playlist name"
                value={newName}
                maxLength={80}
                autoFocus
                onChange={(event) => setNewName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void createAndAdd();
                }}
              />
              <button
                type="button"
                className="btn btn-primary shrink-0"
                onClick={() => void createAndAdd()}
                disabled={!newName.trim()}
              >
                Create
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className={cn('btn btn-glass w-full')}
            >
              <Plus className="size-4" aria-hidden />
              New playlist
            </button>
          )}
        </div>
      </Modal>
    </PlaylistPickerContext.Provider>
  );
}

export function usePlaylistPicker(): PlaylistPickerContextValue {
  const context = useContext(PlaylistPickerContext);
  if (!context) throw new Error('usePlaylistPicker must be used inside <PlaylistPickerProvider>');
  return context;
}
