import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const convexSiteUrl = env.VITE_CONVEX_URL?.replace('.cloud', '.site') || 'http://localhost:3000';

  return {
    plugins: [react()],
    // One-site: SafeStudy lives at getsafefamily.com/study. Every built asset URL
    // is prefixed so the hub can proxy /study/* to this deployment unchanged.
    base: '/study/',
    server: {
      // The hub (next dev on :3000) proxies /study/* here. HMR must bypass the
      // proxy, so the client talks to this port directly.
      hmr: { host: 'localhost', port: Number(env.VITE_DEV_PORT || 5176), protocol: 'ws' },
      port: Number(env.VITE_DEV_PORT || 5176),
      strictPort: true,
      proxy: {
        '/api/auth': {
          target: convexSiteUrl,
          changeOrigin: true,
          secure: true,
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
