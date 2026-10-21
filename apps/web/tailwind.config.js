/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        safety: {
          green: '#15803d',
          amber: '#b45309',
          red: '#b91c1c'
        }
      }
    },
  },
  plugins: [],
}
