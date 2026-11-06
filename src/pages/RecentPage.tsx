import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock3, History, Play, Shuffle, Trash2, X } from 'lucide-react';
import { ART } from '@/data/catalog';
import { Cover } from '@/components/ui/Cover';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { PlayButton } from '@/components/ui/PlayButton';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useLibrary } from '@/state/LibraryProvider';
import { usePlayer } from '@/state/PlayerProvider';
import { usePageTitle } from '@/hooks/usePageTitle';
import { formatDuration, formatRelativeTime, pluralize, shuffleArray } from '@/lib/utils';

export function RecentPage() {
  usePageTitle('Recently played');
  const { recent, recentTracks, removeRecent, clearRecent } = useLibrary();
  const { playQueue } = usePlayer();
  const [clearOpen, setClearOpen] = useState(false);

  const entries = useMemo(
    () =>
      recent
        .map((entry) => ({ entry, track: recentTracks.find((track) => track.id === entry.trackId) }))
        .filter((item): item is { entry: typeof item.entry; track: NonNullable<typeof item.track> } =>
          Boolean(item.track),
        ),
    [recent, recentTracks],
  );

  const total = recentTracks.reduce((sum, track) => sum + track.duration, 0);

  return (
    <div>
      <PageHeader
        eyebrow="Your listening trail"
        title="Recently played"
        description="A rolling history of everything you have listened to on this device — newest first."
        image={ART.rail ?? undefined}
        compact
        actions={
          recentTracks.length > 0 ? (
            <>
              <PlayButton
                tracks={recentTracks}
                label="Recently played"
                showText="Play history"
                variant="solid"
                size="sm"
              />
              <button
                type="button"
                onClick={() => playQueue(shuffleArray(recentTracks), 0, 'History · Shuffle')}
                className="btn btn-glass"
              >
                <Shuffle className="size-4" aria-hidden />
                Shuffle
              </button>
              <button type="button" onClick={() => setClearOpen(true)} className="btn btn-ghost">
                <Trash2 className="size-4" aria-hidden />
                Clear history
              </button>
            </>
          ) : null
        }
      >
        {recentTracks.length > 0 ? (
          <p className="text-[11.5px] text-white/45">
            {pluralize(recentTracks.length, 'track')} · {formatDuration(total)} listened
          </p>
        ) : null}
      </PageHeader>

      {entries.length === 0 ? (
        <EmptyState
          icon={History}
          title="No listening history yet"
          description="Play something and it will appear here. Your history never leaves this device."
          action={
            <Link to="/" className="btn btn-primary">
              <Play className="size-4" aria-hidden />
              Go to Home
            </Link>
          }
        />
      ) : (
        <>
          <SectionHeader
            title="Recent activity"
            description={`${pluralize(entries.length, 'entry', 'entries')} recorded on this device`}
          />
          <div className="glass rounded-2xl p-2 sm:p-3">
            <ul className="divide-y divide-white/5">
              {entries.map(({ entry, track }, index) => (
                <li key={track.id} className="group flex items-center gap-3 py-2 pl-2 pr-1 sm:pl-3">
                  <span className="w-5 shrink-0 text-center text-[11px] tabular-nums text-white/30">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <button
                    type="button"
                    onClick={() => playQueue(recentTracks, index, 'Recently played')}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <Cover src={track.cover} alt="" className="size-11 shrink-0" rounded="rounded-lg" overlay={false} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-medium text-white">{track.title}</span>
                      <span className="block truncate text-[11.5px] text-mist">
                        {track.artist} · {track.album}
                      </span>
                    </span>
                    <span className="hidden items-center gap-1 text-[10.5px] text-white/35 sm:flex">
                      <Clock3 className="size-3" aria-hidden />
                      {formatRelativeTime(entry.playedAt)}
                    </span>
                    <span className="hidden w-16 text-right text-[10px] text-white/30 sm:block">
                      {entry.playCount}× played
                    </span>
                    <span className="grid size-8 shrink-0 place-items-center rounded-full border border-white/12 bg-white/[0.05] text-white/70 transition group-hover:text-[var(--accent)]">
                      <Play className="size-3 fill-current" aria-hidden />
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void removeRecent(track.id)}
                    className="icon-btn size-8 opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100 hover:text-rose-300"
                    aria-label={`Remove ${track.title} from history`}
                  >
                    <X className="size-3.5" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      <ConfirmDialog
        open={clearOpen}
        title="Clear listening history?"
        description="This deletes your recent plays. Favourites and playlists are not affected."
        confirmLabel="Clear history"
        onClose={() => setClearOpen(false)}
        onConfirm={async () => {
          await clearRecent();
          setClearOpen(false);
        }}
      />
    </div>
  );
}
