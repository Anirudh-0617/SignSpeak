import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss()],
    server: {
      // ponytail: proxy /api/nvidia → NVIDIA in dev only, so VITE_NVIDIA_API_KEY
      // never enters the client bundle. Production needs a real backend.
      proxy: {
        '/api/nvidia': {
          target: 'https://integrate.api.nvidia.com',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/nvidia/, ''),
          headers: env.VITE_NVIDIA_API_KEY
            ? { Authorization: `Bearer ${env.VITE_NVIDIA_API_KEY}` }
            : {},
        },
      },
    },
  }
})
