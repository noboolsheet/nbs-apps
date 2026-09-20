import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Los tests de componentes usan JSX: transformación automática (no hace falta importar React).
  esbuild: { jsx: 'automatic' },
  test: {
    // Tests unitarios de paquetes (dominio/validación/aplicación) + los de `apps/web/lib` que son lógica pura
    // sin React (p. ej. el i18n). Los de integración (que requieren PostgreSQL) se separan en tests/integration.
    include: ['packages/**/*.test.ts', 'apps/web/lib/**/*.test.ts', 'apps/web/components/**/*.test.tsx'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.next/**', 'tests/integration/**', 'tests/e2e/**'],
    environment: 'node',
  },
});
