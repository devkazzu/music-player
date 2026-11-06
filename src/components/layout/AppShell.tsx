import { useCallback, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { Keyboard, X } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { MobileNav } from './MobileNav';
import { PlayerBar } from '@/components/player/PlayerBar';
import { QueuePanel } from '@/components/player/QueuePanel';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useSettings } from '@/state/SettingsProvider';
import { useUI } from '@/state/UIContext';

export function AppShell() {
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const { settings, update } = useSettings();
  const { notify } = useUI();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isNowPlaying = location.pathname === '/now-playing';

  const toggleQueue = useCallback(() => {
    const isDesktop = window.matchMedia('(min-width: 1280px)').matches;
    if (isDesktop) {
      update({ showQueue: !settings.showQueue });
    } else {
      setDrawerOpen((open) => !open);
    }
  }, [settings.showQueue, update]);

  useKeyboardShortcuts({ onToggleQueue: toggleQueue });

  useEffect(() => {
    const handleOfflineReady = () => {
      notify('Ready to listen offline', 'HIRO SEGAWA is cached on this device.');
    };
    window.addEventListener('hiro:offline-ready', handleOfflineReady);
    return () => window.removeEventListener('hiro:offline-ready', handleOfflineReady);
  }, [notify]);

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: 'auto' });
    setDrawerOpen(false);
  }, [location.pathname, location.search]);

  if (isNowPlaying) {
    return (
      <div className="relative h-dvh overflow-hidden">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="relative flex h-dvh overflow-hidden">

      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:text-black"
      >
        Skip to content
      </a>

      <Sidebar className="relative z-10 hidden lg:flex" />

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main ref={mainRef} id="main" className="min-h-0 flex-1 overflow-y-auto scroll-thin">
          <div
            key={`${location.pathname}${location.search}`}
            className="page mx-auto w-full max-w-[1500px] px-4 pb-[calc(10.5rem+env(safe-area-inset-bottom,0px))] pt-5 sm:px-6 lg:px-8 md:pb-32"
          >
            <Outlet />
          </div>
          <footer className="mx-auto w-full max-w-[1500px] px-4 pb-4 text-[11px] text-white/30 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-5">
              <p>
                HIRO SEGAWA · original demo score composed procedurally for this app. Artwork generated for
                this project.
              </p>
              <Link
                to="/settings"
                className="inline-flex items-center gap-1.5 text-white/40 transition hover:text-white/70"
              >
                <Keyboard className="size-3.5" aria-hidden />
                Keyboard shortcuts
              </Link>
            </div>
          </footer>
        </main>
      </div>

      {settings.showQueue ? (
        <aside className="chrome-panel relative z-10 hidden w-[330px] shrink-0 border-l backdrop-blur-2xl xl:flex xl:flex-col">
          <QueuePanel onClose={() => update({ showQueue: false })} />
        </aside>
      ) : null}

      <PlayerBar onToggleQueue={toggleQueue} queueOpen={settings.showQueue || drawerOpen} />
      <MobileNav />

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 xl:hidden">
          <button
            type="button"
            aria-label="Close queue"
            className="absolute inset-0 animate-[fade_0.25s_ease_both] bg-black/65 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="glass absolute inset-x-0 bottom-0 max-h-[80dvh] animate-[rise_0.35s_cubic-bezier(0.16,1,0.3,1)_both] overflow-hidden rounded-t-3xl pb-[env(safe-area-inset-bottom,0px)]">
            <div className="flex items-center justify-between border-b border-white/8 px-4 py-2">
              <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">Queue</span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="icon-btn size-8"
                aria-label="Close queue"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
            <div className="max-h-[72dvh] overflow-hidden">
              <QueuePanel compact onClose={() => setDrawerOpen(false)} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
