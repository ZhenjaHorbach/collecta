// Raw hex/rgba color tokens for native APIs (ActivityIndicator, StyleSheet props,
// placeholderTextColor, tabBar colors) where Tailwind className cannot be used.
// Values MUST mirror tailwind.config.js — run `/sync-colors` after any change here
// or there to verify and fix drift.

export const Colors = {
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
  onGold: '#1A1410',

  coral: '#F07A63',
  mint: '#7CCBA6',
  sky: '#6BA8D4',

  stroke: 'rgba(255,255,255,0.06)',
  strokeHi: 'rgba(255,255,255,0.12)',
} as const;

export type ColorToken = keyof typeof Colors;
