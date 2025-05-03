/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0070f3',
          '50': '#f0f7ff',
          '100': '#e0eefe',
          '200': '#bae0fd',
          '300': '#7cc6fb',
          '400': '#36a6f6',
          '500': '#0c87e8',
          '600': '#0070f3',
          '700': '#0056c7',
          '800': '#0147a1',
          '900': '#063c84',
        },
      },
    },
  },
  plugins: [],
}; 