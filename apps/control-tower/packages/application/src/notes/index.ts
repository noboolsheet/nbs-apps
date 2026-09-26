import { and, desc, eq, inArray } from 'drizzle-orm';
import type { Database, DbOrTx } from '@ct/db';
import { notes, users } from '@ct/db/schema';
import { createNoteSchema, updateNoteSchema } from '@ct/validation';
import { AppError } from '@ct/shared';
import { requireCan, can, orgEq, type OrgContext } from '../auth/index';
import { recordAudit } from '../audit/index';
import { mapDbError, notFound } from '../errors';

/**
 * E-15 — **notas por registro**. Responde a «qué hablamos», que es lo que el historial (`change_events`,
 * «qué cambió») no puede responder. Hasta ahora el único sitio para eso era el `description` de la propia
 * entidad, que se sobrescribe.
 *
 * Decisiones (owner, 2026-09-26): lista plana (sin hilos ni respuestas), **no se espeja a Notion** —`note` no
 * está en `NOTION_MIRRORED`, así que `recordAudit` no encola ningún push— y valen para **todas** las entidades
 * con panel, no una por una.
 */

/**
 * Entidades que admiten notas. Allowlist explícita, con el mismo papel que `ARCHIVABLE` en el archivado: la
 * tabla es polimórfica y sin esto un `entityType` mal escrito crearía notas que **no se ven desde ninguna
 * pantalla**, sin error. Son los `entity` del registro del panel (`apps/web/lib/record-registry.ts`), con el
 * nombre canónico de auditoría (`learning_item`, no `learning`).
 */
export const NOTE_TARGETS: readonly string[] = [
  'client', 'contact', 'opportunity',
  'project', 'project_phase', 'task', 'deliverable',
  'strategic_area', 'goal', 'capability', 'service',
  'knowledge_item', 'knowledge_inbox', 'decision', 'document', 'asset', 'learning_item', 'review_item',
  'portfolio_item', 'resource', 'payment',
];

function assertTarget(entityType: string): void {
  if (!NOTE_TARGETS.includes(entityType)) {
    throw new AppError({
      code: 'NOTE_TARGET_NOT_SUPPORTED',
      kind: 'VALIDATION',
      message: `No se pueden añadir notas a «${entityType}»`,
    });
  }
}

/** La nota es de quien la escribió: sólo su autor (o un ADMIN+) puede editarla o borrarla. */
function assertCanWriteNote(ctx: OrgContext, authorId: string | null): void {
  if (authorId && authorId !== ctx.userId && !can(ctx.role, 'delete')) {
    throw new AppError({
      code: 'NOTE_NOT_YOURS',
      kind: 'AUTHORIZATION',
      message: 'Esta nota la escribió otra persona: no se puede editar ni borrar.',
    });
  }
}

export type NoteRow = {
  id: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
  authorId: string | null;
  authorName: string | null;
  mine: boolean;
};

/** Notas de UN registro, la más reciente arriba. El autor se resuelve aquí para no pedirlo aparte. */
export async function listNotes(
  db: Database,
  ctx: OrgContext,
  entityType: string,
  entityId: string,
  limit = 50,
): Promise<NoteRow[]> {
  assertTarget(entityType);
  const rows = await db
    .select({
      id: notes.id,
      body: notes.body,
      createdAt: notes.createdAt,
      updatedAt: notes.updatedAt,
      authorId: notes.createdByUserId,
      authorName: users.name,
    })
    .from(notes)
    .leftJoin(users, eq(users.id, notes.createdByUserId))
    .where(
      and(
        orgEq(notes.organizationId, ctx),
        eq(notes.entityType, entityType),
        eq(notes.entityId, entityId),
      ),
    )
    .orderBy(desc(notes.createdAt))
    .limit(limit);
  return rows.map((r) => ({ ...r, mine: r.authorId === ctx.userId }));
}

