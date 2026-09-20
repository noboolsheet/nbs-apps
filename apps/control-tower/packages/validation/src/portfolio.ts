import { z } from 'zod';
import { PORTFOLIO_ITEM_STATUS, PORTFOLIO_ITEM_VISIBILITY } from '@ct/domain';

/** Esquemas Zod del módulo Portfolio (ADR-001). Catálogo simple, no CMS. */

// Tipos de portfolio item (dominio §5.32); conjunto convencional validado en app.
export const PORTFOLIO_ITEM_TYPE = [
  'Project',
  'CaseStudy',
  'Demo',
  'Template',
  'Product',
  'Experiment',
] as const;

export const createPortfolioItemSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).optional(),
  type: z.enum(PORTFOLIO_ITEM_TYPE).default('Project'),
  status: z.enum(PORTFOLIO_ITEM_STATUS).default('CANDIDATE'),
  visibility: z.enum(PORTFOLIO_ITEM_VISIBILITY).default('INTERNAL'),
  projectId: z.string().uuid().optional(),
  assetId: z.string().uuid().optional(),
  externalUrl: z.string().trim().url().max(1000).optional(),
});
export type CreatePortfolioItemInput = z.infer<typeof createPortfolioItemSchema>;

export const updatePortfolioItemStatusSchema = z.object({ status: z.enum(PORTFOLIO_ITEM_STATUS) });
export const updatePortfolioItemVisibilitySchema = z.object({
  visibility: z.enum(PORTFOLIO_ITEM_VISIBILITY),
});

/** Edición de metadatos del item (estado y visibilidad van por sus endpoints propios). */
export const updatePortfolioItemSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(5000).nullish(),
  type: z.enum(PORTFOLIO_ITEM_TYPE).optional(),
  projectId: z.string().uuid().nullish(),
  assetId: z.string().uuid().nullish(),
  externalUrl: z.string().trim().url().max(1000).nullish(),
});
export type UpdatePortfolioItemInput = z.infer<typeof updatePortfolioItemSchema>;
