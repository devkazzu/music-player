import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App } from '@/App';

/**
 * End-to-end-ish smoke test: boots the real provider tree (fake IndexedDB,
 * stubbed media element + canvas), enters the app, then exercises navigation,
 * search and the playback queue.
 */
async function enterApp() {
  const splashButton = screen.queryByText('Just look around');
  if (splashButton) fireEvent.click(splashButton);
  await waitFor(() => expect(screen.queryByText('Enter with music')).toBeNull(), { timeout: 4000 });
}

describe('HIRO SEGAWA application shell', () => {
  beforeEach(() => {
    cleanup();
    window.sessionStorage.clear();
    window.localStorage.clear();
    window.history.replaceState({}, '', '/');
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the splash, enters the app and navigates', async () => {
    render(<App />);
    expect(await screen.findByText('Enter with music')).toBeTruthy();
    expect(screen.getAllByText('HIRO SEGAWA').length).toBeGreaterThan(0);

    await enterApp();

    expect(await screen.findByText(/Your night,/i)).toBeTruthy();
    expect(await screen.findByText('Continue listening')).toBeTruthy();
    expect(await screen.findByText('Mood categories')).toBeTruthy();

    fireEvent.click(screen.getAllByText('Explore Music')[0]);
    expect(await screen.findByText('A city of sound, one tap away')).toBeTruthy();

    fireEvent.click(screen.getAllByText('Night Drive')[0]);
    await waitFor(() => expect(window.location.search).toContain('mood=night-drive'));
  }, 25000);

  it('searches the catalogue and shows grouped results and empty states', async () => {
    window.sessionStorage.setItem('hiro:splash-entered:v1', '1');
    window.history.replaceState({}, '', '/search');
    render(<App />);

    const input = await screen.findByLabelText('Search the music library');
    fireEvent.change(input, { target: { value: 'neon' } });

    expect(await screen.findByText('Songs')).toBeTruthy();
    await waitFor(() => expect(screen.getAllByText('Neon Requiem').length).toBeGreaterThan(0));

    fireEvent.change(input, { target: { value: 'zzzzzz' } });
    expect(await screen.findByText(/No results for/i)).toBeTruthy();
  }, 25000);

  it('starts playback from the home hero and controls it', async () => {
    window.sessionStorage.setItem('hiro:splash-entered:v1', '1');
    window.history.replaceState({}, '', '/');
    render(<App />);

    const playButton = await screen.findByRole('button', { name: /Play featured/i });
    fireEvent.click(playButton);

    expect(await screen.findByRole('button', { name: /Pause Featured · Neon Requiem/i })).toBeTruthy();
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /^Pause$/ }).length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getAllByRole('button', { name: /^Pause$/ })[0]);
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /^Play$/ }).length).toBeGreaterThan(0);
    });

    // Favourite the current track from the player bar.
    const likeButtons = screen.getAllByRole('button', { name: /Add Neon Requiem to favourites/i });
    fireEvent.click(likeButtons[0]);
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /Remove Neon Requiem from favourites/i }).length).toBeGreaterThan(0);
    });

    // Open the full-screen player.
    fireEvent.click(screen.getAllByLabelText('Open full-screen player')[0]);
    expect(await screen.findByText('About this track')).toBeTruthy();
    expect(await screen.findByText('Up next')).toBeTruthy();
  }, 25000);

  it('creates a playlist and opens its empty detail page', async () => {
    window.sessionStorage.setItem('hiro:splash-entered:v1', '1');
    window.history.replaceState({}, '', '/playlists');
    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: /New playlist/i }));

    const nameInput = await screen.findByPlaceholderText(/Tokyo Rooftop/i);
    fireEvent.change(nameInput, { target: { value: 'Test Night Mix' } });
    const submitButtons = screen.getAllByRole('button', { name: /Create playlist/i });
    fireEvent.click(submitButtons[submitButtons.length - 1]);

    await waitFor(() => expect(window.location.pathname).toMatch(/^\/playlists\//));
    expect(await screen.findByRole('heading', { name: 'Test Night Mix' })).toBeTruthy();
    expect(await screen.findByText('This playlist is empty')).toBeTruthy();
  }, 25000);
});
