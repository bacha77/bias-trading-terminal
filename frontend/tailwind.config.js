/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: '#0a0e17',
        panel: 'rgba(17, 24, 39, 0.6)',
        'neon-green': '#00ffa3',
        'neon-red': '#ff2a6d',
        'neon-gold': '#ffd700',
      }
    },
  },
  plugins: [],
}
