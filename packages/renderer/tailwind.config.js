/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}', './index.html'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: { DEFAULT: '#0c0e14', light: '#F8F9FA' },
        surface: {
          1: '#14171f', 2: '#1a1e28', 3: '#21262f',
          '1-light': '#FFFFFF', '2-light': '#F0F1F3', '3-light': '#E8E9EB',
        },
        border: {
          1: '#2a2f3a', 2: '#363c4a',
          '1-light': '#E0E2E6', '2-light': '#D0D3D8',
        },
        text: {
          primary: '#e8eaf0', secondary: '#8b92a5', muted: '#5c637a',
          'primary-light': '#1A1D23', 'secondary-light': '#5C6370', 'muted-light': '#9CA3AF',
        },
        ghana: {
          gold: '#D4A017', 'gold-light': '#F2C94C', 'gold-dim': 'rgba(212,160,23,0.12)',
          'gold-dark': '#B8860B',
          red: '#CE1126', green: '#006B3F',
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        xs: '11px', sm: '12px', base: '13px', md: '14px', lg: '16px', xl: '20px', '2xl': '28px',
      },
      borderRadius: { card: '12px', search: '16px', btn: '8px' },
      animation: {
        'slide-in-right': 'slideInRight 200ms ease-out',
        'fade-in': 'fadeIn 150ms ease-out',
        'gold-pulse': 'goldPulse 2s ease-in-out infinite',
        'dot-pulse': 'dotPulse 1.4s infinite ease-in-out both',
      },
      keyframes: {
        slideInRight: { from: { transform: 'translateX(100%)' }, to: { transform: 'translateX(0)' } },
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        goldPulse: { '0%, 100%': { boxShadow: '0 0 0 0 rgba(212,160,23,0.4)' }, '50%': { boxShadow: '0 0 12px 4px rgba(212,160,23,0.2)' } },
        dotPulse: { '0%, 80%, 100%': { opacity: '0' }, '40%': { opacity: '1' } },
      },
    },
  },
  plugins: [],
};
