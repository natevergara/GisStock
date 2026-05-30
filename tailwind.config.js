/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Tokens semánticos — modo oscuro como base (sistema iOS Dark).
        bg: '#1C1C1E',
        surface: '#2C2C2E',
        surface2: '#3A3A3C',
        line: 'rgba(255,255,255,0.10)',
        txt: '#FFFFFF',
        txt2: 'rgba(235,235,245,0.60)',
        txt3: 'rgba(235,235,245,0.30)',
        // Interactivo (acción/foco/selección)
        accent: '#0A84FF',
        // Estado
        ok: '#30D158',
        danger: '#FF453A',
        // Marca — uso exclusivo en logo/wordmark, no en chrome de UI
        brand: '#FF6B9D',
        gold: '#E8B65A',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'system-ui',
          'SF Pro Text',
          'Inter',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      minHeight: {
        touch: '44px',
        fat: '60px',
      },
      minWidth: {
        touch: '44px',
        fat: '60px',
      },
    },
  },
  plugins: [],
};
