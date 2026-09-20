import { z } from 'zod';
import {
  KNOWLEDGE_TYPE,
  KNOWLEDGE_ITEM_STATUS,
  DECISION_STATUS,
  ASSET_STATUS,
} from '@ct/domain';

/** Esquemas Zod del módulo Knowledge (Inbox / Items / Decisions / Documents / Assets). */

const title = z.string().trim().min(1).max(300);
const optionalText = z.string().trim().max(20000).optional();
const optionalUrl = z.string().trim().url().max(1000).optional();
// "URLs relacionadas" del knowledge_item: texto libre (varios URLs pegados, estilo NotebookLM); no se valida como URL.
const relatedUrls = z.string().trim().max(20000);
const sectorLabel = z.string().trim().min(1).max(60); // sector/dominio (etiqueta libre, extensible)

// --- Knowledge Inbox ---
export const captureKnowledgeSchema = z.object({
  title: z.string().trim().max(300).optional(),
  rawContent: z.string().trim().min(1).max(20000),
  sourceType: z.string().trim().min(1).max(60).default('MANUAL'),
  sourceUrl: optionalUrl,
  sourceExternalId: z.string().trim().max(200).optional(),
});
export type CaptureKnowledgeInput = z.infer<typeof captureKnowledgeSchema>;

/**
 * Promover una captura a la biblioteca. Todos los campos son opcionales: se editan/guardan en la propia
 * captura desde el panel y el comando los lee de la fila (con fallbacks). El body del POST puede ir vacío.
 */
export const promoteInboxSchema = z.object({
  title: z.string().trim().min(1).max(300).optional(),
  knowledgeType: z.enum(KNOWLEDGE_TYPE).optional(),
  sector: sectorLabel.optional(),
  summary: optionalText,
});
export type PromoteInboxInput = z.infer<typeof promoteInboxSchema>;

/** Edición de una captura desde el panel lateral (solo mientras está NEW). */
export const updateInboxSchema = z.object({
  title: z.string().trim().max(300).nullish(),
  rawContent: z.string().trim().min(1).max(20000).optional(),
  sourceType: z.string().trim().min(1).max(60).optional(),
  knowledgeType: z.enum(KNOWLEDGE_TYPE).nullish(),
  sector: sectorLabel.nullish(),
});
export type UpdateInboxInput = z.infer<typeof updateInboxSchema>;

// --- Knowledge Item ---
export const createKnowledgeItemSchema = z.object({
  title,
  summary: optionalText,
  content: optionalText,
  knowledgeType: z.enum(KNOWLEDGE_TYPE).default('NOTE'),
  sector: sectorLabel.optional(),
  status: z.enum(KNOWLEDGE_ITEM_STATUS).default('DRAFT'),
  sourceType: z.string().trim().min(1).max(60).default('MANUAL'),
  sourceUrl: relatedUrls.optional(),
});
export type CreateKnowledgeItemInput = z.infer<typeof createKnowledgeItemSchema>;

export const updateKnowledgeItemStatusSchema = z.object({ status: z.enum(KNOWLEDGE_ITEM_STATUS) });

export const updateKnowledgeItemSchema = z.object({
  title: title.optional(),
  summary: z.string().trim().max(20000).nullish(),
  content: z.string().trim().max(50000).nullish(),
  knowledgeType: z.enum(KNOWLEDGE_TYPE).optional(),
  sector: sectorLabel.nullish(),
  sourceUrl: relatedUrls.nullish(),
});
export type UpdateKnowledgeItemInput = z.infer<typeof updateKnowledgeItemSchema>;

// --- Decision ---
export const createDecisionSchema = z.object({
  title,
  context: optionalText,
  decision: z.string().trim().min(1).max(20000),
  rationale: optionalText,
  status: z.enum(DECISION_STATUS).default('DRAFT'),
  projectId: z.string().uuid().optional(),
  serviceId: z.string().uuid().optional(),
});
export type CreateDecisionInput = z.infer<typeof createDecisionSchema>;

export const updateDecisionStatusSchema = z.object({ status: z.enum(DECISION_STATUS) });

export const updateDecisionSchema = z.object({
  title: title.optional(),
  context: z.string().trim().max(20000).nullish(),
  decision: z.string().trim().min(1).max(20000).optional(),
  rationale: z.string().trim().max(20000).nullish(),
  projectId: z.string().uuid().nullish(),
  serviceId: z.string().uuid().nullish(),
  // A-2 (ADR-006): esta decisión reemplaza a la indicada (que pasa a SUPERSEDED en la misma transacción).
  supersedesDecisionId: z.string().uuid().nullish(),
});
export type UpdateDecisionInput = z.infer<typeof updateDecisionSchema>;

// --- Document ---
export const createDocumentSchema = z.object({
  name: title,
  documentType: z.string().trim().max(60).optional(),
  mimeType: z.string().trim().max(120).optional(),
  externalUrl: optionalUrl,
  externalProvider: z.string().trim().max(60).optional(),
  externalId: z.string().trim().max(200).optional(),
  status: z.string().trim().min(1).max(40).default('ACTIVE'),
  projectId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
});
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;

// --- Asset ---
export const createAssetSchema = z.object({
  name: title,
  assetType: z.string().trim().min(1).max(60),
  description: optionalText,
  status: z.enum(ASSET_STATUS).default('DRAFT'),
  version: z.string().trim().max(40).optional(),
  externalUrl: optionalUrl,
  repositoryUrl: optionalUrl,
});
export type CreateAssetInput = z.infer<typeof createAssetSchema>;

export const updateAssetStatusSchema = z.object({ status: z.enum(ASSET_STATUS) });

export const updateAssetSchema = z.object({
  name: title.optional(),
  assetType: z.string().trim().min(1).max(60).optional(),
  description: z.string().trim().max(20000).nullish(),
  version: z.string().trim().max(40).nullish(),
  externalUrl: z.string().trim().url().max(1000).nullish(),
  repositoryUrl: z.string().trim().url().max(1000).nullish(),
});
export type UpdateAssetInput = z.infer<typeof updateAssetSchema>;
