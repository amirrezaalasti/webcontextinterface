import { defineConfig } from 'vite';
import { resolve } from 'path';

const demoBase = process.env.DEMO_BASE ?? '/';

export default defineConfig({
  base: demoBase,
  root: 'demo',
  publicDir: 'public',
  // Scenario HTML is loaded via import.meta.glob in benchmark.ts — do not treat index.html as a static asset.
  assetsInclude: ['**/scenarios/**/*.html'],
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'shared'),
      '@webcontextinterface/core':      resolve(__dirname, 'packages/core/src/index.ts'),
      '@webcontextinterface/spec':      resolve(__dirname, 'packages/spec/src/index.ts'),
      '@webcontextinterface/distiller': resolve(__dirname, 'packages/distiller/src/index.ts'),
      '@webcontextinterface/bridge':    resolve(__dirname, 'packages/bridge/src/index.ts'),
      '@webcontextinterface/context':   resolve(__dirname, 'packages/context/src/index.ts'),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
  build: {
    outDir: '../dist/demo',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'demo/index.html'),
        scenarios: resolve(__dirname, 'demo/scenarios.html'),
      },
    },
  },
});
