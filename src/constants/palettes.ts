// Theme palettes — single source of truth for concrete color values.
//
// Semantic names are identical between themes. `global.css` mirrors these
// values as CSS variables under `:root` (light) and `.dark:root` (dark);
// `tailwind.config.js` maps each semantic name to `var(--kebab)` so
// `className` resolves to the active palette. `useColors()` picks the
// right palette at runtime for native APIs (ActivityIndicator, tabBar,
// placeholderTextColor, inline style props).
//
// To change a color: edit the value here, mirror it in `global.css`, then
// run `/sync-colors` to verify drift across layers.
//
// `Palette` below declares the exact key shape both palettes must satisfy.
// Using `satisfies Palette` on each object literal rejects missing keys
// and excess keys at compile time — light and dark cannot drift.

export type Palette = Readonly<{
  bg: string;
  surface: string;
  surfaceHi: string;
  surfaceLo: string;
  appShell: string;

  text: string;
  textDim: string;
  textMuted: string;

  gold: string;
  goldHi: string;
  goldLo: string;
  goldGlow: string;
  onGold: string;

  coral: string;
  mint: string;
  sky: string;

  stroke: string;
  strokeHi: string;

  overlay: string;
  overlayHi: string;

  mapBg: string;
  mapDeep: string;
}>;

export type PaletteKey = keyof Palette;

const light = {
  bg: '#FFFFFF',
  surface: '#F4F4F5',
  surfaceHi: '#E4E4E7',
  surfaceLo: '#FAFAFA',
  appShell: '#FFFFFF',

  text: '#0F172A',
  textDim: 'rgba(15,23,42,0.62)',
  textMuted: 'rgba(15,23,42,0.38)',

  gold: '#D97706',
  goldHi: '#F59E0B',
  goldLo: '#B45309',
  goldGlow: 'rgba(217,119,6,0.25)',
  onGold: '#FFFFFF',

  coral: '#EF4444',
  mint: '#10B981',
  sky: '#0EA5E9',

  stroke: 'rgba(15,23,42,0.08)',
  strokeHi: 'rgba(15,23,42,0.16)',

  overlay: 'rgba(255,255,255,0.82)',
  overlayHi: 'rgba(255,255,255,0.9)',

  mapBg: '#E2E8F0',
  mapDeep: '#CBD5E1',
} as const satisfies Palette;

const dark = {
  bg: '#0E1116',
  surface: '#171B22',
  surfaceHi: '#1F252E',
  surfaceLo: '#0A0D12',
  appShell: '#06080B',

  text: '#F4F1EA',
  textDim: 'rgba(244,241,234,0.62)',
  textMuted: 'rgba(244,241,234,0.38)',

  gold: '#E9B86A',
  goldHi: '#F4CE88',
  goldLo: '#B8894A',
  goldGlow: 'rgba(233,184,106,0.25)',
  onGold: '#1A1410',

  coral: '#F07A63',
  mint: '#7CCBA6',
  sky: '#6BA8D4',

  stroke: 'rgba(255,255,255,0.06)',
  strokeHi: 'rgba(255,255,255,0.12)',

  overlay: 'rgba(14,17,22,0.82)',
  overlayHi: 'rgba(14,17,22,0.9)',

  mapBg: '#1A2230',
  mapDeep: '#0E1722',
} as const satisfies Palette;

export const PALETTES = { light, dark } as const;
