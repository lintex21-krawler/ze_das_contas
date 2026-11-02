import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: 'var(--color-bg)',
          card: 'var(--color-surface)',
          elevated: 'var(--color-surface-elevated)',
        },
        border: {
          DEFAULT: 'var(--color-border)',
        },
        text: {
          primary: 'var(--color-text-main)',
          secondary: 'var(--color-text-muted)',
          disabled: 'var(--color-text-disabled)',
        },
        brand: {
          primary: '#4D8DDB',
          secondary: '#8B7BEA',
        },
        financial: {
          income: '#25B77A',
          expense: '#E56B6F',
          warning: '#E8A23A',
          info: '#4D8DDB',
        },
      },
      borderRadius: {
        card: '16px',
        input: '12px',
        button: '12px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      minHeight: {
        touch: '44px',
      },
      minWidth: {
        touch: '44px',
      },
    },
  },
  plugins: [],
};

export default config;
