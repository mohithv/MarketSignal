import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backend =
    env.VITE_DEV_PROXY_TARGET ??
    process.env.VITE_DEV_PROXY_TARGET ??
    'https://marketsignal-2d8t.onrender.com/'

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/analyze': { target: backend, changeOrigin: true },
        '/api/': { target: backend, changeOrigin: true },
        '/api/analyze': { target: backend, changeOrigin: true },
        '/sector-analysis': { target: backend, changeOrigin: true },
        '/health': { target: backend, changeOrigin: true },
      },
    },
  }
})
