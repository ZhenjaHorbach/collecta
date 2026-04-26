import { PALETTES } from './palettes';

describe('PALETTES', () => {
  it('light and dark expose identical key sets', () => {
    const lightKeys = Object.keys(PALETTES.light).sort();
    const darkKeys = Object.keys(PALETTES.dark).sort();
    expect(darkKeys).toEqual(lightKeys);
  });

  const themes: ('light' | 'dark')[] = ['light', 'dark'];
  it.each(themes)('every %s value is a hex or rgb(a) string', (theme) => {
    for (const value of Object.values(PALETTES[theme])) {
      expect(value).toMatch(/^(#[0-9A-Fa-f]{3,8}|rgba?\(.+\))$/);
    }
  });
});
