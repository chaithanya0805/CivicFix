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
          DEFAULT: '#003631',
          light: '#07524A',
          dark: '#00221E',
        },
        secondary: {
          DEFAULT: '#FFEDA8',
          light: '#FFF5CD',
          dark: '#DFCD82',
        },
        cream: {
          DEFAULT: '#FFFDF2',
          soft: '#FAF6E5',
          dark: '#ECE7D5',
        }
      },
      fontFamily: {
        heading: ['"Playfair Display"', 'serif'],
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
