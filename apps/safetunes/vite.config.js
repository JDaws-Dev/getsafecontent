import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const devPort = Number(env.VITE_DEV_PORT || 5174);

  return {
    plugins: [react()],
    // One-site: SafeTunes is served at getsafefamily.com/tunes AND at the root of
    // getsafetunes.com (the shipped native app loads that host). Assets are always
    // fetched from /tunes/assets; vercel.json serves that path on both hosts. The
    // router basename is decided at runtime in src/lib/appBase.js, not from here.
    base: '/tunes/',
    server: {
      // The hub (next dev on :3000) proxies /tunes/* here. HMR must bypass the
      // proxy, so the client talks to this port directly.
      hmr: { host: 'localhost', port: devPort, protocol: 'ws' },
      port: devPort,
      strictPort: true,
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
  };
})
