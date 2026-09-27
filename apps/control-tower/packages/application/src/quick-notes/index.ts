import { and, desc, eq } from 'drizzle-orm';
import type { Database } from '@ct/db';
import { quickNotes } from '@ct/db/schema';
import { parseQuickNote, type QuickNoteDestination } from '@ct/domain';
import { createQuickNoteSchema, updateQuickNoteSchema, fileQuickNoteSchema } from '@ct/validation';
import { requireCan, orgEq, type OrgContext } from '../auth/index';
import { recordAudit } from '../audit/index';
import { mapDbError, notFound } from '../errors';
import { createTask } from '../projects/index';
import { createDecision, createKnowledgeItem } from '../knowledge/index';
import { createReviewItem } from '../review/index';

/**
 * **Bloc de notas rápidas** (M44, owner 2026-09-27): el cajón de paso del Inicio para una idea que todavía no sabes
 * dónde va. Dos salidas y ninguna más: **darle un destino** (y se convierte en el registro que toque) o **descartarla**.
 * En los dos casos la nota se borra — el rastro queda en `audit_logs`—, así que la misma idea no vive en dos sitios.
 */

export type QuickNoteRow = typeof quickNotes.$inferSelect;

/** Las notas del bloc, la más reciente arriba. Sin paginar: es un pósit, no un archivo (si crece, es que hay que vaciarlo). */
export function listQuickNotes(db: Database, ctx: OrgContext): Promise<QuickNoteRow[]> {
  return db
    .select()
    .from(quickNotes)
    .where(orgEq(quickNotes.organizationId, ctx))
    .orderBy(desc(quickNotes.createdAt))
    .limit(50);
}

export async function createQuickNote(db: Database, ctx: OrgContext, input: unknown): Promise<QuickNoteRow> {
  requireCan(ctx.role, 'write');
  const { body } = createQuickNoteSchema.parse(input);
  try {
    const [row] = await db
      .insert(quickNotes)
      .values({ organizationId: ctx.organizationId, body, createdByUserId: actorId(ctx) })
      .returning();
    await recordAudit(db, ctx, { action: 'CREATE', entityType: 'quick_note', entityId: row!.id });
    return row!;
  } catch (e) {
    throw mapDbError(e, { entity: 'quick_note' });
  }
}

export async function updateQuickNote(
  db: Database,
  ctx: OrgContext,
  id: string,
  input: unknown,
): Promise<QuickNoteRow> {
  requireCan(ctx.role, 'write');
  const { body } = updateQuickNoteSchema.parse(input);
  const [row] = await db
    .update(quickNotes)
    .set({ body, updatedAt: new Date() })
    .where(and(eq(quickNotes.id, id), orgEq(quickNotes.organizationId, ctx)))
    .returning();
  if (!row) throw notFound('quick_note');
  await recordAudit(db, ctx, { action: 'UPDATE', entityType: 'quick_note', entityId: id });
  return row;
}

/** Descartar = borrar. Una nota descartada no se guarda «por si acaso»: el bloc se llenaría de ruido. */
export async function deleteQuickNote(db: Database, ctx: OrgContext, id: string): Promise<void> {
  requireCan(ctx.role, 'write');
  const [row] = await db
    .delete(quickNotes)
    .where(and(eq(quickNotes.id, id), orgEq(quickNotes.organizationId, ctx)))
    .returning({ id: quickNotes.id, body: quickNotes.body });
  if (!row) throw notFound('quick_note');
  // El cuerpo va al audit: es lo único que queda de la nota, y sin él «descartó una nota» no dice nada.
  await recordAudit(db, ctx, {
    action: 'DELETE',
    entityType: 'quick_note',
    entityId: id,
    metadata: { reason: 'discarded', body: row.body },
  });
}

export interface FiledQuickNote {
  destination: QuickNoteDestination;
  entityId: string;
  title: string;
}

/**
 * Le da a la nota su **destino final**: crea el registro correspondiente con el texto de la nota y borra la nota.
 *
 * El reparto del texto lo decide el dominio (`parseQuickNote`): primera línea → título, el resto → el campo largo de
 * la entidad, y si la nota trae una URL se aprovecha en «Por revisar», que es donde un enlace pegado tiene sentido.
 *
 * **No va en una transacción, y el orden es a propósito:** primero se crea el registro, luego se borra la nota. Se
 * llama a los comandos de creación de verdad (`createTask`, `createDecision`…) para heredar sus reglas, sus valores
 * por defecto, su auditoría y su empuje a Notion, y esos comandos abren su propia transacción, así que no se pueden
 * meter dentro de otra. El peor caso de este orden es que la creación funcione y el borrado falle: te queda la nota
 * repetida en el bloc y la borras a mano. Al revés —nota borrada y registro sin crear— sería **perder la idea**, que
 * es lo único que este cajón tiene que garantizar.
 */
export async function fileQuickNote(
  db: Database,
  ctx: OrgContext,
  id: string,
  input: unknown,
): Promise<FiledQuickNote> {
  requireCan(ctx.role, 'write');
  const { destination } = fileQuickNoteSchema.parse(input);
  const [note] = await db
    .select()
    .from(quickNotes)
    .where(and(eq(quickNotes.id, id), orgEq(quickNotes.organizationId, ctx)));
  if (!note) throw notFound('quick_note');
  const { title, rest, url } = parseQuickNote(note.body);

  let entityId: string;
  try {
    switch (destination) {
      case 'task':
        // Tarea PERSONAL: una idea suelta no pertenece a ningún proyecto (si lo fuera, se crea desde el proyecto).
        entityId = (await createTask(db, ctx, { title, description: rest ?? undefined, personal: true })).id;
        break;
      case 'decision':
        // `decision` es obligatorio en el esquema: si la nota era de una línea, esa línea ES la decisión.
        entityId = (await createDecision(db, ctx, { title, decision: rest ?? title })).id;
        break;
      case 'knowledge_item':
        entityId = (await createKnowledgeItem(db, ctx, { title, summary: rest ?? undefined })).id;
        break;
      case 'review_item':
        entityId = (await createReviewItem(db, ctx, { title, url: url ?? undefined, notes: rest ?? undefined })).id;
        break;
    }
  } catch (e) {
    // La nota se queda donde está: el destino no se pudo crear y la idea no se pierde.
    throw mapDbError(e, { entity: destination });
  }

  await db.delete(quickNotes).where(and(eq(quickNotes.id, id), orgEq(quickNotes.organizationId, ctx)));
  // `targetType`/`targetId` son los que lee la Actividad reciente para enlazar al registro del que habla la entrada.
  await recordAudit(db, ctx, {
    action: 'DELETE',
    entityType: 'quick_note',
    entityId: id,
    metadata: { reason: 'filed', destination, targetType: destination, targetId: entityId },
  });
  return { destination, entityId, title };
}

/** El id del usuario, o null si el actor es el sistema (`userId = 'system'` no es un uuid). */
function actorId(ctx: OrgContext): string | null {
  return /^[0-9a-f-]{36}$/i.test(ctx.userId) ? ctx.userId : null;
}
