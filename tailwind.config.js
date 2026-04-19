/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './app/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: '#020617', // slate-950
        surface: '#0f172a',    // slate-900
        border: '#1e293b',     // slate-800
        muted: '#475569',      // slate-600
        text: '#f1f5f9',       // slate-100
        accent: '#f59e0b',     // amber-500
        'accent-dim': '#b45309', // amber-700
      },
    },
  },
  plugins: [],
};
