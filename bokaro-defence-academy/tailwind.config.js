/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: '#0B132B',
        cadet: '#1C2541',
        khaki: '#D4AF37',
        'signal-green': '#25D366',
      },
    },
  },
  plugins: [],
}
