import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));
const pkg = (name: string) => resolve(root, `packages/${name}/src/index.ts`);

export default defineConfig({
  resolve: {
    // Test against source, not built dist — so a failing test points at the
    // line you need to fix and no build step sits between edit and result.
    alias: {
      '@webcontextinterface/spec': pkg('spec'),
      '@webcontextinterface/distiller': pkg('distiller'),
      '@webcontextinterface/bridge': pkg('bridge'),
      '@webcontextinterface/context': pkg('context'),
      '@webcontextinterface/validator': pkg('validator'),
      '@webcontextinterface/cli': pkg('cli'),
      '@webcontextinterface/mcp': pkg('mcp'),
      '@webcontextinterface/react': pkg('react'),
      '@webcontextinterface/core': pkg('core'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['packages/*/test/**/*.test.{ts,tsx}'],
    globals: false,
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary'],
      include: ['packages/*/src/**/*.ts'],
      exclude: [
        'packages/*/src/**/*.d.ts',
        // Pure re-export barrel.
        'packages/core/src/**',
        // Process entry points: argv/stdio wiring with no branching logic,
        // covered end-to-end by the stdio transport smoke test instead.
        'packages/cli/src/cli.ts',
        'packages/mcp/src/server.ts',
      ],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 80,
        statements: 85,
      },
    },
  },
});
