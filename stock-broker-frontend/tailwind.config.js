/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkbg: '#0a0d16',
        darkcard: 'rgba(20, 26, 46, 0.6)',
        darkborder: 'rgba(255, 255, 255, 0.08)',
        glowgreen: '#10b981',
        glowred: '#ef4444',
        accentblue: '#2563eb',
        accentteal: '#0d9488',
      },
      backgroundImage: {
        'radial-glow': 'radial-gradient(circle at top, rgba(37, 99, 235, 0.15) 0%, transparent 60%)',
      },
    },
  },
  plugins: [],
}
