import { index, pgTable, text, uuid, varchar, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createdAt, pk, updatedAt } from './_shared';
import { organizations } from './organizations';
import { users } from './organizations';

/**
 * E-15 — **notas por registro**: texto libre que la persona escribe sobre CUALQUIER registro
 * («hablado con el cliente, mueve la entrega a marzo»).
 *
 * Es **polimórfica** como `change_events` (`entity_type` + `entity_id`, sin FK): una nota puede colgar de
 * cualquier entidad y no queremos 20 columnas nullables ni 20 tablas. La contrapartida es que la integridad
 * la sostiene el código: al borrar DEFINITIVAMENTE un registro hay que llevarse sus notas
 * (`deleteRecordTraces` en `maintenance/archive.ts`, un único sitio para los tres caminos de borrado duro).
 *
 * Qué NO es: no es el historial (`change_events` responde «qué cambió»; la nota, «qué hablamos») y **no se
 * espeja a Notion** (decisión del owner, 2026-09-26): es trabajo interno y el cuerpo de la página de Notion
 * ya es suyo para escribir. Por eso `note` no está en `NOTION_MIRRORED`.
 */
export const notes = pgTable(
  'notes',
  {
    id: pk(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    entityType: varchar('entity_type').notNull(),
    entityId: uuid('entity_id').notNull(),
    body: text('body').notNull(),
    // Autor. Nullable a propósito: si algún día se borra un usuario, la nota sobrevive sin autor en vez de
    // bloquear el borrado o desaparecer.
    createdByUserId: uuid('created_by_user_id').references(() => users.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('notes_entity_idx').on(t.entityType, t.entityId),
    index('notes_org_idx').on(t.organizationId),
    // Una nota vacía no dice nada y ensucia el bloque: se rechaza en la base, no sólo en el Zod.
    check('notes_body_not_empty', sql`length(btrim(${t.body})) > 0`),
  ],
);
