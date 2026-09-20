import type { Config } from 'drizzle-kit';

/**
 * Config de drizzle-kit. Las migraciones se generan a ./drizzle a partir del schema
 * en M02. `dialect: postgresql` (PostgreSQL 18, doc 4 §7).
 */
export default {
  schema: './src/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://control_tower:control_tower@localhost:5432/control_tower',
  },
  strict: true,
  verbose: true,
} satisfies Config;
