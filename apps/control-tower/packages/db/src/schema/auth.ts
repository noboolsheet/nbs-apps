import { pgTable, uuid, text, timestamp, unique } from 'drizzle-orm/pg-core';
import { pk, createdAt, updatedAt } from './_shared';
import { users } from './organizations';

/**
 * Tablas core de Better Auth (ADR-003). Los nombres de propiedad (camelCase) deben coincidir
 * con los campos que Better Auth espera; los nombres de columna van en snake_case. IDs UUID
 * generados por la DB (advanced.database.generateId = false). `users` es el modelo "user".
 */

// Better Auth "session"
export const sessions = pgTable(
  'sessions',
  {
    id: pk(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    token: text('token').notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [unique('sessions_token_unique').on(t.token)],
);

// Better Auth "account" (email/password guarda el hash en `password`)
export const accounts = pgTable('accounts', {
  id: pk(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
  scope: text('scope'),
  password: text('password'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// Better Auth "verification"
export const verifications = pgTable('verifications', {
  id: pk(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});
