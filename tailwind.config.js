/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        ink: {
          50: '#f6f7f9',
          100: '#eceef2',
          200: '#d5d9e2',
          300: '#b0b7c7',
          400: '#848fa6',
          500: '#65718c',
          600: '#515a72',
          700: '#42495d',
          800: '#393f4f',
          900: '#191b24',
          950: '#0f1118',
        },
        brand: {
          50: '#eefcf6',
          100: '#d7f7e9',
          200: '#b0eed4',
          300: '#7adcb8',
          400: '#3fc094',
          500: '#16a37a',
          600: '#0b8363',
          700: '#0a6a52',
          800: '#0b5443',
          900: '#0b4538',
          950: '#04271f',
        },
        accent: {
          50: '#fff8eb',
          100: '#ffeec9',
          200: '#ffd98f',
          300: '#ffbe55',
          400: '#ffa32b',
          500: '#f98312',
          600: '#dd6307',
          700: '#b74708',
          800: '#92380e',
          900: '#782f0f',
        },
      },
      boxShadow: {
        soft: '0 1px 2px rgba(15,17,24,0.04), 0 4px 16px rgba(15,17,24,0.06)',
        lift: '0 8px 30px rgba(15,17,24,0.10)',
        glow: '0 0 0 1px rgba(22,163,122,0.18), 0 12px 40px rgba(22,163,122,0.22)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.9)', opacity: '0.7' },
          '70%': { transform: 'scale(1.3)', opacity: '0' },
          '100%': { transform: 'scale(1.3)', opacity: '0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s cubic-bezier(0.16,1,0.3,1) both',
        'fade-in': 'fade-in 0.4s ease both',
        'scale-in': 'scale-in 0.3s cubic-bezier(0.16,1,0.3,1) both',
        shimmer: 'shimmer 1.6s linear infinite',
        'pulse-ring': 'pulse-ring 2s cubic-bezier(0.4,0,0.6,1) infinite',
        float: 'float 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
