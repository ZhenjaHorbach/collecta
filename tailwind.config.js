/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './app/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Semantic tokens — values come from CSS variables in global.css
        // (:root = light, .dark:root = dark). Runtime hex values live in
        // src/constants/palettes.ts for native APIs that can't consume var().
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-hi': 'var(--surface-hi)',
        'surface-lo': 'var(--surface-lo)',
        'app-shell': 'var(--app-shell)',

        text: 'var(--text)',
        'text-dim': 'var(--text-dim)',
        'text-muted': 'var(--text-muted)',

        gold: 'var(--gold)',
        'gold-hi': 'var(--gold-hi)',
        'gold-lo': 'var(--gold-lo)',
        'gold-glow': 'var(--gold-glow)',
        'on-gold': 'var(--on-gold)',

        coral: 'var(--coral)',
        mint: 'var(--mint)',
        sky: 'var(--sky)',

        stroke: 'var(--stroke)',
        'stroke-hi': 'var(--stroke-hi)',

        overlay: 'var(--overlay)',
        'overlay-hi': 'var(--overlay-hi)',

        'map-bg': 'var(--map-bg)',
        'map-deep': 'var(--map-deep)',
      },

      borderRadius: {
        sm: '10px',
        md: '16px',
        lg: '22px',
        xl: '28px',
      },
    },
  },
  plugins: [],
};
