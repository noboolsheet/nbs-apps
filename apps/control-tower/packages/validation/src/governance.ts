import { z } from 'zod';
import {
  CAPABILITY_STATUS,
  CAPABILITY_MATURITY,
  SERVICE_STATUS,
  LIFECYCLE_STATUS,
  PRIORITY,
} from '@ct/domain';

/**
 * Esquemas Zod de entrada del módulo Business/Governance (doc 4 §12: validación en el boundary).
 * Los valores de enum vienen de `@ct/domain` (fuente única).
 */

const name = z.string().trim().min(1).max(200);
const optionalText = z.string().trim().max(5000).optional();

export const createStrategicAreaSchema = z.object({
  name,
  description: optionalText,
  status: z.enum(LIFECYCLE_STATUS).default('ACTIVE'),
  sortOrder: z.number().int().min(0).default(0),
});
export type CreateStrategicAreaInput = z.infer<typeof createStrategicAreaSchema>;

export const createGoalSchema = z.object({
  name,
  description: optionalText,
  strategicAreaId: z.string().uuid().optional(),
  parentGoalId: z.string().uuid().optional(),
  status: z.enum(LIFECYCLE_STATUS).default('ACTIVE'),
  priority: z.enum(PRIORITY).default('MEDIUM'),
  targetDate: z.coerce.date().optional(),
});
export type CreateGoalInput = z.infer<typeof createGoalSchema>;

export const createCapabilitySchema = z.object({
  name,
  description: optionalText,
  status: z.enum(CAPABILITY_STATUS).default('PLANNED'),
  maturity: z.enum(CAPABILITY_MATURITY).default('BEGINNER'),
  notes: optionalText,
});
export type CreateCapabilityInput = z.infer<typeof createCapabilitySchema>;

export const updateCapabilityStatusSchema = z.object({ status: z.enum(CAPABILITY_STATUS) });

export const createServiceSchema = z.object({
  name,
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/, 'slug inválido')
    .optional(),
  description: optionalText,
  status: z.enum(SERVICE_STATUS).default('IDEA'),
  serviceType: z.string().trim().max(100).optional(),
  notes: optionalText,
});
export type CreateServiceInput = z.infer<typeof createServiceSchema>;

export const updateServiceStatusSchema = z.object({ status: z.enum(SERVICE_STATUS) });

/** Edición de metadatos del servicio (el estado va por su endpoint `/status`). */
export const updateServiceSchema = z.object({
  name: name.optional(),
  description: optionalText.nullish(),
  serviceType: z.string().trim().max(100).nullish(),
  notes: optionalText.nullish(),
});
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;

export const linkServiceCapabilitySchema = z.object({ capabilityId: z.string().uuid() });

export const updateStrategicAreaSchema = z.object({
  name: name.optional(),
  description: optionalText.nullish(),
  status: z.enum(LIFECYCLE_STATUS).optional(),
  sortOrder: z.number().int().min(0).optional(),
});
export type UpdateStrategicAreaInput = z.infer<typeof updateStrategicAreaSchema>;

export const updateGoalSchema = z.object({
  name: name.optional(),
  description: optionalText.nullish(),
  status: z.enum(LIFECYCLE_STATUS).optional(),
  priority: z.enum(PRIORITY).optional(),
  strategicAreaId: z.string().uuid().nullish(),
  targetDate: z.coerce.date().nullish(),
});
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;

export const updateCapabilitySchema = z.object({
  name: name.optional(),
  description: optionalText.nullish(),
  maturity: z.enum(CAPABILITY_MATURITY).optional(),
  notes: optionalText.nullish(),
});
export type UpdateCapabilityInput = z.infer<typeof updateCapabilitySchema>;
