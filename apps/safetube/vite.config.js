import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const convexSiteUrl = env.VITE_CONVEX_URL?.replace('.cloud', '.site') || 'http://localhost:3000';

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/auth': {
          target: convexSiteUrl,
          changeOrigin: true,
          secure: true,
          // Rewrite cookies to work with localhost
          cookieDomainRewrite: {
            '*': 'localhost'
          },
          cookiePathRewrite: {
            '*': '/'
          },
        },
      },
    },
  };
})
