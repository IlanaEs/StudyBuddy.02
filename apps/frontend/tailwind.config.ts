import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        studybuddy: {
          turquoise: '#4ce7e3',
          yellow: '#fccb01',
          teal: '#175655',
          red: '#e22b57',
          lime: '#bbe341',
        },
      },
      fontFamily: {
        // Design System v1: Rubik is the primary UI font; JetBrains Mono for numbers.
        sans: ['Rubik', 'Heebo', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
