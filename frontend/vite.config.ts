import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api/auth/register': 'http://localhost:5129',
      '/api': 'http://localhost:5080',
    },
  },
})
