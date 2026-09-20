import { eq } from 'drizzle-orm';
import type { Database } from '@ct/db';
import { users } from '@ct/db/schema';
import { updateProfileSchema } from '@ct/validation';
import type { OrgContext } from '../auth/index';
import { recordAudit, recordFieldChanges } from '../audit/index';
import { mapDbError, notFound } from '../errors';

/**
 * Edición del perfil propio: **sólo el nombre**. No lleva `requireCan` porque cada usuario edita SU cuenta — el
 * registro afectado es siempre `ctx.userId`, así que no hay forma de tocar la de nadie más.
 *
 * El **email no se toca aquí** (decisión del owner, 2026-09-01): es la credencial de acceso y cambiarlo sin verificar
 * el nuevo buzón ni pedir la contraseña convierte una sesión robada en una cuenta robada. Irá con su propio flujo,
 * junto al cambio de contraseña (E-9).
 */
export async function updateProfile(db: Database, ctx: OrgContext, input: unknown) {
  const data = updateProfileSchema.parse(input);
  const [current] = await db.select().from(users).where(eq(users.id, ctx.userId));
  if (!current) throw notFound('user');

  const set = { ...data, updatedAt: new Date() };
  try {
    return await db.transaction(async (tx) => {
      const [row] = await tx.update(users).set(set).where(eq(users.id, ctx.userId)).returning();
      await recordFieldChanges(tx, ctx, { entityType: 'user', entityId: ctx.userId, before: current, changed: data });
      await recordAudit(tx, ctx, { action: 'UPDATE', entityType: 'user', entityId: ctx.userId });
      return { id: row!.id, name: row!.name, email: row!.email, image: row!.image };
    });
  } catch (e) {
    throw mapDbError(e, { entity: 'user' });
  }
}
