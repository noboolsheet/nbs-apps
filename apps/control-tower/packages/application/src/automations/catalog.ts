/**
 * Catálogo de automatizaciones (fuente única). Enumera TODAS las automatizaciones que corren en Control Tower
 * — motor, handlers por evento, sincronizaciones y barridos de mantenimiento — con sus metadatos de display y las
 * claves que el worker usa para las guardas de activación/desactivación (`isAutomationEnabled`).
 *
 * NO es la tabla `automations` (que queda sin usar): las automatizaciones están definidas en CÓDIGO; este catálogo
 * es su descripción legible. El estado activada/pausada se guarda por organización en `organizations.settings.automations`.
 *
 * Al añadir una automatización nueva (job, handler de outbox o barrido) → añade aquí su `AutomationSpec` y, si es
 * `toggleable`, la guarda correspondiente en el worker/barrido. El test de integración verifica que no queden huérfanas.
 */

export type AutomationKind = 'core' | 'event' | 'sync' | 'sweep';

/** Barridos "ejecutables ahora" acotados a la organización. */
export type SweepKind = 'retention' | 'opportunity_archive' | 'inbox_purge' | 'archived_purge' | 'review_purge';

export interface AutomationSpec {
  /** Identificador estable (p. ej. `sync.notion`). */
  key: string;
  title: string;
  kind: AutomationKind;
  /** Qué hace, en una o dos frases. */
  description: string;
  /** Cadencia legible (p. ej. "Diario 07:00 + manual", "Por evento", "~Cada hora"). */
  frequencyLabel: string;
  /** Qué la dispara. */
  triggerLabel: string;
  /** Ámbito de la guarda: por organización o global (núcleo). */
  scope: 'org' | 'global';
  /** Se puede activar/desactivar (las del núcleo, no). */
  toggleable: boolean;
  /** Se puede "Ejecutar ahora" (sync → encola job; sweep → corre inline). */
  runnable: boolean;
  /** Proveedor de integración (solo `sync.*`), para mapear a job/integración. */
  provider?: string;
  /** Tipo de barrido (solo `sweep.*`), para "Ejecutar ahora". */
  sweep?: SweepKind;
  /** Requisitos/condiciones (env, integración, config) — informativo para el panel. */
  requirements: string[];
  /** Qué deja de pasar al pausarla. */
  pauseEffect: string;
  /** Notas adicionales (backoff, idempotencia, env que la desactiva…). */
  notes?: string;
}

