import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',
  publicDir: 'public',
  base: '/GoogleMapsRoute/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
