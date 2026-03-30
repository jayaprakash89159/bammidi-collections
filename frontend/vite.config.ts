import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    define: {
      // Make env vars available at build time for Render static site
      __VITE_API_URL__: JSON.stringify(env.VITE_API_URL || 'http://localhost:8001/api'),
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
  }
})
