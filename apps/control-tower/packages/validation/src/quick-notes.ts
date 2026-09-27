import { z } from 'zod';
import { QUICK_NOTE_DESTINATIONS } from '@ct/domain';

/** M44 — bloc de notas rápidas del Inicio. */

const body = z.string().trim().min(1, 'La nota está vacía').max(5000);

export const createQuickNoteSchema = z.object({ body });
export const updateQuickNoteSchema = z.object({ body });
/** A dónde se manda la nota. El conjunto lo define el dominio (`QUICK_NOTE_DESTINATIONS`). */
export const fileQuickNoteSchema = z.object({ destination: z.enum(QUICK_NOTE_DESTINATIONS) });

export type CreateQuickNoteInput = z.infer<typeof createQuickNoteSchema>;
