import { useNavigate } from 'react-router-dom';
import {
  ArrowDown,
  ArrowUp,
  Disc3,
  HardDrive,
  Heart,
  ListEnd,
  ListMusic,
  ListPlus,
  MoreHorizontal,
  Play,
  Trash2,
  User,
  type LucideIcon,
} from 'lucide-react';
import type { Track } from '@/types';
import { Cover } from '@/components/ui/Cover';
import { Menu, type MenuItem } from '@/components/ui/Menu';
import { useLibrary } from '@/state/LibraryProvider';
import { usePlayer } from '@/state/PlayerProvider';
import { usePlaylistPicker } from '@/state/PlaylistPickerProvider';
import { useUI } from '@/state/UIContext';
import { cn, formatTime } from '@/lib/utils';

export interface TrackRowExtraAction {
  id: string;
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  danger?: boolean;
  separatorBefore?: boolean;
}

interface TrackRowProps {
  track: Track;
  index: number;
  queue: Track[];
  label: string;
  showAlbum?: boolean;
  showCover?: boolean;
  extraActions?: TrackRowExtraAction[];
  className?: string;
}

export function TrackRow({
  track,
  index,
  queue,
  label,
  showAlbum = true,
  showCover = true,
  extraActions = [],
  className,
}: TrackRowProps) {
  const player = usePlayer();
  const navigate = useNavigate();
  const { isFavourite, toggleFavourite } = useLibrary();
  const { openPlaylistPicker } = usePlaylistPicker();
  const { toast } = useUI();

  const isCurrent = player.currentTrack?.id === track.id;
  const isPlaying = isCurrent && player.isPlaying;
  const liked = isFavourite(track.id);

  const play = () => {
    if (isCurrent) {
      player.toggle();
      return;
    }
    player.playTrack(track, { queue, label });
  };

  const menuItems: MenuItem[] = [
    {
      id: 'play',
      label: isPlaying ? 'Pause' : 'Play now',
      icon: Play,
      onSelect: play,
    },
    {
      id: 'play-next',
      label: 'Play next',
      icon: ListPlus,
      onSelect: () => player.addNext(track),
    },
    {
      id: 'queue',
      label: 'Add to queue',
      icon: ListEnd,
      onSelect: () => player.addToQueue(track),
    },
    {
      id: 'playlist',
      label: 'Add to playlist',
      icon: ListMusic,
      onSelect: () => openPlaylistPicker([track.id]),
    },
    {
      id: 'favourite',
      label: liked ? 'Remove from favourites' : 'Add to favourites',
      icon: Heart,
      onSelect: () => {
        toggleFavourite(track.id);
        toast({
          title: liked ? 'Removed from favourites' : 'Added to favourites',
          description: track.title,
          tone: liked ? 'default' : 'success',
        });
      },
    },
    {
      id: 'album',
      label: 'View album',
      icon: Disc3,
      separatorBefore: true,
      onSelect: () => navigate(`/album/${track.albumId}`),
    },
    {
      id: 'artist',
      label: 'View artist',
      icon: User,
      onSelect: () => navigate(`/artist/${track.artistId}`),
    },
    ...(extraActions.length > 0
      ? extraActions.map((action) => ({
          id: action.id,
          label: action.label,
          icon: action.icon,
          onSelect: action.onSelect,
          danger: action.danger,
          separatorBefore: action.separatorBefore ?? false,
        }))
      : []),
  ];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={play}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          play();
        }
      }}
      data-active={isCurrent}
      aria-current={isCurrent ? 'true' : undefined}
      aria-label={`${isPlaying ? 'Pause' : 'Play'} ${track.title} by ${track.artist}`}
      className={cn(
        'track-row group flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-2 outline-none sm:gap-3 sm:px-3',
        className,
      )}
    >
      <div className="flex w-5 shrink-0 items-center justify-center">
        {isPlaying ? (
          <span className="eq-bars" aria-hidden>
            <span />
            <span />
            <span />
            <span />
          </span>
        ) : (
          <span
            className={cn(
              'text-[11px] tabular-nums text-white/35 transition group-hover:text-white/80',
              isCurrent && 'text-[var(--accent)]',
            )}
          >
            {String(index + 1).padStart(2, '0')}
          </span>
        )}
      </div>

      {showCover ? (
        <Cover
          src={track.cover}
          alt=""
          className="size-10 shrink-0 sm:size-11"
          rounded="rounded-lg"
          overlay={false}
        />
      ) : null}

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'flex items-center gap-1.5 truncate text-[13.5px] font-medium text-white/92 sm:text-sm',
            isCurrent && 'text-[var(--accent)]',
          )}
        >
          <span className="truncate">{track.title}</span>
          {track.source === 'local' ? (
            <HardDrive
              className="size-3 shrink-0 text-white/40"
              aria-label="Imported from your device"
            />
          ) : null}
        </p>
        <p className="truncate text-[11.5px] text-mist sm:text-xs">
          {track.artist}
          <span className="md:hidden">
            {showAlbum ? ` · ${track.album}` : ''}
          </span>
        </p>
      </div>

      {showAlbum ? (
        <p className="hidden w-[26%] min-w-0 shrink truncate text-xs text-mist md:block">{track.album}</p>
      ) : null}

      <button
        type="button"
        aria-label={liked ? 'Remove from favourites' : 'Add to favourites'}
        aria-pressed={liked}
        onClick={(event) => {
          event.stopPropagation();
          toggleFavourite(track.id);
        }}
        className={cn(
          'icon-btn size-8 shrink-0 text-white/45 opacity-100 transition focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100',
          liked && 'text-rose-400 !opacity-100',
        )}
      >
        <Heart className={cn('size-4', liked && 'fill-current')} aria-hidden />
      </button>

      <span className="w-9 shrink-0 text-right text-[11px] tabular-nums text-white/50 sm:w-11 sm:text-xs">
        {formatTime(track.duration)}
      </span>

      <Menu
        label={`Actions for ${track.title}`}
        items={menuItems}
        trigger={(menuProps) => (
          <button
            {...menuProps}
            type="button"
            data-menu-trigger
            aria-label={`More options for ${track.title}`}
            className="icon-btn size-8 shrink-0 text-white/55"
          >
            <MoreHorizontal className="size-4" aria-hidden />
          </button>
        )}
      />
    </div>
  );
}

export const TRACK_EXTRA_ICONS = {
  remove: Trash2,
  up: ArrowUp,
  down: ArrowDown,
};
