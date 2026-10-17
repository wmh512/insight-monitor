import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    target: 'es2015',
    minify: 'esbuild',
    lib: {
      entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
      name: 'InsightSDK',
      formats: ['es', 'umd'],
      fileName: (format) => `insight.${format}.js`,
    },
  },
})
