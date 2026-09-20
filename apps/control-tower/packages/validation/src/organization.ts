import { z } from 'zod';

/** Esquema de ajustes de organización (Fase 3 · Settings). Entrada plana desde la UI. */

export const updateOrganizationSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  timezone: z.string().trim().max(64).nullish(),
  defaultCurrency: z.string().trim().length(3).toUpperCase().nullish(),
  // Retención de tareas completadas: null = conservar siempre; N>0 = borrar tras N días (el registro
  // queda en audit_logs). 0 se normaliza a null (conservar).
  completedTaskRetentionDays: z.coerce.number().int().min(0).max(3650).nullish(),
  // Retención de ARCHIVADOS: null = conservar siempre; N>0 = borrar definitivamente lo que lleve archivado
  // más de N días (el registro queda en audit_logs). 0 se normaliza a null (conservar). Aplica a todas las
  // entidades archivables (soft-delete → purga definitiva).
  archivedRetentionDays: z.coerce.number().int().min(0).max(3650).nullish(),
  // Retención de la cola «Por revisar»: null = conservar siempre; N>0 = borrar los ya REVISADOS/DESCARTADOS N días
  // después de resolverse. Lo que se pasó a la biblioteca ya vive allí, así que la cola no tiene por qué crecer.
  reviewRetentionDays: z.coerce.number().int().min(0).max(3650).nullish(),
});
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;

/** Forma persistida en `organizations.settings` (jsonb). */
export interface OrganizationSettings {
  timezone?: string | null;
  defaultCurrency?: string | null;
  completedTaskRetentionDays?: number | null;
  archivedRetentionDays?: number | null;
  reviewRetentionDays?: number | null;
  /** Estado activada/pausada por automatización (clave del catálogo → estado). Ausente ⇒ activada. */
  automations?: Record<string, 'ACTIVE' | 'PAUSED'> | null;
}

/**
 * Edición del PERFIL del usuario (Ajustes › Tu perfil). **Sólo el nombre.**
 *
 * El **email NO se cambia por aquí** (decisión del owner, 2026-09-01): es la credencial de acceso y cambiarlo escribiendo
 * otro, sin verificar que existe ni que es tuyo, es un agujero — quien alcance la sesión se lleva la cuenta. Cuando se
 * aborde, irá con su propio flujo (verificación por correo del nuevo email, confirmación con contraseña y aviso al
 * anterior), junto al cambio de contraseña. Ver E-9 en `FINDINGS_AND_DEFERRED.md`.
 *
 * `.strict()` para que mandar `email` en el cuerpo devuelva un error de validación en vez de ignorarse en silencio.
 */
export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
  })
  .strict();
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
