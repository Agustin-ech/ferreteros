/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta de Bodega aplicada a TODOS los paneles (admin, bodega, vendedor)
        brand: {
          yellow: '#F2B01E',
          dark: '#1a1a1a',
        },
        panel: {
          bg: '#141414',      // fondo general
          card: '#1f1f1f',    // tarjetas
          sidebar: '#1a1a1a', // sidebar y header
          border: '#2a2a2a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
