import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'es2022',
  platform: 'node',
  minify: false,
  sourcemap: true,
  clean: true,
  noExternal: ['@xergai/core', '@xerg/schemas'],
});
