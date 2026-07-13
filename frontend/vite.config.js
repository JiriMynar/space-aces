import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // V produkci servíruje build Django pod /static/, v dev běží na rootu.
  base: command === 'build' ? '/static/' : '/',
  server: {
    proxy: {
      // Přesměruj API volání na Django backend během vývoje.
      '/api': 'http://localhost:8000',
    },
  },
}))
