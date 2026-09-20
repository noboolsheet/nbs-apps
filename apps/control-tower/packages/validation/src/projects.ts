import { z } from 'zod';
import {
  PROJECT_STATUS,
  PROJECT_TYPE,
  TASK_STATUS,
  DELIVERABLE_STATUS,
  PRIORITY,
} from '@ct/domain';

/** Esquemas Zod del módulo Projects (Project / Phase / Task / Deliverable). */

const name = z.string().trim().min(1).max(200);
const optionalText = z.string().trim().max(5000).optional();

export const createProjectSchema = z.object({
  name,
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/, 'slug inválido')
    .optional(),
  description: optionalText,
  clientId: z.string().uuid().optional(),
  contactId: z.string().uuid().optional(),
  opportunityId: z.string().uuid().optional(),
  serviceId: z.string().uuid().optional(),
  status: z.enum(PROJECT_STATUS).default('PLANNED'),
  // A-1 (ADR-005): CLIENT exige clientId — lo valida el comando (necesita mirar la fila existente en update).
  type: z.enum(PROJECT_TYPE).default('INTERNAL'),
  priority: z.enum(PRIORITY).default('MEDIUM'),
  startDate: z.coerce.date().optional(),
  targetDate: z.coerce.date().optional(),
  personal: z.boolean().optional(), // proyecto "personal" (del owner para sí mismo)
});

/** Edición de metadatos del proyecto (el estado va por su endpoint `/status`). */
export const updateProjectSchema = z.object({
  name: name.optional(),
  description: optionalText.nullish(),
  clientId: z.string().uuid().nullish(),
  contactId: z.string().uuid().nullish(),
  opportunityId: z.string().uuid().nullish(),
  serviceId: z.string().uuid().nullish(),
  type: z.enum(PROJECT_TYPE).optional(),
  priority: z.enum(PRIORITY).optional(),
  startDate: z.coerce.date().nullish(),
  targetDate: z.coerce.date().nullish(),
  personal: z.boolean().optional(), // proyecto "personal" (del owner para sí mismo)
});
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectStatusSchema = z.object({ status: z.enum(PROJECT_STATUS) });

/** Estados de una fase de proyecto (lista libre definida por el owner; columna varchar sin CHECK, curada en la UI). */
export const PROJECT_PHASE_STATUS = ['PLANNED', 'ACTIVE', 'COMPLETED'] as const;

export const createProjectPhaseSchema = z.object({
  name,
  description: optionalText,
  status: z.enum(PROJECT_PHASE_STATUS).default('ACTIVE'),
  sortOrder: z.number().int().min(0).optional(), // si se omite, el comando lo autoasigna (última + 1)
});
export type CreateProjectPhaseInput = z.infer<typeof createProjectPhaseSchema>;

/** Edición de una fase (nombre/descr/estado/orden). El "es la actual" va por su propio endpoint. */
export const updateProjectPhaseSchema = z.object({
  name: name.optional(),
  description: optionalText.nullish(),
  status: z.enum(PROJECT_PHASE_STATUS).optional(),
  sortOrder: z.number().int().min(0).optional(),
});
export type UpdateProjectPhaseInput = z.infer<typeof updateProjectPhaseSchema>;

/** Fijar/limpiar la fase actual del proyecto (phaseId null = quitar). */
export const setCurrentPhaseSchema = z.object({ phaseId: z.string().uuid().nullable() });

export const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(300),
  description: optionalText,
  projectId: z.string().uuid().optional(),
  opportunityId: z.string().uuid().optional(), // tarea de preventa (excluyente con projectId/personal; lo garantiza el comando)
  parentTaskId: z.string().uuid().optional(),
  status: z.enum(TASK_STATUS).default('TODO'),
  priority: z.enum(PRIORITY).default('MEDIUM'),
  assigneeUserId: z.string().uuid().optional(),
  dueDate: z.coerce.date().optional(),
  personal: z.boolean().optional(), // marca "tarea personal" (excluyente con projectId; lo garantiza el comando)
});
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskStatusSchema = z.object({ status: z.enum(TASK_STATUS) });

export const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(300).optional(),
  description: optionalText.nullish(),
  priority: z.enum(PRIORITY).optional(),
  dueDate: z.coerce.date().nullish(),
  projectId: z.string().uuid().nullish(), // reasignar (o desasociar) el proyecto de la tarea
  opportunityId: z.string().uuid().nullish(), // reasignar (o desasociar) la oportunidad de la tarea
  personal: z.boolean().optional(), // marca "tarea personal" (excluyente con projectId/opportunityId)
});
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export const createDeliverableSchema = z.object({
  name,
  description: optionalText,
  status: z.enum(DELIVERABLE_STATUS).default('PLANNED'),
  dueDate: z.coerce.date().optional(),
  externalUrl: z.string().trim().url().max(500).optional(),
});
export type CreateDeliverableInput = z.infer<typeof createDeliverableSchema>;

export const updateDeliverableStatusSchema = z.object({ status: z.enum(DELIVERABLE_STATUS) });

export const updateDeliverableSchema = z.object({
  name: name.optional(),
  description: optionalText.nullish(),
  dueDate: z.coerce.date().nullish(),
  externalUrl: z.string().trim().url().max(500).nullish(),
});
export type UpdateDeliverableInput = z.infer<typeof updateDeliverableSchema>;
