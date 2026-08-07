/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Safe Family brand (revived — shared across all 5 apps)
        brand: {
          cream: '#FBF6EF',
          'cream-2': '#F3EADD',
          navy: '#221D2E',
          'ink-soft': '#6A6275',
          'peach-start': '#F5A962',
          'peach-end': '#E88B6A',
        },
        // SafeTunes signature accent — grape (music)
        accent: {
          50: '#F4F0FD',
          100: '#E9E0FB',
          200: '#D4C3F6',
          300: '#B89BF0',
          400: '#986FE8',
          500: '#7C4DE0',
          600: '#6A3CCB',
          700: '#5730A6',
          800: '#452781',
          900: '#3A2368',
        },
      },
      fontFamily: {
        display: ['Fredoka', 'ui-rounded', 'system-ui', 'sans-serif'],
        sans: ['Quicksand', 'ui-rounded', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
