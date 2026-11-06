import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Clapperboard,
  Coffee,
  Compass,
  Heart,
  History,
  Home,
  ListMusic,
  Plus,
  Search,
  Settings,
  UserRound,
  LibraryBig,
} from 'lucide-react';
import { PlaylistDialog } from '@/components/ui/PlaylistDialog';
import { SakuraLogo } from '@/components/atmosphere/SakuraLogo';
import { useLibrary } from '@/state/LibraryProvider';
import { cn } from '@/lib/utils';

const PRIMARY_NAV = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/explore', label: 'Explore Music', icon: Compass },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/soundtracks', label: 'Anime Soundtracks', icon: Clapperboard },
  { to: '/lofi', label: 'Lofi Collection', icon: Coffee },
] as const;

const LIBRARY_NAV = [
  { to: '/playlists', label: 'Playlists', icon: ListMusic },
  { to: '/favourites', label: 'Favourite Tracks', icon: Heart },
  { to: '/recent', label: 'Recently Played', icon: History },
  { to: '/library', label: 'Local Music', icon: LibraryBig },
] as const;

const ACCOUNT_NAV = [
  { to: '/profile', label: 'Profile', icon: UserRound },
  { to: '/settings', label: 'Settings', icon: Settings },
] as const;

export function Sidebar({ className }: { className?: string }) {
  const { playlists, createPlaylist, localTracks } = useLibrary();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);

  const quickPlaylists = playlists.slice(0, 6);

  return (
    <aside
      className={cn(
        'chrome-side flex h-full w-[264px] shrink-0 flex-col border-r backdrop-blur-2xl',
        className,
      )}
    >
      <Link to="/" className="block px-5 pb-5 pt-6" aria-label="HIRO SEGAWA — home">
        <SakuraLogo />
      </Link>

      <nav aria-label="Primary" className="min-h-0 flex-1 overflow-y-auto scroll-thin px-3 pb-4">
        <p className="eyebrow px-3 pb-2 pt-1">Discover</p>
        <ul className="space-y-0.5">
          {PRIMARY_NAV.map((item) => (
            <li key={item.to}>
              <SidebarLink {...item} />
            </li>
          ))}
        </ul>

        <p className="eyebrow px-3 pb-2 pt-5">Your library</p>
        <ul className="space-y-0.5">
          {LIBRARY_NAV.map((item) => (
            <li key={item.to}>
              <SidebarLink {...item} />
            </li>
          ))}
        </ul>

        <div className="mt-5 flex items-center justify-between px-3 pb-2">
          <p className="eyebrow">Playlists</p>
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="icon-btn size-6"
            aria-label="Create playlist"
            title="Create playlist"
          >
            <Plus className="size-3.5" aria-hidden />
          </button>
        </div>
        <ul className="space-y-0.5">
          {quickPlaylists.length === 0 ? (
            <li className="px-3 py-2 text-[11px] leading-relaxed text-white/35">
              No playlists yet — create your first one.
            </li>
          ) : (
            quickPlaylists.map((playlist) => (
              <li key={playlist.id}>
                <NavLink
                  to={`/playlists/${playlist.id}`}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2.5 rounded-lg px-3 py-2 text-[12.5px] text-white/65 transition hover:bg-white/[0.06] hover:text-white',
                      isActive && 'bg-white/[0.08] text-white',
                    )
                  }
                >
                  <span className="size-1 shrink-0 rounded-full bg-white/25" aria-hidden />
                  <span className="truncate">{playlist.name}</span>
                </NavLink>
              </li>
            ))
          )}
        </ul>

        <p className="eyebrow px-3 pb-2 pt-5">Account</p>
        <ul className="space-y-0.5">
          {ACCOUNT_NAV.map((item) => (
            <li key={item.to}>
              <SidebarLink {...item} />
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-white/8 p-3">
        <button
          type="button"
          onClick={() => navigate('/library')}
          className="group flex w-full items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-3 text-left transition hover:border-[rgba(var(--accent-rgb),0.35)] hover:bg-white/[0.06]"
        >
          <span
            className="grid size-9 shrink-0 place-items-center rounded-lg border border-white/10"
            style={{ background: 'linear-gradient(140deg, var(--accent-soft), rgba(139,92,246,0.18))' }}
          >
            <LibraryBig className="size-4 text-[var(--accent)]" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-[12px] font-medium text-white">Local library</span>
            <span className="block text-[10.5px] text-white/45">
              {localTracks.length === 0
                ? 'Import your own audio'
                : `${localTracks.length} offline ${localTracks.length === 1 ? 'track' : 'tracks'}`}
            </span>
          </span>
        </button>
      </div>

      <PlaylistDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={async ({ name, description }) => {
          const playlist = await createPlaylist({ name, description });
          if (playlist) {
            navigate(`/playlists/${playlist.id}`);
          }
        }}
      />
    </aside>
  );
}

function SidebarLink({
  to,
  label,
  icon: Icon,
  end,
}: {
  to: string;
  label: string;
  icon: typeof Home;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition',
          isActive
            ? 'bg-[rgba(var(--accent-rgb),0.1)] text-white'
            : 'text-white/62 hover:bg-white/[0.05] hover:text-white',
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(
              'absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-[var(--accent)] transition-opacity',
              isActive ? 'opacity-100' : 'opacity-0',
            )}
            aria-hidden
          />
          <Icon
            className={cn('size-[17px] shrink-0', isActive ? 'text-[var(--accent)]' : 'text-white/45')}
            aria-hidden
          />
          <span className="truncate">{label}</span>
        </>
      )}
    </NavLink>
  );
}
