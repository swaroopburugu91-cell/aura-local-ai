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
        aura: {
          bg: '#131314',
          surface: '#1e1f20',
          surfaceHover: '#282a2c',
          card: '#1b1c1d',
          border: '#333537',
          text: '#e3e3e3',
          muted: '#9aa0a6',
          accent: '#7cacf8',
          accentGradientStart: '#4285f4',
          accentGradientEnd: '#9b72cb',
          glow: 'rgba(66, 133, 244, 0.15)',
        },
        light: {
          bg: '#ffffff',
          surface: '#f0f4f9',
          surfaceHover: '#e1e7f0',
          card: '#ffffff',
          border: '#e1e3e1',
          text: '#1f1f1f',
          muted: '#5f6368',
          accent: '#1a73e8',
        }
      },
      fontFamily: {
        sans: ['Google Sans', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['Fira Code', 'JetBrains Mono', 'Consolas', 'monospace']
      }
    },
  },
  plugins: [],
}
