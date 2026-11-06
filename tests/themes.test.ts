import { describe, expect, it } from 'vitest';
import {
  PETAL_COLORS,
  THEMES,
  THEME_BY_ID,
  THEME_PALETTES,
  accentGlow,
  getTheme,
  themeVariables,
} from '@/lib/themes';
import type { ThemeId } from '@/types';

const IDS: ThemeId[] = [
  'sakura',
  'moonlight',
  'cyber',
  'aqua',
  'sunset',
  'midnight',
  'koi',
  'emerald',
];

describe('Sakura Dream themes', () => {
  it('ships exactly the eight documented themes', () => {
    expect(THEMES.map((theme) => theme.id)).toEqual(IDS);
    expect(new Set(THEMES.map((theme) => theme.label)).size).toBe(8);
  });

  it('labels every theme with a Japanese name and a tagline', () => {
    for (const theme of THEMES) {
      expect(theme.jp.length).toBeGreaterThan(0);
      expect(theme.tagline.length).toBeGreaterThan(4);
      expect(theme.swatch).toHaveLength(3);
      expect(theme.themeColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('provides a full palette and petal colours per theme', () => {
    for (const id of IDS) {
      const palette = THEME_PALETTES[id];
      expect(palette.accent).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(palette.accentRgb.split(',')).toHaveLength(3);
      expect(palette.skyTop).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(PETAL_COLORS[id]).toHaveLength(3);
    }
  });

  it('exposes CSS variables for the scene and the glow layers', () => {
    const vars = themeVariables('sakura');
    expect(vars['--accent']).toBe(THEME_PALETTES.sakura.accent);
    expect(vars['--sky-mid']).toBe(THEME_PALETTES.sakura.skyMid);
    expect(vars['--moon-x']).toMatch(/%$/);
    expect(vars['--torii-scale']).toBeDefined();
  });

  it('falls back to Sakura Night for unknown ids', () => {
    expect(getTheme('unknown' as ThemeId).id).toBe('sakura');
    expect(THEME_BY_ID.sakura.label).toBe('Sakura Night');
  });

  it('builds rgba glow strings from the theme accent', () => {
    expect(accentGlow('moonlight', 0.5)).toBe('rgba(191, 230, 255, 0.5)');
  });

  it('gives every theme a distinct accent colour', () => {
    const accents = IDS.map((id) => THEME_PALETTES[id].accent.toLowerCase());
    expect(new Set(accents).size).toBe(8);
  });
});
