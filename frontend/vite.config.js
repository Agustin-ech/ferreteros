import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // El service worker (public/sw.js) lee este manifest para guardar todos los
  // archivos del build y que la app abra sin internet.
  build: { manifest: true },
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:5000',
      '/usuarios': 'http://127.0.0.1:5000',
    },
  },
})
