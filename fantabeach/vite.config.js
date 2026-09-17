import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    // Multi-page: l'app (index.html) e il Coppie Game (game.html) sono due entry separate
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        game: fileURLToPath(new URL('./game.html', import.meta.url)),
      },
    },
  },
  // Path aliases for cleaner imports
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})
