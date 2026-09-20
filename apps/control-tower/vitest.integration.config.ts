import { defineConfig } from 'vitest/config';

/**
 * Tests de integración (requieren PostgreSQL en DATABASE_URL). NO se ejecutan en el
 * `pnpm test` unitario (CI sin DB). Correr con: `pnpm test:integration`.
 */
export default defineConfig({
  test: {
    include: ['tests/integration/**/*.test.ts'],
    environment: 'node',
    testTimeout: 20000,
    hookTimeout: 20000,
    fileParallelism: false,
  },
});
