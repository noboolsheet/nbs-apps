import { z } from 'zod';
import { REVIEW_ITEM_STATUS } from '@ct/domain';

/** Esquemas de «Por revisar»: la cola de artículos, vídeos y libros pendientes de leer/ver. */

const title = z.string().trim().min(1).max(300);
const kind = z.string().trim().max(60);
const sector = z.string().trim().max(60);

export const createReviewItemSchema = z.object({
  title,
  kind: kind.optional(),
  url: z.string().trim().url().max(2000).optional(),
  status: z.enum(REVIEW_ITEM_STATUS).default('TO_REVIEW'),
  sector: sector.optional(),
  notes: z.string().trim().max(10000).optional(),
});
export type CreateReviewItemInput = z.infer<typeof createReviewItemSchema>;

export const updateReviewItemSchema = z.object({
  title: title.optional(),
  kind: kind.nullish(),
  url: z.string().trim().url().max(2000).nullish(),
  sector: sector.nullish(),
  notes: z.string().trim().max(10000).nullish(),
});
export type UpdateReviewItemInput = z.infer<typeof updateReviewItemSchema>;

export const updateReviewItemStatusSchema = z.object({ status: z.enum(REVIEW_ITEM_STATUS) });
