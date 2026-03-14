/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}', './index.html'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: { DEFAULT: 'var(--color-bg)' },
        surface: {
          1: 'var(--color-surface-1)',
          2: 'var(--color-surface-2)',
          3: 'var(--color-surface-3)',
        },
        border: {
          1: 'var(--color-border-1)',
          2: 'var(--color-border-2)',
        },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
        },
        ghana: {
          gold: '#D4A017', 'gold-light': '#F2C94C', 'gold-dim': 'rgba(212,160,23,0.12)',
          'gold-dark': '#B8860B',
          red: '#CE1126', green: '#006B3F',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
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
