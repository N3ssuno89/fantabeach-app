import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  // Path aliases for cleaner imports
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})
