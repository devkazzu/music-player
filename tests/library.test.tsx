import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { SettingsProvider } from '@/state/SettingsProvider';
import { UIProvider } from '@/state/UIContext';
import { LibraryProvider, useLibrary } from '@/state/LibraryProvider';

function LibraryHarness() {
  const lib = useLibrary();
  const [playlistId, setPlaylistId] = useState('');
  const [lastAdded, setLastAdded] = useState('');

  return (
    <div>
      <output data-testid="ready">{String(lib.ready)}</output>
      <output data-testid="playlists">
        {lib.playlists.map((playlist) => `${playlist.name}:${playlist.trackIds.length}`).join('|')}
      </output>
      <output data-testid="favourites">{lib.favourites.join('|')}</output>
      <output data-testid="recent">
        {lib.recent.map((entry) => `${entry.trackId}:${entry.playCount}`).join('|')}
      </output>
      <output data-testid="stats">
        {lib.stats.tracks}|{lib.stats.artists}|{lib.stats.albums}
      </output>
      <output data-testid="added">{lastAdded}</output>
      <output data-testid="pid">{playlistId}</output>
      <output data-testid="local">{lib.localTracks.length}</output>

      <button
        type="button"
        onClick={async () => {
          const playlist = await lib.createPlaylist({
            name: 'Test Mix',
            description: 'A test collection',
            trackIds: ['neon-requiem'],
          });
          if (playlist) setPlaylistId(playlist.id);
        }}
      >
        create
      </button>
      <button
        type="button"
        onClick={async () => {
          const added = await lib.addTracksToPlaylist(playlistId, [
            'ghost-in-the-rain',
            'ghost-in-the-rain',
            'hanabi',
          ]);
          setLastAdded(String(added));
        }}
      >
        add-tracks
      </button>
      <button
        type="button"
        onClick={async () => {
          await lib.updatePlaylist(playlistId, { name: 'Renamed Mix', description: 'Updated' });
        }}
      >
        rename
      </button>
      <button
        type="button"
        onClick={async () => {
          await lib.removeTrackFromPlaylist(playlistId, 'ghost-in-the-rain');
        }}
      >
        remove-track
      </button>
      <button
        type="button"
        onClick={async () => {
          await lib.movePlaylistTrack(playlistId, 'hanabi', -1);
        }}
      >
        move-track
      </button>
      <button type="button" onClick={() => void lib.deletePlaylist(playlistId)}>
        delete
      </button>
      <button type="button" onClick={() => lib.toggleFavourite('neon-requiem')}>
        favourite
      </button>
      <button
        type="button"
        onClick={() => {
          lib.recordPlay('neon-requiem');
          lib.recordPlay('neon-requiem');
          lib.recordPlay('paper-lanterns');
        }}
      >
        play-history
      </button>
      <button type="button" onClick={() => void lib.clearRecent()}>
        clear-history
      </button>
      <button type="button" onClick={() => void lib.removeRecent('neon-requiem')}>
        remove-recent
      </button>
    </div>
  );
}

function renderHarness() {
  return render(
    <SettingsProvider>
      <UIProvider>
        <LibraryProvider>
          <LibraryHarness />
        </LibraryProvider>
      </UIProvider>
    </SettingsProvider>,
  );
}

const text = (id: string) => screen.getByTestId(id).textContent ?? '';

describe('library and playlist integration', () => {
  beforeEach(() => {
    cleanup();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  afterEach(() => cleanup());

  it('boots with the demo catalogue and seeded playlists', async () => {
    renderHarness();
    await waitFor(() => expect(text('ready')).toBe('true'), { timeout: 4000 });
    expect(text('stats')).toBe('9|6|6');
    expect(text('playlists')).toContain('Late Night Drive');
    expect(text('playlists')).toContain('Cinema of the Heart');
    expect(text('local')).toBe('0');
  });

  it('creates, populates, renames, reorders and deletes a playlist', async () => {
    renderHarness();
    await waitFor(() => expect(text('ready')).toBe('true'));

    fireEvent.click(screen.getByText('create'));
    await waitFor(() => {
      expect(text('playlists')).toContain('Test Mix:1');
      expect(text('pid')).not.toBe('');
    });

    // Duplicate ids are de-duplicated; only two new tracks are added.
    fireEvent.click(screen.getByText('add-tracks'));
    await waitFor(() => expect(text('added')).toBe('2'));
    expect(text('playlists')).toContain('Test Mix:3');

    fireEvent.click(screen.getByText('rename'));
    await waitFor(() => expect(text('playlists')).toContain('Renamed Mix:3'));

    fireEvent.click(screen.getByText('remove-track'));
    await waitFor(() => expect(text('playlists')).toContain('Renamed Mix:2'));

    // Moving the second track up reorders without changing the count.
    fireEvent.click(screen.getByText('move-track'));
    await waitFor(() => expect(text('playlists')).toContain('Renamed Mix:2'));

    fireEvent.click(screen.getByText('delete'));
    await waitFor(() => expect(text('playlists')).not.toContain('Renamed Mix'));
  });

  it('persists favourites and listening history', async () => {
    renderHarness();
    await waitFor(() => expect(text('ready')).toBe('true'));

    fireEvent.click(screen.getByText('favourite'));
    await waitFor(() => expect(text('favourites')).toBe('neon-requiem'));
    fireEvent.click(screen.getByText('favourite'));
    await waitFor(() => expect(text('favourites')).toBe(''));

    fireEvent.click(screen.getByText('play-history'));
    await waitFor(() => expect(text('recent')).toContain('neon-requiem:2'));
    expect(text('recent')).toContain('paper-lanterns:1');

    fireEvent.click(screen.getByText('remove-recent'));
    await waitFor(() => expect(text('recent')).not.toContain('neon-requiem'));

    fireEvent.click(screen.getByText('clear-history'));
    await waitFor(() => expect(text('recent')).toBe(''));
  });

  it('shows seeded and user playlists in the library after a re-render', async () => {
    renderHarness();
    await waitFor(() => expect(text('ready')).toBe('true'));
    fireEvent.click(screen.getByText('create'));
    await waitFor(() => expect(text('playlists')).toContain('Test Mix:1'));

    cleanup();
    renderHarness();
    await waitFor(() => expect(text('ready')).toBe('true'));
    await waitFor(() => expect(text('playlists')).toContain('Test Mix:1'));
  });
});
