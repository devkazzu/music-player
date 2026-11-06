import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SettingsProvider } from '@/state/SettingsProvider';
import { UIProvider } from '@/state/UIContext';
import { LibraryProvider, useLibrary } from '@/state/LibraryProvider';
import { PlayerProvider, usePlayer } from '@/state/PlayerProvider';

/** A minimal harness that exposes the public player API to the test. */
function PlayerHarness() {
  const player = usePlayer();
  const { tracks, recent, favouriteTracks, toggleFavourite } = useLibrary();
  const featured = tracks.find((track) => track.id === 'neon-requiem');
  const ghost = tracks.find((track) => track.id === 'ghost-in-the-rain');
  const hanabi = tracks.find((track) => track.id === 'hanabi');

  if (!featured || !ghost || !hanabi) return <p>loading</p>;

  return (
    <div>
      <output data-testid="current">{player.currentTrack?.id ?? 'none'}</output>
      <output data-testid="playing">{String(player.isPlaying)}</output>
      <output data-testid="time">{player.currentTime.toFixed(1)}</output>
      <output data-testid="duration">{player.duration.toFixed(2)}</output>
      <output data-testid="queue">{player.queue.map((track) => track.id).join('|')}</output>
      <output data-testid="index">{player.index}</output>
      <output data-testid="label">{player.contextLabel}</output>
      <output data-testid="rate">{player.rate}</output>
      <output data-testid="volume">{player.volume.toFixed(2)}</output>
      <output data-testid="muted">{String(player.muted)}</output>
      <output data-testid="shuffle">{String(player.shuffle)}</output>
      <output data-testid="repeat">{player.repeat}</output>
      <output data-testid="recent">{recent.map((entry) => entry.trackId).join('|')}</output>
      <output data-testid="favourites">{favouriteTracks.map((track) => track.id).join('|')}</output>

      <button type="button" onClick={() => player.playQueue([featured, ghost], 0, 'Player test')}>
        start
      </button>
      <button type="button" onClick={() => player.toggle()}>toggle</button>
      <button type="button" onClick={() => player.next()}>next</button>
      <button type="button" onClick={() => player.previous()}>previous</button>
      <button type="button" onClick={() => player.seek(12)}>seek12</button>
      <button type="button" onClick={() => player.seekBy(5)}>seek-plus-5</button>
      <button type="button" onClick={() => player.addToQueue(ghost)}>queue-ghost</button>
      <button type="button" onClick={() => player.addNext(hanabi)}>next-hanabi</button>
      <button type="button" onClick={() => player.removeFromQueue(1)}>remove-1</button>
      <button type="button" onClick={() => player.moveInQueue(1, 2)}>move-1-2</button>
      <button type="button" onClick={() => player.clearQueue()}>clear-queue</button>
      <button type="button" onClick={() => player.jumpTo(1)}>jump-1</button>
      <button type="button" onClick={() => player.setRate(1.5)}>rate-1.5</button>
      <button type="button" onClick={() => player.toggleShuffle()}>shuffle</button>
      <button type="button" onClick={() => player.cycleRepeat()}>repeat</button>
      <button type="button" onClick={() => player.setVolume(0.3)}>volume-30</button>
      <button type="button" onClick={() => player.toggleMute()}>mute</button>
      <button type="button" onClick={() => player.stop()}>stop</button>
      <button type="button" onClick={() => toggleFavourite(featured.id)}>favourite</button>
    </div>
  );
}

function renderHarness() {
  return render(
    <SettingsProvider>
      <UIProvider>
        <LibraryProvider>
          <PlayerProvider>
            <PlayerHarness />
          </PlayerProvider>
        </LibraryProvider>
      </UIProvider>
    </SettingsProvider>,
  );
}

const text = (id: string) => screen.getByTestId(id).textContent;

