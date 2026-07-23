import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  build: { outDir: 'dist' },
  // For GitHub Pages: https://fongway94.github.io/CS12HK/
  // Set GITHUB_PAGES=true or build on GitHub Actions will auto-detect repo name
  base: process.env.GITHUB_PAGES === 'true' || process.env.GITHUB_ACTIONS === 'true' ? '/CS12HK/' : '/'
})
