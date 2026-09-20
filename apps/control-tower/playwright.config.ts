import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright e2e (doc 4 §23). Los journeys críticos (old_9 §25) se prueban contra la app real.
 * Requiere navegadores: `pnpm exec playwright install chromium` (descarga; entorno con red).
 * La app se levanta con `next start` (build previo) apuntando a la DB de desarrollo.
 */
const PORT = 3210;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `pnpm --filter @ct/web start -- -p ${PORT} -H 127.0.0.1`,
    url: `http://127.0.0.1:${PORT}/api/health`,
    reuseExistingServer: true,
    timeout: 60_000,
    env: {
      HOSTNAME: '127.0.0.1',
      PORT: String(PORT),
      DATABASE_URL:
        process.env.DATABASE_URL ?? 'postgres://control_tower:control_tower@localhost:5432/control_tower',
      BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? 'e2e-secret-0123456789abcdef0123456789',
      BETTER_AUTH_URL: `http://127.0.0.1:${PORT}`,
    },
  },
});
