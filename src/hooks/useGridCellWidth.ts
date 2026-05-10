import { useWindowDimensions } from 'react-native';

import { MAX_CONTENT_WIDTH } from '@constants/layout';

export interface GridCellWidthParams {
  // Outer horizontal padding around the grid (each side, in px).
  padding: number;
  // Gap between cells in a row (in px).
  gap: number;
  // Number of columns the grid renders.
  columns: number;
}

// Width of a single cell in an N-column grid that lives inside the
// SafeAreaView's max-content-width frame. Centralised so every gridded
// screen (Collections / Discover / CollectionDetail / Profile) stays in
// visual lockstep on tablet + desktop web — `useWindowDimensions` reports
// the full viewport, but the actual rendering area is capped at
// MAX_CONTENT_WIDTH by SafeAreaView.
export function useGridCellWidth({ padding, gap, columns }: GridCellWidthParams): number {
  const { width: rawWidth } = useWindowDimensions();
  const effective = Math.min(rawWidth, MAX_CONTENT_WIDTH);
  return (effective - padding * 2 - gap * (columns - 1)) / columns;
}
