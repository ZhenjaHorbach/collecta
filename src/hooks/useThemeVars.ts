import { PALETTES, type Palette, type PaletteKey } from '@constants/palettes';
import { useColorScheme, vars } from 'nativewind';
import { useMemo } from 'react';

function camelToKebab(key: string): string {
  return key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}

function paletteToVars(palette: Palette): Record<`--${string}`, string> {
  const out: Record<string, string> = {};
  for (const key of Object.keys(palette) as PaletteKey[]) {
    out[`--${camelToKebab(key)}`] = palette[key];
  }
  return out;
}

const LIGHT_VAR_MAP = paletteToVars(PALETTES.light);
const DARK_VAR_MAP = paletteToVars(PALETTES.dark);

export function useThemeVars() {
  const { colorScheme } = useColorScheme();
  return useMemo(() => vars(colorScheme === 'light' ? LIGHT_VAR_MAP : DARK_VAR_MAP), [colorScheme]);
}
