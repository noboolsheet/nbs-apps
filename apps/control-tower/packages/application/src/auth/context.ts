import { asc, eq } from 'drizzle-orm';
import type { Database } from '@ct/db';
import { organizationMembers } from '@ct/db/schema';
import { AppError } from '@ct/shared';
import { isRole, type Role } from './policies';

/**
 * Contexto de organización del usuario autenticado. En MVP (single-org) se resuelve la
 * primera membresía; el diseño deja sitio para "org activa" en multi-org (ERRATA-012).
 */
export interface OrgContext {
  userId: string;
  organizationId: string;
  role: Role;
}

/** Resuelve el contexto de organización a partir del user autenticado. `null` si no es miembro. */
export async function getActiveOrgContext(
  db: Database,
  userId: string,
): Promise<OrgContext | null> {
  const rows = await db
    .select({ organizationId: organizationMembers.organizationId, role: organizationMembers.role })
    .from(organizationMembers)
    .where(eq(organizationMembers.userId, userId))
    .orderBy(asc(organizationMembers.createdAt))
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  if (!isRole(row.role)) {
    throw new AppError({
      code: 'INVALID_ROLE',
      kind: 'INTERNAL',
      message: `Rol desconocido en organization_members: ${row.role}`,
    });
  }
  return { userId, organizationId: row.organizationId, role: row.role };
}

/** Igual que getActiveOrgContext pero lanza AUTHENTICATION/AUTHORIZATION en vez de devolver null. */
export async function requireOrgContext(db: Database, userId: string): Promise<OrgContext> {
  const ctx = await getActiveOrgContext(db, userId);
  if (!ctx) {
    throw new AppError({
      code: 'NO_ORG_MEMBERSHIP',
      kind: 'AUTHORIZATION',
      message: 'El usuario no pertenece a ninguna organización',
    });
  }
  return ctx;
}
