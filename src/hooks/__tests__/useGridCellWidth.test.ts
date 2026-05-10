// useGridCellWidth: cellWidth = (min(viewport, cap) − 2*pad − (cols-1)*gap) / cols.
// Tests pin the math at three viewport sizes (phone narrower than cap,
// tablet wider, desktop way wider) so a future SafeAreaView change can't
// silently shift card dimensions.

/* eslint-disable import/first */
const mockDimensions = { width: 1920, height: 1080 };

jest.mock('react-native', () => ({
  useWindowDimensions: () => mockDimensions,
}));

jest.mock('@constants/layout', () => ({
  MAX_CONTENT_WIDTH: 1080,
}));

import { renderHook } from '@testing-library/react-native';

import { useGridCellWidth } from '../useGridCellWidth';
/* eslint-enable import/first */

beforeEach(() => {
  mockDimensions.width = 1920;
  mockDimensions.height = 1080;
});

describe('useGridCellWidth', () => {
  it('clamps wide viewports to MAX_CONTENT_WIDTH', () => {
    mockDimensions.width = 1920;
    const { result } = renderHook(() => useGridCellWidth({ padding: 16, gap: 12, columns: 2 }));
    // (1080 − 32 − 12) / 2 = 518
    expect(result.current).toBe(518);
  });

  it('uses the actual viewport when narrower than the cap', () => {
    mockDimensions.width = 390;
    const { result } = renderHook(() => useGridCellWidth({ padding: 16, gap: 12, columns: 2 }));
    // (390 − 32 − 12) / 2 = 173
    expect(result.current).toBe(173);
  });

  it('handles a 3-column grid', () => {
    mockDimensions.width = 1080;
    const { result } = renderHook(() => useGridCellWidth({ padding: 16, gap: 8, columns: 3 }));
    // (1080 − 32 − 16) / 3 ≈ 344
    expect(result.current).toBeCloseTo(344, 5);
  });

  it('handles a 4-column grid with a small gap', () => {
    mockDimensions.width = 1080;
    const { result } = renderHook(() => useGridCellWidth({ padding: 20, gap: 8, columns: 4 }));
    // (1080 − 40 − 24) / 4 = 254
    expect(result.current).toBe(254);
  });
});
