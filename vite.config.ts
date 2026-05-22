import { defineConfig } from 'vite';
import { resolve } from 'path';

const demoBase = process.env.DEMO_BASE ?? '/';

export default defineConfig({
  base: demoBase,
  root: 'demo',
  publicDir: 'public',
  assetsInclude: ['**/*.html'],
  resolve: {
    alias: {
      '@wci/core':      resolve(__dirname, 'packages/core/src/index.ts'),
      '@wci/spec':      resolve(__dirname, 'packages/spec/src/index.ts'),
      '@wci/distiller': resolve(__dirname, 'packages/distiller/src/index.ts'),
      '@wci/bridge':    resolve(__dirname, 'packages/bridge/src/index.ts'),
      '@wci/context':   resolve(__dirname, 'packages/context/src/index.ts'),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
  build: {
    outDir: '../dist/demo',
    emptyOutDir: true,
  },
});
