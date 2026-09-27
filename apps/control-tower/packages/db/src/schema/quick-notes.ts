import { index, pgTable, text, uuid, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createdAt, pk, updatedAt } from './_shared';
import { organizations, users } from './organizations';

/**
 * M44 — **bloc de notas rápidas** del Inicio (owner 2026-09-27): «ideas que me vengan a la mente y no sepa qué hacer
 * con ellas; anotarlas aquí y luego decidir si persistirlas en alguna sección en específico».
 *
 * Es un cajón de **paso**. Una nota vive aquí hasta que se le da un **destino** (tarea, decisión, conocimiento o «por
 * revisar») o se **descarta**; en los dos casos la fila se borra y el rastro queda en `audit_logs` —con el destino al
 * que fue—, así que no hay dos copias de la misma idea.
 *
 * Qué NO es: no es `notes` (ésas cuelgan de un registro concreto) ni la **bandeja de conocimiento** (contenido
 * capturado, con estados, canales por webhook y promoción a la biblioteca). El owner eligió tenerlo aparte después de
 * ver las dos opciones. Y no lleva `archived_at` a propósito: nada que se resuelve borrándose necesita archivarse, y
 * la columna lo metería en el circuito de «Archivados».
 */
export const quickNotes = pgTable(
  'quick_notes',
  {
    id: pk(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    body: text('body').notNull(),
    // Autor. Nullable como en `notes`: si un día se borra un usuario, la nota sobrevive sin autor.
    createdByUserId: uuid('created_by_user_id').references(() => users.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('quick_notes_org_idx').on(t.organizationId, t.createdAt),
    check('quick_notes_body_not_empty', sql`length(btrim(${t.body})) > 0`),
  ],
);
