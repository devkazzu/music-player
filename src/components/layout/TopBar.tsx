import { Link, useLocation } from 'react-router-dom';
import { Download, Search, Settings2 } from 'lucide-react';
import { Cover } from '@/components/ui/Cover';
import { SakuraLogo } from '@/components/atmosphere/SakuraLogo';
import { useLibrary } from '@/state/LibraryProvider';
import { asset } from '@/lib/assets';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { useUI } from '@/state/UIContext';

export function TopBar() {
  const { profile } = useLibrary();
  const { canInstall, promptInstall } = useInstallPrompt();
  const { toast } = useUI();
  const location = useLocation();

  const handleInstall = async () => {
    const installed = await promptInstall();
    if (installed) toast({ title: 'Installing HIRO SEGAWA', description: 'The app will open in its own window.', tone: 'success' });
  };

  return (
    <header className="chrome-top sticky top-0 z-30 border-b backdrop-blur-2xl">
      <div className="mx-auto flex h-14 max-w-[1500px] items-center gap-3 px-4 sm:h-16 sm:px-6 lg:px-8">
        <Link to="/" className="lg:hidden" aria-label="HIRO SEGAWA home">
          <SakuraLogo compact />
        </Link>

        <Link
          to="/search"
          className="group ml-auto hidden h-9 w-full max-w-md items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] px-4 text-[13px] text-white/45 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white/75 md:flex"
        >
          <Search className="size-4" aria-hidden />
          <span className="flex-1">Search songs, artists, albums, playlists…</span>
          <kbd className="rounded border border-white/15 bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-white/50">
            /
          </kbd>
        </Link>

        <div className="ml-auto flex items-center gap-1.5 md:ml-0">
          <Link
            to="/search"
            aria-label="Search"
            className="icon-btn size-9 md:hidden"
            data-active={location.pathname === '/search'}
          >
            <Search className="size-[18px]" aria-hidden />
          </Link>

          {canInstall ? (
            <button
              type="button"
              onClick={() => void handleInstall()}
              className="btn btn-glass hidden !px-3 !py-1.5 text-[11.5px] sm:inline-flex"
            >
              <Download className="size-3.5" aria-hidden />
              Install app
            </button>
          ) : null}

          <Link to="/settings" aria-label="Settings" className="icon-btn hidden size-9 sm:inline-flex">
            <Settings2 className="size-[18px]" aria-hidden />
          </Link>

          <Link
            to="/profile"
            className="group flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] py-1 pl-1 pr-1 transition hover:border-white/20 sm:pr-3"
            aria-label="Open profile"
          >
            <Cover
              src={asset(profile.avatar)}
              alt=""
              className="size-7"
              rounded="rounded-full"
              overlay={false}
            />
            <span className="hidden max-w-28 truncate text-[12px] text-white/80 sm:block">
              {profile.name}
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
