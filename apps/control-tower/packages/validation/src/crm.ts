import { z } from 'zod';
import { OPPORTUNITY_STAGE, LIFECYCLE_STATUS, CLIENT_STATUS } from '@ct/domain';

/** Esquemas Zod del módulo CRM (Clients / Contacts / Opportunities). */

const name = z.string().trim().min(1).max(200);
const optionalText = z.string().trim().max(5000).optional();

export const createClientSchema = z.object({
  name,
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/, 'slug inválido')
    .optional(),
  status: z.enum(CLIENT_STATUS).default('ACTIVE'),
  industry: z.string().trim().max(120).optional(),
  websiteUrl: z.string().trim().url().max(500).optional(),
  notes: optionalText,
});
export type CreateClientInput = z.infer<typeof createClientSchema>;

export const createContactSchema = z
  .object({
    clientId: z.string().uuid().optional(),
    firstName: z.string().trim().max(120).optional(),
    lastName: z.string().trim().max(120).optional(),
    email: z.string().trim().email().max(200).optional(),
    phone: z.string().trim().max(50).optional(),
    jobTitle: z.string().trim().max(120).optional(),
    status: z.enum(LIFECYCLE_STATUS).default('ACTIVE'),
    notes: optionalText,
  })
  .refine((v) => v.firstName || v.lastName || v.email, {
    message: 'Se requiere al menos nombre, apellido o email',
  });
export type CreateContactInput = z.infer<typeof createContactSchema>;

export const createOpportunitySchema = z.object({
  name,
  clientId: z.string().uuid().optional(),
  primaryContactId: z.string().uuid().optional(),
  stage: z.enum(OPPORTUNITY_STAGE).default('LEAD'),
  estimatedValue: z.number().nonnegative().optional(),
  currencyCode: z.string().trim().length(3).toUpperCase().optional(),
  expectedCloseDate: z.coerce.date().optional(),
  source: z.string().trim().max(120).optional(),
  notes: optionalText,
});
export type CreateOpportunityInput = z.infer<typeof createOpportunitySchema>;

export const updateOpportunityStageSchema = z.object({ stage: z.enum(OPPORTUNITY_STAGE) });

export const updateClientSchema = z.object({
  name: name.optional(),
  status: z.enum(CLIENT_STATUS).optional(),
  industry: z.string().trim().max(120).nullish(),
  websiteUrl: z.string().trim().url().max(500).nullish(),
  notes: optionalText.nullish(),
});
export type UpdateClientInput = z.infer<typeof updateClientSchema>;

export const updateContactSchema = z.object({
  firstName: z.string().trim().max(120).nullish(),
  lastName: z.string().trim().max(120).nullish(),
  email: z.string().trim().email().max(200).nullish(),
  phone: z.string().trim().max(50).nullish(),
  jobTitle: z.string().trim().max(120).nullish(),
  clientId: z.string().uuid().nullish(),
  notes: optionalText.nullish(),
});
export type UpdateContactInput = z.infer<typeof updateContactSchema>;

