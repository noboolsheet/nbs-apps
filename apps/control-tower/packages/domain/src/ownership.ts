/**
 * Propiedad de campos por sistema externo. Un campo "propiedad" de un proveedor lo rellena el sync de ese
 * proveedor (pull) y no debe editarse en Control Tower cuando el registro fue importado de ahí: la edición se
 * perdería en el próximo pull y, en algunos casos (asset→Notion), causaría divergencia entre sistemas.
 *
 * Fuente única compartida por el frontend (bloqueo visual en panel/ficha) y el backend (guard en los comandos
 * `update*`). Regla de aplicación: un campo se bloquea SOLO si el registro concreto tiene identidad externa de un
 * proveedor listado aquí para su entidad (bloqueo por *procedencia*, no fijo). Los registros nativos de CT no se ven
 * afectados.
 *
 * **Decisión del owner (2026-09-26): todo lo que llega de Twenty es propiedad de Twenty.** Control Tower ya no
 * escribe NADA en Twenty salvo el `stage` de una oportunidad (ADR-009, que extiende ADR-008 a todo el CRM). Por eso
 * aquí están ahora TODOS los campos que el pull rellena de client/contact/task: si se dejaran editables, el cambio
 * viviría en CT hasta el siguiente sync y luego desaparecería sin avisar, que es peor que no poder editarlo.
 *
 * `entityType` = el mismo que en auditoría / `external_identities.internalType`.
 */
export const FIELD_OWNERSHIP: Record<string, Record<string, readonly string[]>> = {
  // Asset importado de GitHub: sync-git reescribe estos campos (html_url / clone_url / repo name / description).
  asset: {
    GITHUB: ['name', 'description', 'externalUrl', 'repositoryUrl'],
  },
  // Cliente importado de Twenty (company): el pull reescribe nombre, industria y web en cada sync. `status` y
  // `notes` NO están: son columnas propias de CT que Twenty no conoce ni pisa.
  client: {
    TWENTY: ['name', 'industry', 'websiteUrl'],
  },
  // Contacto importado de Twenty (person): el pull reescribe nombre, email, teléfono, cargo y la empresa a la que
  // pertenece. `notes` es de CT.
  contact: {
    TWENTY: ['firstName', 'lastName', 'email', 'phone', 'jobTitle', 'clientId'],
  },
  // Task importada de Twenty: título Y fecha. La fecha estuvo editable en CT (reprogramar) con write-back, y ese
  // write-back desapareció con ADR-009 — dejarla editable sería guardar una fecha que Twenty no conoce.
  task: {
    TWENTY: ['title', 'dueDate'],
  },
  // Opportunity (ADR-008): CT es **sólo una máquina de estados** — las oportunidades se crean y se editan en
  // Twenty, y lo único que se mueve desde CT es el `stage` (por eso NO aparece en esta lista: no está bloqueado,
  // es justo lo único que CT empuja de vuelta). Todo lo demás lo posee Twenty y el pull lo reescribe en cada sync.
  opportunity: {
    TWENTY: ['name', 'clientId', 'estimatedValue', 'currencyCode', 'expectedCloseDate'],
  },
} as const;

/** Etiqueta legible del proveedor para los mensajes de bloqueo ("se edita en el origen"). */
export const PROVIDER_LABEL: Record<string, string> = {
  GITHUB: 'GitHub',
  TWENTY: 'Twenty',
  NOTION: 'Notion',
  GDRIVE: 'Google Drive',
  GCALENDAR: 'Google Calendar',
};

/** Campos de `entityType` que posee `provider` (vacío si ninguno). */
export function ownedFields(entityType: string, provider: string | null | undefined): readonly string[] {
  if (!provider) return [];
  return FIELD_OWNERSHIP[entityType]?.[provider] ?? [];
}
