import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlayer } from '@/state/PlayerProvider';
import { useLibrary } from '@/state/LibraryProvider';
import { useUI } from '@/state/UIContext';
import { useSettings } from '@/state/SettingsProvider';

const INTERACTIVE_SELECTOR =
  'input, textarea, select, button, a, [role="button"], [role="menuitem"], [contenteditable="true"]';

function isInteractive(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest(INTERACTIVE_SELECTOR));
}

/**
 * Global player shortcuts — ignored while typing or while an interactive
 * element has focus, so they never fight native controls.
 */
export function useKeyboardShortcuts(options: { onToggleQueue: () => void }) {
  const player = usePlayer();
  const { isFavourite, toggleFavourite } = useLibrary();
  const { toast } = useUI();
  const { settings, update } = useSettings();
  const navigate = useNavigate();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
          event.preventDefault();
          navigate('/search');
        }
        return;
      }
      if (isInteractive(event.target)) return;

      switch (event.key.toLowerCase()) {
        case ' ':
          event.preventDefault();
          player.toggle();
          break;
        case 'arrowright':
          event.preventDefault();
          player.seekBy(5);
          break;
        case 'arrowleft':
          event.preventDefault();
          player.seekBy(-5);
          break;
        case 'arrowup':
          event.preventDefault();
          player.setVolume(Math.min(1, settings.volume + 0.05));
          break;
        case 'arrowdown':
          event.preventDefault();
          player.setVolume(Math.max(0, settings.volume - 0.05));
          break;
        case 'm':
          player.toggleMute();
          break;
        case 's':
          player.toggleShuffle();
          break;
        case 'r':
          player.cycleRepeat();
          break;
        case 'n':
          player.next();
          break;
        case 'p':
          player.previous();
          break;
        case 'q':
          options.onToggleQueue();
          break;
        case 't':
          update({ motion: settings.motion === 'reduced' ? 'system' : 'reduced' });
          toast({ title: 'Motion preference updated', tone: 'info' });
          break;
        case '/':
          event.preventDefault();
          navigate('/search');
          break;
        case 'escape':
          if (window.location.pathname === '/now-playing') navigate(-1);
          break;
        case 'f': {
          if (!player.currentTrack) break;
          const liked = isFavourite(player.currentTrack.id);
          toggleFavourite(player.currentTrack.id);
          toast({
            title: liked ? 'Removed from favourites' : 'Added to favourites',
            description: player.currentTrack.title,
            tone: liked ? 'default' : 'success',
          });
          break;
        }
        default:
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isFavourite, navigate, options, player, settings.motion, settings.volume, toast, toggleFavourite, update]);
}
