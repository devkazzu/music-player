import { useEffect, useState, type ReactNode } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ROUTER_BASENAME } from '@/lib/assets';
import { AppShell } from '@/components/layout/AppShell';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { SplashScreen } from '@/pages/SplashScreen';
import { HomePage } from '@/pages/HomePage';
import { ExplorePage } from '@/pages/ExplorePage';
import { SearchPage } from '@/pages/SearchPage';
import { SoundtracksPage } from '@/pages/SoundtracksPage';
import { LofiPage } from '@/pages/LofiPage';
import { PlaylistsPage } from '@/pages/PlaylistsPage';
import { PlaylistDetailPage } from '@/pages/PlaylistDetailPage';
import { FavouritesPage } from '@/pages/FavouritesPage';
import { RecentPage } from '@/pages/RecentPage';
import { AlbumDetailPage } from '@/pages/AlbumDetailPage';
import { ArtistDetailPage } from '@/pages/ArtistDetailPage';
import { NowPlayingPage } from '@/pages/NowPlayingPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { SettingsPage } from '@/pages/SettingsPage';
import { LocalLibraryPage } from '@/pages/LocalLibraryPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { SettingsProvider } from '@/state/SettingsProvider';
import { UIProvider } from '@/state/UIContext';
import { LibraryProvider } from '@/state/LibraryProvider';
import { PlayerProvider } from '@/state/PlayerProvider';
import { PlaylistPickerProvider } from '@/state/PlaylistPickerProvider';
import { FocusTimerProvider } from '@/state/FocusTimerProvider';
import { hasEntered, markEntered } from '@/lib/storage';
import { CinematicBackdrop } from '@/components/atmosphere/CinematicBackdrop';
import { SakuraField } from '@/components/atmosphere/SakuraField';

/** Shows the cinematic intro on a fresh session, and on demand from Settings. */
function SplashGate({ children }: { children: ReactNode }) {
  const [entered, setEntered] = useState<boolean>(() => hasEntered());

  useEffect(() => {
    const replay = () => setEntered(false);
    window.addEventListener('hiro:replay-intro', replay);
    return () => window.removeEventListener('hiro:replay-intro', replay);
  }, []);

  const handleEnter = () => {
    markEntered();
    setEntered(true);
  };

  return (
    <>
      {children}
      {!entered ? <SplashScreen onEnter={handleEnter} /> : null}
    </>
  );
}

export function App() {
  return (
    <SettingsProvider>
      <UIProvider>
        <LibraryProvider>
          <PlayerProvider>
            <PlaylistPickerProvider>
              <FocusTimerProvider>
                {/* Mounted above the router so petals and the night scene never reset on navigation. */}
                <CinematicBackdrop />
                <SakuraField />
                <BrowserRouter basename={ROUTER_BASENAME}>
                  <ErrorBoundary>
                    <SplashGate>
                      <Routes>
                        <Route element={<AppShell />}>
                          <Route index element={<HomePage />} />
                          <Route path="explore" element={<ExplorePage />} />
                          <Route path="search" element={<SearchPage />} />
                          <Route path="soundtracks" element={<SoundtracksPage />} />
                          <Route path="lofi" element={<LofiPage />} />
                          <Route path="playlists" element={<PlaylistsPage />} />
                          <Route path="playlists/:playlistId" element={<PlaylistDetailPage />} />
                          <Route path="favourites" element={<FavouritesPage />} />
                          <Route path="recent" element={<RecentPage />} />
                          <Route path="album/:albumId" element={<AlbumDetailPage />} />
                          <Route path="artist/:artistId" element={<ArtistDetailPage />} />
                          <Route path="profile" element={<ProfilePage />} />
                          <Route path="settings" element={<SettingsPage />} />
                          <Route path="library" element={<LocalLibraryPage />} />
                          <Route path="now-playing" element={<NowPlayingPage />} />
                          <Route path="*" element={<NotFoundPage />} />
                        </Route>
                      </Routes>
                    </SplashGate>
                  </ErrorBoundary>
                </BrowserRouter>
              </FocusTimerProvider>
            </PlaylistPickerProvider>
          </PlayerProvider>
        </LibraryProvider>
      </UIProvider>
    </SettingsProvider>
  );
}
