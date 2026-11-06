import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpDown,
  CheckCircle2,
  Database,
  FileAudio,
  HardDrive,
  Loader2,
  Pencil,
  Play,
  Plus,
  Shield,
  Trash2,
  TriangleAlert,
  Upload,
  X,
} from 'lucide-react';
import type { Track } from '@/types';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { PlayButton } from '@/components/ui/PlayButton';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TrackList } from '@/components/music/TrackList';
import { useLibrary } from '@/state/LibraryProvider';
import { usePlayer } from '@/state/PlayerProvider';
import { useUI } from '@/state/UIContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import { dbPersistStorage } from '@/lib/db';
import { TRACK_SORT_LABELS, sortTracks, type TrackSort } from '@/lib/sorting';
import { cn, formatBytes, formatDuration, pluralize } from '@/lib/utils';

export function LocalLibraryPage() {
  usePageTitle('Local Library');
  const { localTracks, importFiles, importing, dismissImports, deleteLocalTrack, updateLocalTrack, getStorageEstimate, initError, tracks } =
    useLibrary();
  const { toast } = useUI();
  const player = usePlayer();
  const [dragging, setDragging] = useState(false);
  const [sort, setSort] = useState<TrackSort>('recent');
  const [storage, setStorage] = useState<{ usage: number; quota: number }>({ usage: 0, quota: 0 });
  const [editing, setEditing] = useState<Track | null>(null);
  const [removing, setRemoving] = useState<Track | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const refreshStorage = async () => {
    const estimate = await getStorageEstimate();
    setStorage(estimate);
  };

  useEffect(() => {
    void refreshStorage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localTracks.length]);

  const sorted = useMemo(() => sortTracks(localTracks, sort), [localTracks, sort]);
  const totalSize = localTracks.reduce((sum, track) => sum + (track.size ?? 0), 0);
  const totalDuration = localTracks.reduce((sum, track) => sum + track.duration, 0);
  const activeImports = importing.filter((item) => item.status !== 'done');

  const handleFiles = async (files: FileList | File[] | null) => {
    if (!files) return;
    const list = Array.from(files);
    if (list.length === 0) return;
    await importFiles(list);
    await refreshStorage();
  };

  const requestPersistence = async () => {
    const granted = await dbPersistStorage();
    toast({
      title: granted ? 'Offline storage secured' : 'Storage permission unavailable',
      description: granted
        ? 'Your browser will now avoid evicting your imported music.'
        : 'You can still import audio; the browser may clear it under storage pressure.',
      tone: granted ? 'success' : 'info',
    });
  };

  return (
    <div>
      <PageHeader
        eyebrow="Local music library"
        title="Your files, on your device"
        description="Import MP3, WAV, OGG, FLAC, M4A or AAC. Files are copied into this browser's IndexedDB, tagged where possible, and playable offline — nothing is uploaded anywhere."
        actions={
          <>
            <button type="button" onClick={() => inputRef.current?.click()} className="btn btn-primary">
              <Upload className="size-4" aria-hidden />
              Import audio files
            </button>
            {localTracks.length > 0 ? (
              <PlayButton tracks={sorted} label="Local library" showText="Play library" size="sm" />
            ) : null}
          </>
        }
      >
        {initError ? (
          <p className="mt-3 flex items-center gap-1.5 rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-[11.5px] text-rose-200">
            <TriangleAlert className="size-3.5" aria-hidden />
            {initError}
          </p>
        ) : null}
      </PageHeader>

      <input
        ref={inputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.ogg,.oga,.opus,.m4a,.aac,.flac,.webm"
        multiple
        className="hidden"
        onChange={(event) => {
          void handleFiles(event.target.files);
          event.target.value = '';
        }}
      />

      {/* -------------------------------------------------------------- dropzone */}
      <section
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void handleFiles(event.dataTransfer.files);
        }}
        className={cn(
          'relative mb-6 overflow-hidden rounded-3xl border border-dashed p-6 text-center transition',
          dragging
            ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
            : 'border-white/15 bg-white/[0.03] hover:border-white/25',
        )}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-24 opacity-30 blur-3xl"
          style={{ background: 'radial-gradient(circle at 50% 0%, var(--accent), transparent 70%)' }}
          aria-hidden
        />
        <div className="relative flex flex-col items-center">
          <span className="grid size-12 place-items-center rounded-2xl border border-white/12 bg-white/[0.05]">
            <Upload className={cn('size-5', dragging ? 'text-[var(--accent)]' : 'text-white/60')} aria-hidden />
          </span>
          <p className="mt-3 text-[14px] font-medium text-white">
            {dragging ? 'Drop to import' : 'Drag audio files here, or browse'}
          </p>
          <p className="mt-1 max-w-md text-[11.5px] leading-relaxed text-white/45">
            Metadata and embedded artwork are read automatically. Unsupported files are skipped with a clear
            message — nothing is silently lost.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={() => inputRef.current?.click()} className="btn btn-glass">
              <FileAudio className="size-4" aria-hidden />
              Choose files
            </button>
            <button type="button" onClick={() => void requestPersistence()} className="btn btn-ghost">
              <Shield className="size-4" aria-hidden />
              Protect offline storage
            </button>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- import status */}
      {importing.length > 0 ? (
        <section className="glass mb-6 rounded-2xl p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[12.5px] font-medium text-white">
              Importing {importing.length} {importing.length === 1 ? 'file' : 'files'}
              {activeImports.length === 0 ? ' — finished' : '…'}
            </p>
            <button type="button" onClick={dismissImports} className="icon-btn size-7" aria-label="Dismiss import status">
              <X className="size-3.5" aria-hidden />
            </button>
          </div>
          <ul className="space-y-1.5">
            {importing.map((item) => (
              <li key={item.fileName} className="flex items-center gap-2.5 text-[11.5px]">
                {item.status === 'done' ? (
                  <CheckCircle2 className="size-3.5 shrink-0 text-emerald-300" aria-hidden />
                ) : item.status === 'error' ? (
                  <TriangleAlert className="size-3.5 shrink-0 text-rose-300" aria-hidden />
                ) : (
                  <Loader2 className="size-3.5 shrink-0 animate-spin text-[var(--accent)]" aria-hidden />
                )}
                <span className="min-w-0 flex-1 truncate text-white/70">{item.fileName}</span>
                <span
                  className={cn(
                    'shrink-0 text-[10.5px]',
                    item.status === 'error' ? 'text-rose-300' : 'text-white/35',
                  )}
                >
                  {item.status === 'error' ? item.message ?? 'Failed' : item.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* -------------------------------------------------------------- storage */}
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="glass-soft rounded-2xl p-4">
          <p className="eyebrow flex items-center gap-1.5">
            <HardDrive className="size-3" aria-hidden />
            Imported
          </p>
          <p className="mt-1.5 font-display text-2xl text-white">{localTracks.length}</p>
          <p className="text-[11px] text-white/40">
            {pluralize(localTracks.length, 'track')} · {formatDuration(totalDuration)} · {formatBytes(totalSize)}
          </p>
        </div>
        <div className="glass-soft rounded-2xl p-4">
          <p className="eyebrow flex items-center gap-1.5">
            <Database className="size-3" aria-hidden />
            Browser storage
          </p>
          <p className="mt-1.5 font-display text-2xl text-white">{formatBytes(storage.usage)}</p>
          <p className="text-[11px] text-white/40">
            {storage.quota > 0 ? `of ~${formatBytes(storage.quota)} available` : 'estimate unavailable'}
          </p>
        </div>
        <div className="glass-soft rounded-2xl p-4">
          <p className="eyebrow flex items-center gap-1.5">
            <Play className="size-3" aria-hidden />
            Whole library
          </p>
          <p className="mt-1.5 font-display text-2xl text-white">{tracks.length}</p>
          <p className="text-[11px] text-white/40">demo score + imported audio</p>
        </div>
      </div>

      {/* ---------------------------------------------------------------- tracks */}
      <SectionHeader
        title="Imported tracks"
        description="Edit tags or remove files. Player controls and playlists update instantly."
        right={
          <div className="flex items-center gap-2">
            <ArrowUpDown className="size-3.5 text-white/40" aria-hidden />
            <label className="sr-only" htmlFor="library-sort">
              Sort imported tracks
            </label>
            <select
              id="library-sort"
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
          </div>
        }
      />

      {localTracks.length === 0 ? (
        <EmptyState
          icon={HardDrive}
          title="No local music yet"
          description="Your library is empty. Import a few files — they will appear in Search, Explore and can be added to any playlist."
          action={
            <>
              <button type="button" onClick={() => inputRef.current?.click()} className="btn btn-primary">
                <Plus className="size-4" aria-hidden />
                Import your first track
              </button>
              <Link to="/explore" className="btn btn-glass">
                Browse the demo score
              </Link>
            </>
          }
        />
      ) : (
        <div className="glass rounded-2xl p-2 sm:p-3">
          <TrackList
            tracks={sorted}
            label="Local library"
            rowExtras={(track) => [
              {
                id: 'edit',
                label: 'Edit track details',
                icon: Pencil,
                separatorBefore: true,
                onSelect: () => setEditing(track),
              },
              {
                id: 'delete',
                label: 'Delete from this device',
                icon: Trash2,
                danger: true,
                onSelect: () => setRemoving(track),
              },
            ]}
          />
        </div>
      )}

      <p className="mt-6 flex items-start gap-2 rounded-2xl border border-white/8 bg-white/[0.03] p-3.5 text-[11px] leading-relaxed text-white/40">
        <Shield className="mt-0.5 size-3.5 shrink-0 text-[var(--accent)]" aria-hidden />
        Privacy: imported audio is stored only in this browser profile using IndexedDB. Nothing is
        uploaded, and clearing site data will remove your imported files.
      </p>

      <EditTrackModal
        track={editing}
        onClose={() => setEditing(null)}
        onSave={async (values) => {
          if (!editing) return;
          await updateLocalTrack(editing.id, values);
          setEditing(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(removing)}
        title="Delete this file?"
        description={
          removing
            ? `“${removing.title}” will be permanently removed from this device, along with its playlist entries and favourite.`
            : ''
        }
        confirmLabel="Delete file"
        onClose={() => setRemoving(null)}
        onConfirm={async () => {
          if (!removing) return;
          if (player.currentTrack?.id === removing.id) player.stop();
          await deleteLocalTrack(removing.id);
          setRemoving(null);
          await refreshStorage();
        }}
      />
    </div>
  );
}

interface EditTrackModalProps {
  track: Track | null;
  onClose: () => void;
  onSave: (values: { title: string; artist: string; album: string; year?: number }) => Promise<void>;
}

function EditTrackModal({ track, onClose, onSave }: EditTrackModalProps) {
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');
  const [year, setYear] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!track) return;
    setTitle(track.title);
    setArtist(track.artist);
    setAlbum(track.album);
    setYear(String(track.year));
  }, [track]);

  const valid = title.trim().length > 0;

  return (
    <Modal
      open={Boolean(track)}
      onClose={onClose}
      title="Edit track details"
      description="These tags are stored with the file in your local library."
      size="sm"
      footer={
        <>
          <button type="button" className="btn btn-glass" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!valid || busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onSave({
                  title: title.trim(),
                  artist: artist.trim(),
                  album: album.trim(),
                  year: Number.parseInt(year, 10) || undefined,
                });
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            Save details
          </button>
        </>
      }
    >
      <div className="space-y-3.5 pb-1">
        <label className="block">
          <span className="eyebrow mb-2 block">Title</span>
          <input className="field" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} />
        </label>
        <label className="block">
          <span className="eyebrow mb-2 block">Artist</span>
          <input className="field" value={artist} onChange={(event) => setArtist(event.target.value)} maxLength={120} />
        </label>
        <label className="block">
          <span className="eyebrow mb-2 block">Album</span>
          <input className="field" value={album} onChange={(event) => setAlbum(event.target.value)} maxLength={120} />
        </label>
        <label className="block">
          <span className="eyebrow mb-2 block">Year</span>
          <input
            className="field"
            inputMode="numeric"
            value={year}
            onChange={(event) => setYear(event.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
          />
        </label>
      </div>
    </Modal>
  );
}
