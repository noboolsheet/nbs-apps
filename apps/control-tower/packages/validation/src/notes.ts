import { z } from 'zod';

/**
 * E-15 — notas por registro. El cuerpo se recorta y se exige no vacío (la base tiene el mismo CHECK):
 * una nota en blanco no dice nada y ensucia el bloque del panel.
 *
 * `entityType` se valida aquí sólo como forma; la lista de entidades que admiten notas es `NOTE_TARGETS`
 * (capa de aplicación), igual que `ARCHIVABLE` es la allowlist del archivado.
 */
const body = z.string().trim().min(1).max(10000);

export const createNoteSchema = z.object({
  entityType: z.string().trim().min(1).max(60),
  entityId: z.string().uuid(),
  body,
});
export type CreateNoteInput = z.infer<typeof createNoteSchema>;

export const updateNoteSchema = z.object({ body });
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
