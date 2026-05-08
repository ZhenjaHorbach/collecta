// useColors picks the active palette by colorScheme. Native APIs that can't
// consume className (ActivityIndicator, tabBar, placeholderTextColor) call
// this — a wrong palette swap there means a flash of wrong colour on theme
// change.

/* eslint-disable import/first */
const mockState = { colorScheme: 'dark' as 'light' | 'dark' };

jest.mock('nativewind', () => ({
  useColorScheme: () => ({ colorScheme: mockState.colorScheme }),
}));

import { renderHook } from '@testing-library/react-native';

import { PALETTES } from '@constants/palettes';

import { useColors } from '../useColors';
/* eslint-enable import/first */

describe('useColors', () => {
  it('returns the dark palette when colorScheme is dark', () => {
    mockState.colorScheme = 'dark';
    const { result } = renderHook(() => useColors());
    expect(result.current).toBe(PALETTES.dark);
  });

  it('returns the light palette when colorScheme is light', () => {
    mockState.colorScheme = 'light';
    const { result } = renderHook(() => useColors());
    expect(result.current).toBe(PALETTES.light);
  });
});
