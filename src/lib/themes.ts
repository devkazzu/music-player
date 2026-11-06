import type { ThemeId } from '@/types';

/**
 * HIRO SEGAWA — Sakura Dream themes.
 *
 * Each theme is a complete palette plus a scene description. The palette is
 * applied as CSS custom properties on <html>, so every surface, glow and
 * canvas reading those variables re-tints instantly and without a reload.
 */
export interface ThemeScene {
  moonX: number;
  moonY: number;
  moonSize: number;
  moonOpacity: number;
  toriiX: number;
  toriiY: number;
  toriiScale: number;
  petals: number;
  motif: 'torii' | 'pagoda' | 'lantern' | 'koi' | 'bamboo' | 'bridge';
}

export interface Theme {
  id: ThemeId;
  label: string;
  jp: string;
  tagline: string;
  themeColor: string;
  swatch: readonly [string, string, string];
  scene: ThemeScene;
}

export const THEMES: readonly Theme[] = [
  {
    id: 'sakura',
    label: 'Sakura Night',
    jp: '桜の夜',
    tagline: 'Petals over a violet moon',
    themeColor: '#0B0714',
    swatch: ['#0B0714', '#7B2CBF', '#FF9BD2'],
    scene: { moonX: 68, moonY: 20, moonSize: 26, moonOpacity: 0.95, toriiX: 50, toriiY: 70, toriiScale: 1, petals: 1, motif: 'torii' },
  },
  {
    id: 'moonlight',
    label: 'Moonlight',
    jp: '月光',
    tagline: 'Quiet water, silver light',
    themeColor: '#050B18',
    swatch: ['#050B18', '#3B6FD4', '#BFE6FF'],
    scene: { moonX: 76, moonY: 16, moonSize: 22, moonOpacity: 1, toriiX: 42, toriiY: 71, toriiScale: 0.95, petals: 0.7, motif: 'bridge' },
  },
  {
    id: 'cyber',
    label: 'Cyber Purple',
    jp: '電脳紫',
    tagline: 'Neon shrine, midnight rain',
    themeColor: '#080213',
    swatch: ['#080213', '#A855F7', '#22D3EE'],
    scene: { moonX: 80, moonY: 14, moonSize: 16, moonOpacity: 0.8, toriiX: 34, toriiY: 68, toriiScale: 1.15, petals: 0.8, motif: 'lantern' },
  },
  {
    id: 'aqua',
    label: 'Aqua Blue',
    jp: '水碧',
    tagline: 'Cool tide under a cyan moon',
    themeColor: '#03131A',
    swatch: ['#03131A', '#0E7490', '#5FF3E0'],
    scene: { moonX: 62, moonY: 18, moonSize: 24, moonOpacity: 0.9, toriiX: 52, toriiY: 72, toriiScale: 1, petals: 0.6, motif: 'koi' },
  },
  {
    id: 'sunset',
    label: 'Sunset',
    jp: '夕焼け',
    tagline: 'The sky turns to lanterns',
    themeColor: '#170710',
    swatch: ['#170710', '#C2410C', '#FFB07C'],
    scene: { moonX: 70, moonY: 30, moonSize: 30, moonOpacity: 0.95, toriiX: 46, toriiY: 74, toriiScale: 1.05, petals: 0.9, motif: 'torii' },
  },
  {
    id: 'midnight',
    label: 'Midnight',
    jp: '真夜中',
    tagline: 'Lights off, volume low',
    themeColor: '#05060F',
    swatch: ['#05060F', '#4C1D95', '#C4B5FD'],
    scene: { moonX: 84, moonY: 12, moonSize: 14, moonOpacity: 0.7, toriiX: 30, toriiY: 70, toriiScale: 0.9, petals: 0.55, motif: 'pagoda' },
  },
  {
    id: 'koi',
    label: 'Koi Red',
    jp: '紅鯉',
    tagline: 'Red lanterns on still water',
    themeColor: '#120409',
    swatch: ['#120409', '#B91C4B', '#FF9BD2'],
    scene: { moonX: 64, moonY: 22, moonSize: 25, moonOpacity: 0.9, toriiX: 54, toriiY: 70, toriiScale: 1.08, petals: 0.85, motif: 'koi' },
  },
  {
    id: 'emerald',
    label: 'Emerald',
    jp: '翡翠',
    tagline: 'Bamboo wind and fireflies',
    themeColor: '#04120C',
    swatch: ['#04120C', '#047857', '#6FF3B0'],
    scene: { moonX: 72, moonY: 18, moonSize: 21, moonOpacity: 0.85, toriiX: 40, toriiY: 73, toriiScale: 0.9, petals: 0.75, motif: 'bamboo' },
  },
] as const;

