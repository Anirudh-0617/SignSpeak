import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // NVIDIA_API_KEY matches the Vercel env var; VITE_ name kept for old .env files.
  const nvidiaKey = env.NVIDIA_API_KEY || env.VITE_NVIDIA_API_KEY
  return {
    plugins: [react(), tailwindcss()],
    server: {
      // Dev-only proxy /api/nvidia → NVIDIA so the key never enters the client
      // bundle. Production uses the Vercel function in api/nvidia/.
      proxy: {
        '/api/nvidia': {
          target: 'https://integrate.api.nvidia.com',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/nvidia/, ''),
          headers: nvidiaKey ? { Authorization: `Bearer ${nvidiaKey}` } : {},
        },
      },
    },
  }
})
