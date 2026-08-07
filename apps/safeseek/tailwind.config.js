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
        // Safe Family brand (revived — shared across all 5 apps; copied verbatim)
        brand: {
          cream: '#FBF6EF',
          'cream-2': '#F3EADD',
          navy: '#221D2E',
          'ink-soft': '#6A6275',
          'peach-start': '#F5A962',
          'peach-end': '#E88B6A',
        },
        // SafeStudy signature accent — cobalt (search / study)
        accent: {
          50: '#EEF3FE',
          100: '#D9E4FD',
          200: '#B4CAFB',
          300: '#85A8F7',
          400: '#5687F4',
          500: '#2F6BF0',
          600: '#2556CC',
          700: '#1E45A3',
          800: '#1A3B85',
          900: '#18316B',
        },
        // Keep primary alias for backward compatibility (cobalt)
        primary: {
          50: '#EEF3FE',
          100: '#D9E4FD',
          200: '#B4CAFB',
          300: '#85A8F7',
          400: '#5687F4',
          500: '#2F6BF0',
          600: '#2556CC',
          700: '#1E45A3',
          800: '#1A3B85',
          900: '#18316B',
        },
      },
      fontFamily: {
        display: ['Fredoka', 'ui-rounded', 'system-ui', 'sans-serif'],
        sans: ['Quicksand', 'ui-rounded', 'system-ui', '-apple-system', 'sans-serif'],
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.4s ease-out',
      },
    },
  },
  plugins: [],
}
