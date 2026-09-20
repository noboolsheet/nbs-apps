import { z } from 'zod';
import { LEARNING_STATUS } from '@ct/domain';

/** Learning Path — tracking de aprendizaje. `kind` y `sector` son etiquetas LIBRES (extensibles). */

const title = z.string().trim().min(1).max(300);
const kind = z.string().trim().min(1).max(60);
const sectorLabel = z.string().trim().min(1).max(60);
const url = z.string().trim().url().max(1000);
const progress = z.number().int().min(0).max(100);
const notes = z.string().trim().max(20000);

export const createLearningItemSchema = z.object({
  title,
  kind,
  status: z.enum(LEARNING_STATUS).default('PLANNED'),
  sector: sectorLabel.optional(),
  url: url.optional(),
  progress: progress.optional(),
  notes: notes.optional(),
});
export type CreateLearningItemInput = z.infer<typeof createLearningItemSchema>;

export const updateLearningItemSchema = z.object({
  title: title.optional(),
  kind: kind.optional(),
  status: z.enum(LEARNING_STATUS).optional(),
  sector: sectorLabel.nullish(),
  url: url.nullish(),
  progress: progress.nullish(),
  notes: notes.nullish(),
});
export type UpdateLearningItemInput = z.infer<typeof updateLearningItemSchema>;
