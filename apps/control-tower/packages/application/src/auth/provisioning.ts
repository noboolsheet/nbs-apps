import { asc, eq } from 'drizzle-orm';
import type { Database } from '@ct/db';
import { organizations, organizationMembers } from '@ct/db/schema';

/**
 * Provisión de organización para un usuario recién registrado (MVP self-hosted single-user).
 * Idempotente: si el usuario ya es miembro, no hace nada; si existe alguna organización se une a
 * la primera (así ve los datos existentes), si no, crea una por defecto. Rol OWNER (MVP = una sola
 * usuaria dueña de su servidor; doc 1 §3 / doc 5 §7).
 *
 * Nota: en MVP el registro es ABIERTO (self-hosted tras Tailscale/LAN, un único usuario). En un
 * despliegue público habría que restringir el registro / usar invitaciones (Fase 2). Ver FINDINGS.
 */
export async function ensureUserOrganization(db: Database, userId: string): Promise<void> {
  const already = await db
    .select({ id: organizationMembers.id })
    .from(organizationMembers)
    .where(eq(organizationMembers.userId, userId))
    .limit(1);
  if (already.length) return;

  let org = (
    await db.select().from(organizations).orderBy(asc(organizations.createdAt)).limit(1)
  )[0];

  if (!org) {
    org = (
      await db
        .insert(organizations)
        .values({ name: 'Mi organización', slug: 'default', status: 'ACTIVE' })
        .returning()
    )[0];
  }
  if (!org) return;

  await db
    .insert(organizationMembers)
    .values({ organizationId: org.id, userId, role: 'OWNER' })
    .onConflictDoNothing();
}
