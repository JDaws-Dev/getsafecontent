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
        // Safe Family brand (revived — shared across all 5 apps, copied verbatim)
        brand: {
          cream: '#FBF6EF',
          'cream-2': '#F3EADD',
          navy: '#221D2E',
          'ink-soft': '#6A6275',
          'peach-start': '#F5A962',
          'peach-end': '#E88B6A',
        },
        // SafeTube signature accent — coral (video). Ramp anchored on 500=#F0603A.
        accent: {
          50: '#FEF3EF',
          100: '#FDE0D6',
          200: '#FAC4B2',
          300: '#F7A188',
          400: '#F47E5F',
          500: '#F0603A',
          600: '#D94A26',
          700: '#B43A1D',
          800: '#8F2F19',
          900: '#742818',
        },
        // Keep primary alias for backward compatibility (now coral too)
        primary: {
          50: '#FEF3EF',
          100: '#FDE0D6',
          200: '#FAC4B2',
          300: '#F7A188',
          400: '#F47E5F',
          500: '#F0603A',
          600: '#D94A26',
          700: '#B43A1D',
          800: '#8F2F19',
          900: '#742818',
        },
      },
      fontFamily: {
        display: ['Fredoka', 'ui-rounded', 'system-ui', 'sans-serif'],
        sans: ['Quicksand', 'ui-rounded', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