export const AUTOMATION_CATALOG: readonly AutomationSpec[] = [
  // ── Núcleo del motor (solo lectura: apagarlo congelaría toda la app) ──────────────────────────────
  {
    key: 'engine.outbox',
    title: 'Motor de eventos (Outbox)',
    kind: 'core',
    description:
      'Despacha los eventos transaccionales pendientes de la bandeja de salida a sus handlers (espejo a Notion/Twenty y automatizaciones por evento), con reintentos y backoff.',
    frequencyLabel: 'Continuo · cada 2 s',
    triggerLabel: 'Bucle del worker (cada tick)',
    scope: 'global',
    toggleable: false,
    runnable: false,
    requirements: ['Worker en marcha'],
    pauseEffect: 'No aplica: es el núcleo del motor; sin él no correría ninguna automatización por evento.',
    notes: 'Hasta 20 eventos por ciclo. Backoff exponencial, 5 intentos.',
  },
  {
    key: 'engine.jobs',
    title: 'Cola de trabajos',
    kind: 'core',
    description:
      'Reclama y ejecuta los trabajos pendientes de la cola (sincronizaciones y tareas en segundo plano), con reintentos y backoff. Multi-worker seguro (FOR UPDATE SKIP LOCKED).',
    frequencyLabel: 'Continuo · cada 2 s (≤25/ciclo)',
    triggerLabel: 'Bucle del worker (cada tick)',
    scope: 'global',
    toggleable: false,
    runnable: false,
    requirements: ['Worker en marcha'],
    pauseEffect: 'No aplica: es el núcleo; sin él no se ejecutaría ninguna sincronización ni trabajo.',
    notes: 'Backoff exponencial, 5 intentos por trabajo.',
  },
  {
    key: 'engine.scheduler',
    title: 'Programador de sincronización diaria',
    kind: 'core',
    description:
      'Una vez al día encola una sincronización por cada integración conectada. Deduplica: si ya hay una encolada para esa organización, no encola otra.',
    frequencyLabel: 'Diario a las 07:00 (zona horaria de la organización)',
    triggerLabel: 'Bucle del worker, al cruzar la hora',
    scope: 'global',
    toggleable: false,
    runnable: false,
    requirements: ['SYNC_DAILY_HOUR (0–23; por defecto 7)', 'Zona horaria de la organización (Ajustes)'],
    pauseEffect: 'No aplica (núcleo). Cada sincronización se puede pausar por separado en la lista.',
    notes: 'Controlado por la variable de entorno SYNC_DAILY_HOUR; un valor fuera de 0–23 desactiva el programador.',
  },

  // ── Automatizaciones por evento ───────────────────────────────────────────────────────────────────
  {
    key: 'event.notion_push',
    title: 'Espejo a Notion en tiempo real',
    kind: 'event',
    description:
      'Al editar una entidad reflejada, empuja al instante sus campos estructurados a Notion. Control Tower posee esas propiedades; el cuerpo de la página lo posee Notion.',
    frequencyLabel: 'Por evento',
    triggerLabel:
      'Al editar un USUARIO una entidad reflejada (decisión, conocimiento, activo, área estratégica, capacidad, servicio, objetivo, proyecto, recurso, aprendizaje)',
    scope: 'org',
    toggleable: true,
    runnable: false,
    requirements: ['Integración Notion conectada', 'NOTION_API_KEY', 'IDs de bases en la configuración de Notion'],
    pauseEffect:
      'Tus ediciones dejan de reflejarse a Notion al momento (se seguirán reflejando en la sincronización diaria, salvo que también la pauses).',
  },
  {
    key: 'event.twenty_push',
    title: 'Write-back a Twenty CRM',
    kind: 'event',
    description:
      'Al editar un cliente, contacto, oportunidad o tarea ya sincronizados, escribe de vuelta los campos gestionados a Twenty. En tarea sólo empuja la fecha (CT es dueño de la fecha; Twenty del título).',
    frequencyLabel: 'Por evento',
    triggerLabel: 'Al ACTUALIZAR un USUARIO client/contact/opportunity/task (no al crear ni borrar)',
    scope: 'org',
    toggleable: true,
    runnable: false,
    requirements: ['Integración Twenty conectada', 'TWENTY_API_URL + TWENTY_API_KEY'],
    pauseEffect: 'Tus ediciones dejan de propagarse a Twenty al momento.',
  },
  {
    key: 'event.opportunity_won',
    title: 'Crear proyecto al ganar oportunidad',
    kind: 'event',
    description:
      'Cuando una oportunidad pasa a GANADA, crea automáticamente su proyecto (hereda el cliente y queda enlazado). Idempotente: no duplica si el proyecto ya existe.',
    frequencyLabel: 'Por evento',
    triggerLabel: 'Al pasar una oportunidad al estado GANADA',
    scope: 'org',
    toggleable: true,
    runnable: false,
    requirements: ['—'],
    pauseEffect: 'Al ganar una oportunidad ya no se creará su proyecto automáticamente (podrás crearlo a mano).',
  },

  // ── Sincronizaciones (diarias + manual) ─────────────────────────────────────────────────────────────
  {
    key: 'sync.twenty',
    title: 'Sincronización Twenty CRM',
    kind: 'sync',
    provider: 'TWENTY',
    description:
      'Trae de Twenty empresas→clientes, personas→contactos, oportunidades y tareas. Idempotente vía identidades externas.',
    frequencyLabel: 'Diario 07:00 + manual',
    triggerLabel: "Programador diario o «Ejecutar ahora»",
    scope: 'org',
    toggleable: true,
    runnable: true,
    requirements: ['Integración Twenty conectada', 'TWENTY_API_URL + TWENTY_API_KEY', "TWENTY_CRM_URL (enlaces «Abrir en CRM»)"],
    pauseEffect: 'Deja de traer cambios de Twenty (ni en el diario ni al encolarse).',
  },
  {
    key: 'sync.notion',
    title: 'Sincronización Notion',
    kind: 'sync',
    provider: 'NOTION',
    description: 'Sincroniza (bidireccional, propiedad por campo) cada base de datos configurada de Notion.',
    frequencyLabel: 'Diario 07:00 + manual',
    triggerLabel: "Programador diario o «Ejecutar ahora»",
    scope: 'org',
    toggleable: true,
    runnable: true,
    requirements: ['Integración Notion conectada', 'NOTION_API_KEY', 'IDs de bases en la configuración'],
    pauseEffect: 'Deja de sincronizar con Notion.',
  },
  {
    key: 'sync.github',
    title: 'Sincronización GitHub',
    kind: 'sync',
    provider: 'GITHUB',
    description: 'Trae repositorios como activos (referencia/metadatos; nunca el contenido de los ficheros).',
    frequencyLabel: 'Diario 07:00 + manual',
    triggerLabel: "Programador diario o «Ejecutar ahora»",
    scope: 'org',
    toggleable: true,
    runnable: true,
    requirements: ['Integración GitHub conectada', 'GITHUB_TOKEN (+ GITHUB_OWNER opcional)'],
    pauseEffect: 'Deja de traer repositorios de GitHub.',
  },
  {
    key: 'sync.gdrive',
    title: 'Sincronización Google Drive',
    kind: 'sync',
    provider: 'GDRIVE',
    description: 'Trae los ficheros de una carpeta (recursivo) como documentos de referencia.',
    frequencyLabel: 'Diario 07:00 + manual',
    triggerLabel: "Programador diario o «Ejecutar ahora»",
    scope: 'org',
    toggleable: true,
    runnable: true,
    requirements: ['Integración Google Drive conectada', 'GOOGLE_SA_KEY_B64 (service account)', 'folderId en la configuración'],
    pauseEffect: 'Deja de traer ficheros de Drive.',
  },
  {
    key: 'sync.gcalendar',
    title: 'Sincronización Google Calendar',
    kind: 'sync',
    provider: 'GCALENDAR',
    description: 'Trae los eventos de HOY a la caché del Home (reconcilia borrados). Admite varios calendarios.',
    frequencyLabel: 'Diario 07:00 + manual',
    triggerLabel: "Programador diario o «Ejecutar ahora»",
    scope: 'org',
    toggleable: true,
    runnable: true,
    requirements: ['Integración Google Calendar conectada', 'GOOGLE_SA_KEY_B64', 'GCAL_CALENDAR_ID (uno o varios, separados por coma)'],
    pauseEffect: 'Deja de refrescar los eventos de hoy en el Home.',
  },

  // ── Barridos de mantenimiento ─────────────────────────────────────────────────────────────────────
  {
    key: 'sweep.retention',
    title: 'Purga de tareas completadas',
    kind: 'sweep',
    sweep: 'retention',
    description:
      'Borra las tareas completadas más antiguas que la política de retención de la organización. Queda registro en auditoría.',
    frequencyLabel: 'Diario (día local)',
    triggerLabel: "Barrido diario del worker o «Ejecutar ahora»",
    scope: 'org',
    toggleable: true,
    runnable: true,
    requirements: ['Política «días de retención de tareas» > 0 en Ajustes'],
    pauseEffect: 'Las tareas completadas dejan de purgarse (se conservan todas).',
    notes:
      'Depende de la política de retención (Ajustes). Si está en 0 / «conservar siempre», el barrido corre pero NO borra nada; solo elimina tareas completadas con más días que la política cuando ésta es > 0.',
  },
  {
    key: 'sweep.opportunity_archive',
    title: 'Autoarchivado de oportunidades',
    kind: 'sweep',
    sweep: 'opportunity_archive',
    description:
      'Archiva las oportunidades de la columna «Cerradas» (perdidas e incorporadas) cerradas hace ≥ 7 días, retirándolas del Kanban. Las ganadas (WON) no se archivan solas. Sólo afecta a Control Tower: en Twenty no cambia nada.',
    frequencyLabel: 'Diario (día local) · ventana de 7 días',
    triggerLabel: "Barrido diario del worker o «Ejecutar ahora»",
    scope: 'org',
    toggleable: true,
    runnable: true,
    requirements: ['—'],
    pauseEffect: 'Las oportunidades perdidas dejan de archivarse solas (siguen en el Kanban).',
  },
  {
    key: 'sweep.inbox_purge',
    title: 'Purga de bandeja resuelta',
    kind: 'sweep',
    sweep: 'inbox_purge',
    description: 'Borra las capturas ya resueltas de la bandeja: las PROCESADAS (su texto vive en el Resumen del elemento de la biblioteca) y las DESCARTADAS. Sin retención a propósito: no se guardan dos copias de la misma información y la bandeja no se llena.',
    frequencyLabel: 'Diario (día local)',
    triggerLabel: "Barrido diario del worker o «Ejecutar ahora»",
    scope: 'org',
    toggleable: true,
    runnable: true,
    requirements: ['—'],
    pauseEffect: 'Las capturas procesadas y descartadas dejan de borrarse (siguen ocupando la bandeja).',
  },
  {
    key: 'sweep.archived_purge',
    title: 'Purga de archivados',
    kind: 'sweep',
    sweep: 'archived_purge',
    description:
      'Borra DEFINITIVAMENTE los elementos que lleven archivados más días que la política de la organización (todas las entidades archivables). Queda registro en auditoría. Lo aún referenciado por otra fila se conserva y se reintenta.',
    frequencyLabel: 'Diario (día local)',
    triggerLabel: "Barrido diario del worker o «Ejecutar ahora»",
    scope: 'org',
    toggleable: true,
    runnable: true,
    requirements: ['Política «días de retención de archivados» > 0 en Ajustes'],
    pauseEffect: 'Los elementos archivados dejan de purgarse (se conservan todos, sin borrado automático).',
    notes:
      'Depende de la política de retención de archivados (Ajustes). Si está en «conservar siempre», el barrido corre pero NO borra nada. Soft-delete → borrado definitivo: lo purgado no se puede restaurar (queda en audit_logs).',
  },
  {
    key: 'sweep.review_purge',
    title: 'Purga de «Por revisar» resuelto',
    kind: 'sweep',
    sweep: 'review_purge',
    description:
      'Borra los recursos de la cola «Por revisar» ya REVISADOS o DESCARTADOS que superen la retención configurada. Lo que se pasó a la biblioteca sigue allí con su enlace; lo pendiente no se toca nunca.',
    frequencyLabel: 'Diario (día local)',
    triggerLabel: "Barrido diario del worker o «Ejecutar ahora»",
    scope: 'org',
    toggleable: true,
    runnable: true,
    requirements: ['Política «retención de Por revisar» > 0 en Ajustes'],
    pauseEffect: 'Los recursos ya revisados se conservan en la cola indefinidamente.',
    notes:
      'Con la política en «conservar siempre», el barrido corre pero no borra nada. El borrado es definitivo (no es archivado).',
  },
] as const;

/** Índice por clave. */
export const AUTOMATION_BY_KEY: Record<string, AutomationSpec> = Object.fromEntries(
  AUTOMATION_CATALOG.map((a) => [a.key, a]),
);

export function getAutomationSpec(key: string): AutomationSpec | undefined {
  return AUTOMATION_BY_KEY[key];
}
