// useThemeVars converts a Palette to a CSS-vars object scoped to the active
// theme. Mounted on the root <View> in _layout.tsx so all NativeWind classes
// resolve via `var(--token)`. A regression here means *every* coloured
// className in the app reads the wrong (or undefined) value.

/* eslint-disable import/first */
const mockState = { colorScheme: 'dark' as 'light' | 'dark' };

jest.mock('nativewind', () => ({
  useColorScheme: () => ({ colorScheme: mockState.colorScheme }),
  // `vars` from nativewind returns an opaque style object the runtime knows
  // how to flatten. We inspect the input map instead, so just echo it.
  vars: (map: Record<string, string>) => ({ __vars: map }),
}));

import { renderHook } from '@testing-library/react-native';

import { PALETTES } from '@constants/palettes';

import { useThemeVars } from '../useThemeVars';
/* eslint-enable import/first */

interface VarsBag {
  __vars: Record<string, string>;
}

describe('useThemeVars', () => {
  it('emits CSS-var keys in kebab-case derived from palette token names', () => {
    mockState.colorScheme = 'dark';
    const { result } = renderHook(() => useThemeVars());
    const map = (result.current as unknown as VarsBag).__vars;
    expect(map['--bg']).toBe(PALETTES.dark.bg);
    expect(map['--text-dim']).toBe(PALETTES.dark.textDim);
    expect(map['--gold-glow']).toBe(PALETTES.dark.goldGlow);
    expect(map['--surface-hi']).toBe(PALETTES.dark.surfaceHi);
  });

  it('switches palettes when colorScheme is light', () => {
    mockState.colorScheme = 'light';
    const { result } = renderHook(() => useThemeVars());
    const map = (result.current as unknown as VarsBag).__vars;
    expect(map['--bg']).toBe(PALETTES.light.bg);
    expect(map['--text']).toBe(PALETTES.light.text);
  });

  it('exposes every Palette token as a CSS variable', () => {
    mockState.colorScheme = 'dark';
    const { result } = renderHook(() => useThemeVars());
    const map = (result.current as unknown as VarsBag).__vars;
    const tokenCount = Object.keys(PALETTES.dark).length;
    expect(Object.keys(map)).toHaveLength(tokenCount);
  });
});
