/**
 * Propiedad de campos por sistema externo. Un campo "propiedad" de un proveedor lo rellena el sync de ese
 * proveedor (pull) y no debe editarse en Control Tower cuando el registro fue importado de ahí: la edición se
 * perdería en el próximo pull y, en algunos casos (asset→Notion), causaría divergencia entre sistemas.
 *
 * Fuente única compartida por el frontend (bloqueo visual en panel/ficha) y el backend (guard en los comandos
 * `update*`). Regla de aplicación: un campo se bloquea SOLO si el registro concreto tiene identidad externa de un
 * proveedor listado aquí para su entidad (bloqueo por *procedencia*, no fijo). Los registros nativos de CT no se ven
 * afectados. NO se incluyen los campos con write-back intencional (CRM de Twenty) ni los que CT posee.
 *
 * `entityType` = el mismo que en auditoría / `external_identities.internalType`.
 */
export const FIELD_OWNERSHIP: Record<string, Record<string, readonly string[]>> = {
  // Asset importado de GitHub: sync-git reescribe estos campos (html_url / clone_url / repo name / description).
  asset: {
    GITHUB: ['name', 'description', 'externalUrl', 'repositoryUrl'],
  },
  // Task importada de Twenty: se bloquea el título (identidad del ticket externo). La FECHA se deja editable a
  // petición del owner (reprogramar en CT); nota: el pull de Twenty puede volver a pisarla si allí tiene fecha.
  task: {
    TWENTY: ['title'],
  },
  // Opportunity (owner 2026-09-02): CT es **sólo una máquina de estados** — las oportunidades se crean y se editan
  // en Twenty, y lo único que se mueve desde CT es el `stage` (por eso NO aparece en esta lista: no está bloqueado,
  // es justo lo que CT empuja de vuelta). Todo lo demás lo posee Twenty y el pull lo reescribe en cada sync.
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
