import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdf4',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },
        // Couleurs pilotées par les variables CSS du thème courant
        theme: {
          bg:      'var(--c-bg)',
          surface: 'var(--c-surface)',
          text:    'var(--c-text)',
          muted:   'var(--c-muted)',
          border:  'var(--c-border)',
          accent:  'var(--c-accent)',
          accent2: 'var(--c-accent2)',
        },
      },
    },
  },
  plugins: [],
};

export default config;
