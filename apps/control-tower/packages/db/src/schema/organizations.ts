import { pgTable, uuid, varchar, text, boolean, jsonb, unique } from 'drizzle-orm/pg-core';
import { pk, createdAt, updatedAt, archivedAt, inValues } from './_shared';
import { MEMBER_ROLES } from './enums';

// doc 5 §5 — organizations
// `settings` (jsonb, aditivo Fase 3 / migración 0003): ajustes de organización que el modelo físico
// congelado no contemplaba (timezone, moneda por defecto…). No rompe nada: nullable, sin backfill.
export const organizations = pgTable(
  'organizations',
  {
    id: pk(),
    name: varchar('name').notNull(),
    slug: varchar('slug').notNull(),
    status: varchar('status').notNull(),
    settings: jsonb('settings'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    archivedAt: archivedAt(),
  },
  (t) => [unique('organizations_slug_unique').on(t.slug)],
);

// doc 5 §6 — users (credenciales las gestiona Better Auth; CT no duplica passwords).
// Adaptada a Better Auth (ADR-003): + email_verified, image, UNIQUE(email).
// Better Auth "user" model = esta tabla; los nombres de propiedad camelCase que Better Auth
// espera (emailVerified, image, createdAt, updatedAt) se mantienen aquí.
export const users = pgTable(
  'users',
  {
    id: pk(),
    name: varchar('name').notNull(),
    email: varchar('email').notNull(),
    emailVerified: boolean('email_verified').notNull().default(false),
    image: text('image'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    archivedAt: archivedAt(),
  },
  (t) => [unique('users_email_unique').on(t.email)],
);

// doc 5 §7 — organization_members
export const organizationMembers = pgTable(
  'organization_members',
  {
    id: pk(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    role: varchar('role').notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique('organization_members_org_user_unique').on(t.organizationId, t.userId),
    inValues('organization_members_role_check', t.role, MEMBER_ROLES),
  ],
);
