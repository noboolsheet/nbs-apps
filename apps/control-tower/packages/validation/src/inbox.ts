import { z } from 'zod';

/** Fase 7 (E-6) — canales de captura del Inbox. */

export const INBOX_CHANNEL_STATUS = ['ACTIVE', 'DISABLED'] as const;

export const createInboxChannelSchema = z.object({
  name: z.string().trim().min(1).max(80),
});
export type CreateInboxChannelInput = z.infer<typeof createInboxChannelSchema>;

export const updateInboxChannelSchema = z.object({
  status: z.enum(INBOX_CHANNEL_STATUS),
});

/** Cuerpo del webhook de captura (lo envía la herramienta externa). */
export const inboxWebhookSchema = z.object({
  content: z.string().trim().min(1).max(20000),
  title: z.string().trim().max(300).optional(),
  sourceUrl: z.string().trim().url().max(500).optional(),
});
