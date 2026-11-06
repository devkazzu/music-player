import { describe, expect, it } from 'vitest';
import { INTENSITY_SCALE, petalBudget } from '@/components/atmosphere/SakuraField';
import { lyricsFor } from '@/data/lyrics';

describe('sakura particle engine configuration', () => {
  it('orders intensity presets from gentle to heavy', () => {
    expect(INTENSITY_SCALE.gentle).toBeLessThan(INTENSITY_SCALE.normal);
    expect(INTENSITY_SCALE.normal).toBeLessThan(INTENSITY_SCALE.heavy);
  });

  it('is denser on desktop than on small phones', () => {
    expect(petalBudget(1440, 'normal')).toBeGreaterThan(petalBudget(390, 'normal'));
  });

  it('scales with intensity and clamps to a usable minimum', () => {
    const normal = petalBudget(1280, 'normal');
    expect(petalBudget(1280, 'heavy')).toBeGreaterThan(normal);
    expect(petalBudget(1280, 'gentle')).toBeLessThan(normal);
    expect(petalBudget(320, 'gentle', 0.2)).toBeGreaterThanOrEqual(12);
  });

  it('respects a theme density multiplier', () => {
    expect(petalBudget(1280, 'normal', 0.5)).toBeLessThan(petalBudget(1280, 'normal', 1));
  });
});

describe('lyric sheets', () => {
  it('has lyrics or an explicit instrumental flag for every demo score', () => {
    const ids = [
      'neon-requiem',
      'ghost-in-the-rain',
      'paper-lanterns',
      'hanabi',
      'midnight-rail',
      'station-of-dreams',
      'rainfall-sonata',
      'stellar-lullaby',
      'skyline-dreams',
    ];
    for (const id of ids) {
      const sheet = lyricsFor(id);
      expect(sheet).not.toBeNull();
      expect(sheet?.jp.length).toBeGreaterThan(0);
      if (!sheet?.instrumental) expect(sheet?.lines.length).toBeGreaterThan(0);
    }
  });

  it('marks Rainfall Sonata as instrumental', () => {
    expect(lyricsFor('rainfall-sonata')?.instrumental).toBe(true);
    expect(lyricsFor('rainfall-sonata')?.lines).toHaveLength(0);
  });

  it('returns null for unknown tracks', () => {
    expect(lyricsFor('not-a-track')).toBeNull();
  });
});