export const THEME_BY_ID: Record<ThemeId, Theme> = Object.fromEntries(
  THEMES.map((theme) => [theme.id, theme]),
) as Record<ThemeId, Theme>;

export function getTheme(id: ThemeId): Theme {
  return THEME_BY_ID[id] ?? THEME_BY_ID.sakura;
}

export const DEFAULT_THEME_ID: ThemeId = 'sakura';

interface Palette {
  surface1: string;
  surface2: string;
  hairline: string;
  accent: string;
  accent2: string;
  accent3: string;
  accentRgb: string;
  accentSoft: string;
  text: string;
  mist: string;
  moon: string;
  moonGlow: string;
  skyTop: string;
  skyMid: string;
  skyBottom: string;
  ridgeNear: string;
  ridgeFar: string;
  lake: string;
  lakeGlow: string;
  petalA: string;
  petalB: string;
  petalC: string;
  lantern: string;
}

const hexToRgb = (hex: string): string => {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const value = Number.parseInt(full, 16);
  return `${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}`;
};

const withAlpha = (hex: string, alpha: number) => `rgba(${hexToRgb(hex)}, ${alpha})`;

/** Palette per theme — surfaces, text and the colours the canvas layers read. */
export const THEME_PALETTES: Record<ThemeId, Palette> = {
  sakura: {
    surface1: 'rgba(35, 17, 54, 0.64)', surface2: 'rgba(11, 7, 20, 0.82)', hairline: 'rgba(199, 125, 255, 0.18)',
    accent: '#FF9BD2', accent2: '#C77DFF', accent3: '#7B2CBF', accentRgb: hexToRgb('#FF9BD2'), accentSoft: 'rgba(255, 155, 210, 0.16)',
    text: '#FFF7FC', mist: '#D8BEE8', moon: '#F0D7FF', moonGlow: 'rgba(199, 125, 255, 0.65)',
    skyTop: '#07030F', skyMid: '#1A0D2A', skyBottom: '#2D1452',
    ridgeNear: '#150A24', ridgeFar: '#2A1443', lake: '#160B26', lakeGlow: 'rgba(199, 125, 255, 0.35)',
    petalA: '#FFD3EA', petalB: '#FF9BD2', petalC: '#C77DFF', lantern: '#FFC2E4',
  },
  moonlight: {
    surface1: 'rgba(12, 26, 48, 0.64)', surface2: 'rgba(5, 11, 24, 0.84)', hairline: 'rgba(147, 197, 253, 0.18)',
    accent: '#BFE6FF', accent2: '#6B9CFF', accent3: '#3B6FD4', accentRgb: hexToRgb('#BFE6FF'), accentSoft: 'rgba(191, 230, 255, 0.15)',
    text: '#F4FAFF', mist: '#A9C6E6', moon: '#EAF6FF', moonGlow: 'rgba(147, 197, 253, 0.6)',
    skyTop: '#03060F', skyMid: '#071629', skyBottom: '#0F2B4C',
    ridgeNear: '#091625', ridgeFar: '#122A47', lake: '#08131F', lakeGlow: 'rgba(147, 197, 253, 0.3)',
    petalA: '#E8F4FF', petalB: '#BFE6FF', petalC: '#93C5FD', lantern: '#D9EDFF',
  },
  cyber: {
    surface1: 'rgba(28, 10, 48, 0.68)', surface2: 'rgba(8, 2, 19, 0.86)', hairline: 'rgba(168, 85, 247, 0.22)',
    accent: '#C77DFF', accent2: '#22D3EE', accent3: '#7B2CBF', accentRgb: hexToRgb('#C77DFF'), accentSoft: 'rgba(199, 125, 255, 0.17)',
    text: '#FCF5FF', mist: '#C7B3E6', moon: '#E9D5FF', moonGlow: 'rgba(168, 85, 247, 0.6)',
    skyTop: '#06010E', skyMid: '#180A2E', skyBottom: '#2B0F52',
    ridgeNear: '#12061F', ridgeFar: '#26103F', lake: '#0C0418', lakeGlow: 'rgba(34, 211, 238, 0.28)',
    petalA: '#F3D9FF', petalB: '#C77DFF', petalC: '#22D3EE', lantern: '#E9D5FF',
  },
  aqua: {
    surface1: 'rgba(8, 34, 42, 0.64)', surface2: 'rgba(3, 19, 26, 0.84)', hairline: 'rgba(95, 243, 224, 0.18)',
    accent: '#5FF3E0', accent2: '#38BDF8', accent3: '#0E7490', accentRgb: hexToRgb('#5FF3E0'), accentSoft: 'rgba(95, 243, 224, 0.15)',
    text: '#F0FFFD', mist: '#A7D9D6', moon: '#DFFBFF', moonGlow: 'rgba(95, 243, 224, 0.55)',
    skyTop: '#02100F', skyMid: '#04222A', skyBottom: '#0A3A46',
    ridgeNear: '#062026', ridgeFar: '#0B3540', lake: '#04181C', lakeGlow: 'rgba(95, 243, 224, 0.3)',
    petalA: '#D8FFF8', petalB: '#5FF3E0', petalC: '#38BDF8', lantern: '#B9FFF2',
  },
  sunset: {
    surface1: 'rgba(48, 18, 36, 0.64)', surface2: 'rgba(23, 7, 16, 0.84)', hairline: 'rgba(255, 176, 124, 0.2)',
    accent: '#FFB07C', accent2: '#FF7A9C', accent3: '#C2410C', accentRgb: hexToRgb('#FFB07C'), accentSoft: 'rgba(255, 176, 124, 0.16)',
    text: '#FFF8F1', mist: '#E6BFA9', moon: '#FFE2B8', moonGlow: 'rgba(255, 138, 128, 0.55)',
    skyTop: '#150612', skyMid: '#3B1024', skyBottom: '#7A2E33',
    ridgeNear: '#22101C', ridgeFar: '#3E1B2B', lake: '#1B0A14', lakeGlow: 'rgba(255, 176, 124, 0.34)',
    petalA: '#FFE3D2', petalB: '#FFB07C', petalC: '#FF7A9C', lantern: '#FFD3A8',
  },
  midnight: {
    surface1: 'rgba(20, 16, 40, 0.66)', surface2: 'rgba(5, 6, 15, 0.88)', hairline: 'rgba(196, 181, 253, 0.16)',
    accent: '#C4B5FD', accent2: '#7C6BF0', accent3: '#4C1D95', accentRgb: hexToRgb('#C4B5FD'), accentSoft: 'rgba(196, 181, 253, 0.14)',
    text: '#F5F3FF', mist: '#B9B3D6', moon: '#E9E3FF', moonGlow: 'rgba(124, 107, 240, 0.5)',
    skyTop: '#02030A', skyMid: '#080A1C', skyBottom: '#141034',
    ridgeNear: '#0A0A18', ridgeFar: '#181334', lake: '#06060F', lakeGlow: 'rgba(124, 107, 240, 0.26)',
    petalA: '#E6E0FF', petalB: '#C4B5FD', petalC: '#7C6BF0', lantern: '#D8D0FF',
  },
  koi: {
    surface1: 'rgba(48, 12, 26, 0.66)', surface2: 'rgba(18, 4, 9, 0.86)', hairline: 'rgba(255, 155, 210, 0.2)',
    accent: '#FF8FA8', accent2: '#FF9BD2', accent3: '#B91C4B', accentRgb: hexToRgb('#FF8FA8'), accentSoft: 'rgba(255, 143, 168, 0.16)',
    text: '#FFF5F8', mist: '#E3B3C2', moon: '#FFD9E2', moonGlow: 'rgba(255, 105, 140, 0.55)',
    skyTop: '#0D0207', skyMid: '#25060F', skyBottom: '#48101F',
    ridgeNear: '#1A0510', ridgeFar: '#30101C', lake: '#14040A', lakeGlow: 'rgba(255, 143, 168, 0.3)',
    petalA: '#FFE1EC', petalB: '#FF8FA8', petalC: '#FF9BD2', lantern: '#FFB3C7',
  },
  emerald: {
    surface1: 'rgba(10, 38, 28, 0.64)', surface2: 'rgba(4, 18, 12, 0.85)', hairline: 'rgba(111, 243, 176, 0.18)',
    accent: '#6FF3B0', accent2: '#2BD1A0', accent3: '#047857', accentRgb: hexToRgb('#6FF3B0'), accentSoft: 'rgba(111, 243, 176, 0.15)',
    text: '#F2FFF9', mist: '#A9D8C4', moon: '#DCFFEE', moonGlow: 'rgba(43, 209, 160, 0.5)',
    skyTop: '#020D09', skyMid: '#062018', skyBottom: '#0B3A2A',
    ridgeNear: '#051A13', ridgeFar: '#0C2C20', lake: '#04140E', lakeGlow: 'rgba(111, 243, 176, 0.26)',
    petalA: '#D9FFEC', petalB: '#6FF3B0', petalC: '#2BD1A0', lantern: '#C8FFE4',
  },
};

