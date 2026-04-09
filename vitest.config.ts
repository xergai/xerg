import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@xergai/core': fileURLToPath(new URL('./packages/core/src/index.ts', import.meta.url)),
      '@xerg/schemas': fileURLToPath(new URL('./packages/schemas/src/index.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['packages/*/tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: ['**/.next/**', '**/*.config.ts', '**/dist/**', '**/tests/**', 'scripts/**'],
      thresholds: {
        branches: 69,
        functions: 73,
        lines: 65,
        statements: 65,
      },
    },
  },
});
