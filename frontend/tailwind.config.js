/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fef7ee',
          100: '#fdead6',
          200: '#fad1ac',
          300: '#f7b176',
          400: '#f38a3e',
          500: '#f06c1a',
          600: '#e15310',
          700: '#bb3e0f',
          800: '#953318',
          900: '#782c16',
        },
      },
    },
  },
  plugins: [],
}