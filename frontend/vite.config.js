import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Konfigurasi Vite + Tailwind CSS + Proxy API
 * ------------------------------------------
 * Seluruh permintaan frontend ke `/api/*` diteruskan langsung ke server
 * Laravel Backend (http://127.0.0.1:8000) agar bebas masalah CORS saat development.
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
