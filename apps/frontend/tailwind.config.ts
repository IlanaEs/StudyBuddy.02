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
        sans: ['Inter', 'Heebo', 'Rubik', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
