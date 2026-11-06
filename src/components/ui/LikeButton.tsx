import { Heart } from 'lucide-react';
import type { Track } from '@/types';
import { cn } from '@/lib/utils';
import { useLibrary } from '@/state/LibraryProvider';
import { useUI } from '@/state/UIContext';

interface LikeButtonProps {
  track: Track;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  withLabel?: boolean;
}

const ICON_SIZE = {
  sm: 'size-3.5',
  md: 'size-4',
  lg: 'size-5',
} as const;

const BUTTON_SIZE = {
  sm: 'size-7',
  md: 'size-9',
  lg: 'size-11',
} as const;

export function LikeButton({ track, className, size = 'md', withLabel = false }: LikeButtonProps) {
  const { isFavourite, toggleFavourite } = useLibrary();
  const { toast } = useUI();
  const liked = isFavourite(track.id);

  const handleClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    toggleFavourite(track.id);
    toast({
      title: liked ? 'Removed from favourites' : 'Added to favourites',
      description: `${track.title} · ${track.artist}`,
      tone: liked ? 'default' : 'success',
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={liked}
      aria-label={liked ? `Remove ${track.title} from favourites` : `Add ${track.title} to favourites`}
      className={cn(
        'icon-btn shrink-0',
        BUTTON_SIZE[size],
        liked && 'text-rose-400 hover:text-rose-300',
        withLabel && 'gap-2 rounded-full border border-white/10 px-3 text-xs font-medium',
        className,
      )}
      title={liked ? 'Remove from favourites' : 'Add to favourites'}
    >
      <Heart className={cn(ICON_SIZE[size], liked && 'fill-current')} aria-hidden />
      {withLabel ? <span>{liked ? 'Favourited' : 'Favourite'}</span> : null}
    </button>
  );
}
