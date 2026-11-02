import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { 'astro:middleware': 'astro/virtual-modules/middleware.js' } },
  test: {
    include: ['tests/**/*.test.ts', 'modules/*/tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
    pool: 'forks',
  },
});
