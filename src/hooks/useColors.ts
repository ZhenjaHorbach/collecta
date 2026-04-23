import { PALETTES, type Palette } from '@constants/palettes';
import { useColorScheme } from 'nativewind';

export function useColors(): Palette {
  const { colorScheme } = useColorScheme();
  return colorScheme === 'light' ? PALETTES.light : PALETTES.dark;
}