describe('player engine integration', () => {
  beforeEach(() => {
    cleanup();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  afterEach(() => cleanup());

  it('starts a queue, reports duration and records history', async () => {
    renderHarness();
    fireEvent.click(screen.getByText('start'));

    await waitFor(() => expect(text('current')).toBe('neon-requiem'));
    expect(text('queue')).toBe('neon-requiem|ghost-in-the-rain');
    expect(text('index')).toBe('0');
    expect(text('label')).toBe('Player test');
    expect(text('duration')).toBe('26.06');
    await waitFor(() => expect(text('playing')).toBe('true'));
    await waitFor(() => expect(text('recent')).toContain('neon-requiem'));
  });

  it('plays, pauses, seeks and resumes', async () => {
    renderHarness();
    fireEvent.click(screen.getByText('start'));
    await waitFor(() => expect(text('playing')).toBe('true'));

    fireEvent.click(screen.getByText('toggle'));
    await waitFor(() => expect(text('playing')).toBe('false'));

    fireEvent.click(screen.getByText('toggle'));
    await waitFor(() => expect(text('playing')).toBe('true'));

    fireEvent.click(screen.getByText('seek12'));
    await waitFor(() => expect(Number(text('time'))).toBeCloseTo(12, 1));

    fireEvent.click(screen.getByText('seek-plus-5'));
    await waitFor(() => expect(Number(text('time'))).toBeCloseTo(17, 1));
  });

  it('moves to the next and previous track', async () => {
    renderHarness();
    fireEvent.click(screen.getByText('start'));
    await waitFor(() => expect(text('current')).toBe('neon-requiem'));

    fireEvent.click(screen.getByText('next'));
    await waitFor(() => expect(text('current')).toBe('ghost-in-the-rain'));
    expect(text('index')).toBe('1');

    fireEvent.click(screen.getByText('previous'));
    await waitFor(() => expect(text('current')).toBe('neon-requiem'));
    expect(text('index')).toBe('0');
  });

  it('restarts the current track when previous is pressed mid-song', async () => {
    renderHarness();
    fireEvent.click(screen.getByText('start'));
    fireEvent.click(screen.getByText('next'));
    await waitFor(() => expect(text('current')).toBe('ghost-in-the-rain'));

    fireEvent.click(screen.getByText('seek12'));
    await waitFor(() => expect(Number(text('time'))).toBeCloseTo(12, 1));

    fireEvent.click(screen.getByText('previous'));
    await waitFor(() => expect(Number(text('time'))).toBeCloseTo(0, 1));
    expect(text('current')).toBe('ghost-in-the-rain');
  });

  it('manages the queue: add duplicates, remove, reorder, jump, clear', async () => {
    renderHarness();
    fireEvent.click(screen.getByText('start'));
    await waitFor(() => expect(text('queue')).toBe('neon-requiem|ghost-in-the-rain'));

    // Duplicate tracks are allowed and stay addressable by index.
    fireEvent.click(screen.getByText('queue-ghost'));
    expect(text('queue')).toBe('neon-requiem|ghost-in-the-rain|ghost-in-the-rain');

    fireEvent.click(screen.getByText('next-hanabi'));
    expect(text('queue')).toBe('neon-requiem|hanabi|ghost-in-the-rain|ghost-in-the-rain');

    fireEvent.click(screen.getByText('move-1-2'));
    expect(text('queue')).toBe('neon-requiem|ghost-in-the-rain|hanabi|ghost-in-the-rain');

    fireEvent.click(screen.getByText('remove-1'));
    expect(text('queue')).toBe('neon-requiem|hanabi|ghost-in-the-rain');

    fireEvent.click(screen.getByText('jump-1'));
    await waitFor(() => expect(text('current')).toBe('hanabi'));

    fireEvent.click(screen.getByText('clear-queue'));
    expect(text('queue')).toBe('hanabi');

    fireEvent.click(screen.getByText('stop'));
    await waitFor(() => expect(text('current')).toBe('none'));
    expect(text('queue')).toBe('');
  });

  it('persists playback preferences and toggles favourites', async () => {
    renderHarness();
    fireEvent.click(screen.getByText('start'));

    fireEvent.click(screen.getByText('rate-1.5'));
    await waitFor(() => expect(text('rate')).toBe('1.5'));
    expect(JSON.parse(window.localStorage.getItem('hiro:settings:v1') ?? '{}').rate).toBe(1.5);

    fireEvent.click(screen.getByText('volume-30'));
    await waitFor(() => expect(text('volume')).toBe('0.30'));
    expect(text('muted')).toBe('false');

    fireEvent.click(screen.getByText('mute'));
    await waitFor(() => expect(text('muted')).toBe('true'));

    fireEvent.click(screen.getByText('shuffle'));
    await waitFor(() => expect(text('shuffle')).toBe('true'));

    expect(text('repeat')).toBe('all');
    fireEvent.click(screen.getByText('repeat'));
    await waitFor(() => expect(text('repeat')).toBe('one'));

    fireEvent.click(screen.getByText('favourite'));
    await waitFor(() => expect(text('favourites')).toContain('neon-requiem'));
    fireEvent.click(screen.getByText('favourite'));
    await waitFor(() => expect(text('favourites')).not.toContain('neon-requiem'));
  });

  it('saves the queue to localStorage so playback can be restored', async () => {
    renderHarness();
    fireEvent.click(screen.getByText('start'));
    await waitFor(() => expect(text('current')).toBe('neon-requiem'));

    await waitFor(() => {
      const persisted = JSON.parse(window.localStorage.getItem('hiro:queue:v1') ?? 'null');
      expect(persisted?.trackIds?.[0]).toBe('neon-requiem');
      expect(persisted?.label).toBe('Player test');
    });
  });
});
