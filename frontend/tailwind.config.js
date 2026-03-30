/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#fff8f0',
          100: '#feecd9',
          200: '#fdd5a8',
          300: '#fbb66d',
          400: '#f8943a',
          500: '#e07b2a',
          600: '#c45f15',
          700: '#9e480f',
          800: '#7d3a10',
          900: '#663110',
        },
        maroon: {
          50:  '#fdf2f4',
          100: '#fce7eb',
          200: '#f9cfd6',
          300: '#f4a9b6',
          400: '#ec7489',
          500: '#a0182d',
          600: '#8b1326',
          700: '#750f1f',
          800: '#610d1a',
          900: '#530b16',
        },
        gold: {
          400: '#f5c842',
          500: '#e6b520',
          600: '#c49a0d',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Playfair Display', 'serif'],
      },
    },
  },
  plugins: [],
}