export async function createNote(db: Database, ctx: OrgContext, input: unknown): Promise<NoteRow> {
  requireCan(ctx.role, 'write');
  const data = createNoteSchema.parse(input);
  assertTarget(data.entityType);
  try {
    return await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(notes)
        .values({
          organizationId: ctx.organizationId,
          entityType: data.entityType,
          entityId: data.entityId,
          body: data.body,
          createdByUserId: ctx.userId,
        })
        .returning();
      // La auditoría guarda A QUÉ registro pertenece la nota: sin eso, el feed de actividad diría sólo
      // "creó una nota" y no se podría llegar al registro desde ahí.
      await recordAudit(tx, ctx, {
        action: 'CREATE',
        entityType: 'note',
        entityId: row!.id,
        metadata: { targetType: data.entityType, targetId: data.entityId },
      });
      return { ...row!, authorId: row!.createdByUserId, authorName: null, mine: true };
    });
  } catch (e) {
    throw mapDbError(e, { entity: 'note' });
  }
}

export async function updateNote(db: Database, ctx: OrgContext, id: string, input: unknown): Promise<NoteRow> {
  requireCan(ctx.role, 'write');
  const data = updateNoteSchema.parse(input);
  const current = await loadNote(db, ctx, id);
  assertCanWriteNote(ctx, current.createdByUserId);
  try {
    return await db.transaction(async (tx) => {
      const [row] = await tx
        .update(notes)
        .set({ body: data.body, updatedAt: new Date() })
        .where(and(eq(notes.id, id), orgEq(notes.organizationId, ctx)))
        .returning();
      await recordAudit(tx, ctx, {
        action: 'UPDATE',
        entityType: 'note',
        entityId: id,
        metadata: { targetType: current.entityType, targetId: current.entityId },
      });
      return { ...row!, authorId: row!.createdByUserId, authorName: null, mine: true };
    });
  } catch (e) {
    throw mapDbError(e, { entity: 'note' });
  }
}

/**
 * Borrado DEFINITIVO (una nota no se archiva: no es un registro de la aplicación, y «Archivados» con notas
 * dentro sería ruido). Por eso `note` no entra en `ARCHIVABLE` ni en `PURGE_ORDER`.
 */
export async function deleteNote(db: Database, ctx: OrgContext, id: string): Promise<{ deleted: number }> {
  requireCan(ctx.role, 'write');
  const current = await loadNote(db, ctx, id);
  assertCanWriteNote(ctx, current.createdByUserId);
  try {
    return await db.transaction(async (tx) => {
      await tx.delete(notes).where(and(eq(notes.id, id), orgEq(notes.organizationId, ctx)));
      await recordAudit(tx, ctx, {
        action: 'DELETE',
        entityType: 'note',
        entityId: id,
        metadata: { targetType: current.entityType, targetId: current.entityId },
      });
      return { deleted: 1 };
    });
  } catch (e) {
    throw mapDbError(e, { entity: 'note' });
  }
}

/**
 * Notas de registros que se acaban de borrar DEFINITIVAMENTE. La tabla es polimórfica (no hay FK que las
 * arrastre), así que esto tiene que llamarse desde **todos** los caminos de borrado duro; para no tener que
 * acordarse tres veces, vive dentro de `deleteRecordTraces` (`maintenance/archive.ts`), que es el único sitio
 * que los tres conocen. Sin esto, la nota queda huérfana para siempre y sin pantalla desde la que verla.
 */
export async function deleteNotesFor(
  db: DbOrTx,
  ctx: OrgContext,
  entityType: string,
  ids: string[],
): Promise<void> {
  if (ids.length === 0) return;
  await db
    .delete(notes)
    .where(
      and(
        orgEq(notes.organizationId, ctx),
        eq(notes.entityType, entityType),
        inArray(notes.entityId, ids),
      ),
    );
}

async function loadNote(db: Database, ctx: OrgContext, id: string) {
  const [row] = await db
    .select()
    .from(notes)
    .where(and(eq(notes.id, id), orgEq(notes.organizationId, ctx)));
  if (!row) throw notFound('note');
  return row;
}
