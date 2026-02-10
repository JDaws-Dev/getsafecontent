import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy Better Auth requests to Convex backend
      '/api/auth': {
        target: 'https://reminiscent-cod-488.convex.site',
        changeOrigin: true,
        secure: true,
      }
    }
  },
  build: {
    // Temporarily keeping console.logs to debug searchAlbums issue
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // Temporarily disabled for debugging
        drop_debugger: true,
      },
    },
  },
})
