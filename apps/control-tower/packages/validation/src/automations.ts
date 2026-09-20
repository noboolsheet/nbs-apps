import { z } from 'zod';

/**
 * Cambio de estado de una automatización (activar/pausar). El estado se persiste por organización en
 * `organizations.settings.automations`. Sólo se admiten los estados de la UI: ACTIVE (activada) / PAUSED (pausada).
 */
export const updateAutomationSchema = z.object({
  status: z.enum(['ACTIVE', 'PAUSED']),
});
export type UpdateAutomationInput = z.infer<typeof updateAutomationSchema>;
