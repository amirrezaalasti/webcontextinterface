import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: 'demo',
  publicDir: 'public',
  resolve: {
    alias: {
      '@agentdom/spec':      resolve(__dirname, 'packages/spec/src/index.ts'),
      '@agentdom/distiller': resolve(__dirname, 'packages/distiller/src/index.ts'),
      '@agentdom/bridge':    resolve(__dirname, 'packages/bridge/src/index.ts'),
      '@agentdom/context':   resolve(__dirname, 'packages/context/src/index.ts'),
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