/** CSS custom properties consumed by the stylesheet and the canvas layers. */
export function themeVariables(id: ThemeId): Record<string, string> {
  const palette = THEME_PALETTES[id];
  const scene = getTheme(id).scene;
  return {
    '--accent': palette.accent,
    '--accent-2': palette.accent2,
    '--accent-3': palette.accent3,
    '--accent-rgb': palette.accentRgb,
    '--accent-soft': palette.accentSoft,
    '--surface': palette.surface1,
    '--surface-strong': palette.surface2,
    '--hairline': palette.hairline,
    '--text': palette.text,
    '--mist': palette.mist,
    '--moon': palette.moon,
    '--moon-glow': palette.moonGlow,
    '--sky-top': palette.skyTop,
    '--sky-mid': palette.skyMid,
    '--sky-bottom': palette.skyBottom,
    '--ridge-near': palette.ridgeNear,
    '--ridge-far': palette.ridgeFar,
    '--lake': palette.lake,
    '--lake-glow': palette.lakeGlow,
    '--petal-a': palette.petalA,
    '--petal-b': palette.petalB,
    '--petal-c': palette.petalC,
    '--lantern': palette.lantern,
    '--moon-x': `${scene.moonX}%`,
    '--moon-y': `${scene.moonY}%`,
    '--moon-size': `${scene.moonSize}%`,
    '--moon-opacity': String(scene.moonOpacity),
    '--torii-x': `${scene.toriiX}%`,
    '--torii-y': `${scene.toriiY}%`,
    '--torii-scale': String(scene.toriiScale),
  };
}

export const PETAL_COLORS: Record<ThemeId, readonly [string, string, string]> = Object.fromEntries(
  THEMES.map((theme) => {
    const palette = THEME_PALETTES[theme.id];
    return [theme.id, [palette.petalA, palette.petalB, palette.petalC] as const];
  }),
) as Record<ThemeId, readonly [string, string, string]>;

/** Small helper for components needing an rgba glow without touching CSS. */
export function accentGlow(themeId: ThemeId, alpha = 0.5): string {
  return withAlpha(THEME_PALETTES[themeId].accent, alpha);
}
