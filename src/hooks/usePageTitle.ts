import { useEffect } from 'react';

/** Keeps the document title in sync with the current screen. */
export function usePageTitle(title?: string) {
  useEffect(() => {
    const previous = document.title;
    document.title = title ? `${title} · HIRO SEGAWA` : 'HIRO SEGAWA — Cinematic Anime Music';
    return () => {
      document.title = previous;
    };
  }, [title]);
}
