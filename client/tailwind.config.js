/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#131315',
          dim: '#131315',
          bright: '#39393b',
          lowest: '#0e0e10',
          low: '#1c1b1d',
          container: '#201f21',
          high: '#2a2a2c',
          highest: '#353437',
        },
        primary: {
          DEFAULT: '#adc6ff',
          container: '#4d8eff',
          on: '#002e6a',
        },
        secondary: {
          DEFAULT: '#d0bcff',
          container: '#571bc1',
          onContainer: '#c4abff',
        },
        tertiary: '#ffb786',
        outline: {
          DEFAULT: '#8c909f',
          variant: '#424754',
        },
        content: {
          DEFAULT: '#e5e1e4',
          muted: '#c2c6d6',
        },
        ink: {
          950: '#0a0a0c',
          900: '#131315',
          800: '#201f21',
          700: '#2a2a2c',
          600: '#353437',
        },
        accent: {
          DEFAULT: '#adc6ff',
          dim: '#243b68',
        },
        warn: '#f59e0b',
        danger: '#ffb4ab',
      },
      fontFamily: {
        sans: ['Inter', '"Segoe UI Variable"', '"Segoe UI"', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Cascadia Mono"', 'Consolas', 'monospace'],
      },
      boxShadow: {
        modal: '0 32px 64px -12px rgba(0,0,0,.8)',
        active: '0 0 18px rgba(173,198,255,.16)',
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
      },
    },
  },
  plugins: [],
};
