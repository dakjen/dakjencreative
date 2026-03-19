/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#1C3557',
          light: '#243f68',
          deep: '#0f1f33',
        },
        mauve: {
          DEFAULT: '#b07a8a',
          light: '#c9949f',
          pale: '#f0e4e7',
        },
        cream: '#faf8f5',
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        serif: ['Cormorant Garamond', 'serif'],
      },
    },
  },
  plugins: [],
}
