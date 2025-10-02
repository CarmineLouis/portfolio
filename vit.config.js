// vite.config.js
import { defineConfig } from 'vite'

export default defineConfig({
  // se o repo for CarmineLouis/portfolio:
  base: '/portfolio/',

  // opcional: melhora paths relativos em algumas hospedagens
  build: { outDir: 'dist', emptyOutDir: true },
})
