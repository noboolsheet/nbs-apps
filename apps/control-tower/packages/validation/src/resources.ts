import { z } from 'zod';
import { RESOURCE_STATUS, RESOURCE_HOSTING } from '@ct/domain';

/** Fase 8 (E-5) — activos por cliente/proyecto. `type` es etiqueta LIBRE (extensible). */

const name = z.string().trim().min(1).max(200);
const typeLabel = z.string().trim().min(1).max(60);
const optionalText = z.string().trim().max(5000).optional();

export const createResourceSchema = z
  .object({
    name,
    type: typeLabel,
    status: z.enum(RESOURCE_STATUS).default('ACTIVE'),
    hosting: z.enum(RESOURCE_HOSTING).optional(),
    clientId: z.string().uuid().optional(),
    projectId: z.string().uuid().optional(),
    url: z.string().trim().url().max(500).optional(),
    provider: z.string().trim().max(120).optional(),
    environment: z.string().trim().max(60).optional(),
    credentialLocation: z.string().trim().max(300).optional(),
    notes: optionalText,
  })
  .refine((v) => v.clientId || v.projectId, {
    message: 'El activo debe pertenecer a un cliente o a un proyecto',
  });
export type CreateResourceInput = z.infer<typeof createResourceSchema>;

export const updateResourceSchema = z.object({
  name: name.optional(),
  type: typeLabel.optional(),
  status: z.enum(RESOURCE_STATUS).optional(),
  hosting: z.enum(RESOURCE_HOSTING).nullish(),
  clientId: z.string().uuid().nullish(),
  projectId: z.string().uuid().nullish(),
  url: z.string().trim().url().max(500).nullish(),
  provider: z.string().trim().max(120).nullish(),
  environment: z.string().trim().max(60).nullish(),
  credentialLocation: z.string().trim().max(300).nullish(),
  notes: optionalText.nullish(),
});
export type UpdateResourceInput = z.infer<typeof updateResourceSchema>;
