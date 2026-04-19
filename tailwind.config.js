/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './app/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Backgrounds
        bg:          '#0E1116',
        surface:     '#171B22',
        'surface-hi':'#1F252E',
        'surface-lo':'#0A0D12',
        'app-shell': '#06080B',

        // Text
        text:        '#F4F1EA',
        'text-dim':  'rgba(244,241,234,0.62)',
        'text-muted':'rgba(244,241,234,0.38)',

        // Accent — gold
        gold:        '#E9B86A',
        'gold-hi':   '#F4CE88',
        'gold-lo':   '#B8894A',
        'gold-glow': 'rgba(233,184,106,0.25)',

        // Semantic accent colors
        coral:       '#F07A63',
        mint:        '#7CCBA6',
        sky:         '#6BA8D4',

        // Strokes / borders
        stroke:      'rgba(255,255,255,0.06)',
        'stroke-hi': 'rgba(255,255,255,0.12)',

        // Overlays
        overlay:     'rgba(14,17,22,0.82)',
        'overlay-hi':'rgba(14,17,22,0.9)',

        // Map
        'map-bg':    '#1A2230',
        'map-deep':  '#0E1722',
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
