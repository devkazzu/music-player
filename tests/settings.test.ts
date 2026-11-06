import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '@/lib/storage';

const KEY = 'hiro:settings:v1';

describe('settings schema and migration', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });
  afterEach(() => {
    window.localStorage.clear();
  });

  it('defaults to Sakura Night with petals and animation enabled', () => {
    const settings = loadSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
    expect(settings.theme).toBe('sakura');
    expect(settings.sakura).toBe(true);
    expect(settings.sakuraIntensity).toBe('normal');
    expect(settings.backgroundAnimation).toBe(true);
    expect(settings.glow).toBe(1);
    expect(settings.performanceMode).toBe('auto');
    expect(settings.visualizerStyle).toBe('bars');
  });

  it('migrates the legacy accent key to a theme', () => {
    window.localStorage.setItem(KEY, JSON.stringify({ accent: 'violet' }));
    expect(loadSettings().theme).toBe('cyber');
    window.localStorage.setItem(KEY, JSON.stringify({ accent: 'gold' }));
    expect(loadSettings().theme).toBe('sunset');
    window.localStorage.setItem(KEY, JSON.stringify({ accent: 'sakura' }));
    expect(loadSettings().theme).toBe('sakura');
  });

  it('migrates the old aurora visualizer to the new aura style', () => {
    window.localStorage.setItem(KEY, JSON.stringify({ visualizerStyle: 'aurora' }));
    expect(loadSettings().visualizerStyle).toBe('aura');
  });

  it('falls back for unknown or malformed values', () => {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({
        theme: 'neon-rainbow',
        visualizerStyle: 'spiral',
        sakuraIntensity: 'apocalyptic',
        performanceMode: 'turbo',
        glow: 99,
      }),
    );
    const settings = loadSettings();
    expect(settings.theme).toBe('sakura');
    expect(settings.visualizerStyle).toBe('bars');
    expect(settings.sakuraIntensity).toBe('normal');
    expect(settings.performanceMode).toBe('auto');
    expect(settings.glow).toBe(1.6);
  });

  it('persists and restores every new preference', () => {
    saveSettings({
      ...DEFAULT_SETTINGS,
      theme: 'koi',
      sakura: false,
      sakuraIntensity: 'heavy',
      backgroundAnimation: false,
      glow: 0.7,
      performanceMode: 'battery',
      visualizerStyle: 'aura',
    });
    const restored = loadSettings();
    expect(restored.theme).toBe('koi');
    expect(restored.sakura).toBe(false);
    expect(restored.sakuraIntensity).toBe('heavy');
    expect(restored.backgroundAnimation).toBe(false);
    expect(restored.glow).toBeCloseTo(0.7);
    expect(restored.performanceMode).toBe('battery');
    expect(restored.visualizerStyle).toBe('aura');
  });

  it('survives corrupted JSON', () => {
    window.localStorage.setItem(KEY, '{not json');
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });
});
