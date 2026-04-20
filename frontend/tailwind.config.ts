import type { Config } from 'tailwindcss'

const config: Config = {
  // Always render as dark — no light mode in MVP
  darkMode: 'class',

  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],

  theme: {
    extend: {
      // ── Color system ──────────────────────────────────────────────────────
      colors: {
        // Backgrounds (darkest → lightest)
        void:    '#0A0A0A',   // page background
        surface: {
          DEFAULT:  '#1C1C1E',  // card / sheet background
          elevated: '#2C2C2E',  // input / raised surface
          overlay:  '#3A3A3C',  // pressed / hover state
        },

        // Labels (mirrors Apple HIG dark palette)
        label: {
          primary:   '#FFFFFF',
          secondary: '#8E8E93',
          tertiary:  '#636366',
        },

        // Accent — violet, Linear-inspired
        accent: {
          DEFAULT: '#7C3AED',
          light:   '#A78BFA',
          soft:    'rgba(124,58,237,0.15)',
        },

        // Semantic
        income:  '#34D399',   // emerald-400
        expense: '#F87171',   // red-400

        // Borders
        border: {
          DEFAULT: 'rgba(255,255,255,0.10)',
          strong:  'rgba(255,255,255,0.18)',
        },
      },

      // ── Typography ────────────────────────────────────────────────────────
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', '-apple-system', 'sans-serif'],
      },

      fontSize: {
        // Fluid display sizes for the balance card
        'display-lg': ['3rem',   { lineHeight: '1', fontWeight: '700', letterSpacing: '-0.03em' }],
        'display-md': ['2rem',   { lineHeight: '1.1', fontWeight: '700', letterSpacing: '-0.02em' }],
        'display-sm': ['1.5rem', { lineHeight: '1.2', fontWeight: '600', letterSpacing: '-0.01em' }],
      },

      // ── Spacing / layout ──────────────────────────────────────────────────
      spacing: {
        // Bottom nav height + safe area
        'nav':        '60px',
        'nav-safe':   'calc(60px + env(safe-area-inset-bottom))',
        'safe-top':   'env(safe-area-inset-top)',
        'safe-bottom':'env(safe-area-inset-bottom)',
      },

      // ── Border radius ─────────────────────────────────────────────────────
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
        '4xl': '1.5rem',
      },

      // ── Animations ────────────────────────────────────────────────────────
      keyframes: {
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%':   { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'wiggle': {
          '0%, 100%': { transform: 'rotate(-2deg)' },
          '50%':      { transform: 'rotate(2deg)' },
        },
      },
      animation: {
        'fade-up':  'fade-up  0.28s cubic-bezier(0.16,1,0.3,1) both',
        'fade-in':  'fade-in  0.2s  ease-out both',
        'scale-in': 'scale-in 0.22s cubic-bezier(0.16,1,0.3,1) both',
        'wiggle':   'wiggle   0.3s  ease-in-out infinite',
      },
    },
  },

  plugins: [],
}

export default config
