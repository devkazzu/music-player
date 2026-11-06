import { NavLink } from 'react-router-dom';
import { Compass, Heart, Home, LibraryBig, Search, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const ITEMS: Array<{ to: string; label: string; icon: LucideIcon; end?: boolean }> = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/explore', label: 'Explore', icon: Compass },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/favourites', label: 'Saved', icon: Heart },
  { to: '/library', label: 'Library', icon: LibraryBig },
] as const;

export function MobileNav() {
  return (
    <nav
      aria-label="Mobile navigation"
      className="chrome-nav fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-2xl md:hidden"
    >
      <ul className="flex items-stretch justify-around px-1">
        {ITEMS.map((item) => (
          <li key={item.to} className="flex-1">
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex h-16 flex-col items-center justify-center gap-1 text-[9.5px] uppercase tracking-[0.1em] transition',
                  isActive ? 'text-[var(--accent)]' : 'text-white/45 active:text-white/80',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className="relative">
                    <item.icon className="size-[19px]" aria-hidden />
                    {isActive ? (
                      <span
                        className="absolute -inset-2 -z-10 rounded-full opacity-60 blur-md"
                        style={{ background: 'var(--accent-soft)' }}
                        aria-hidden
                      />
                    ) : null}
                  </span>
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
