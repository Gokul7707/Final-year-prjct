import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    port: 5173,
    watch: {
      usePolling: true,
      interval: 1000,
      ignored: ['**/dist/**', '**/node_modules/**'],
    },
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_API || 'http://localhost:5004',
        changeOrigin: true,
      },
      '/output': {
        target: process.env.VITE_PROXY_API || 'http://localhost:5004',
        changeOrigin: true,
      },
    },
  },
})
