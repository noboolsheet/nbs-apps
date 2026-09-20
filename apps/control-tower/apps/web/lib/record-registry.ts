import {
  CLIENT_STATUS,
  OPPORTUNITY_STAGE,
  PAYMENT_DIRECTION,
  PAYMENT_STATUS,
  REVIEW_ITEM_STATUS,
  REVIEW_ITEM_KIND_SUGGESTIONS,
  PROJECT_STATUS,
  PROJECT_TYPE,
  PRIORITY,
  TASK_STATUS,
  DELIVERABLE_STATUS,
  LIFECYCLE_STATUS,
  SERVICE_STATUS,
  CAPABILITY_STATUS,
  CAPABILITY_MATURITY,
  KNOWLEDGE_ITEM_STATUS,
  KNOWLEDGE_TYPE,
  DECISION_STATUS,
  ASSET_STATUS,
  LEARNING_STATUS,
  RESOURCE_STATUS,
  RESOURCE_HOSTING,
  PORTFOLIO_ITEM_STATUS,
  PORTFOLIO_ITEM_VISIBILITY,
} from '@ct/domain';
import { PORTFOLIO_ITEM_TYPE, PROJECT_PHASE_STATUS } from '@ct/validation';
import { CURRENCIES } from './currencies';
import { t } from './i18n';

/**
 * Registro por entidad para el panel lateral (creación/edición de metadatos, estilo Twenty).
 * Una sola fuente que describe, por entidad: sus campos editables (derivados de los schemas Zod `update*`),
 * los endpoints REST y la ruta de la ficha completa. El panel (`record-panel.tsx`) lo consume genéricamente.
 *
 * `commit`: en modo EDICIÓN cada campo autoguarda; por defecto hace `PATCH {patchPath}` con `{ [name]: value }`.
 * Algunos campos (estado/stage) van a un sub-endpoint propio → se indican con `commitPath`/`commitKey`.
 * En modo CREACIÓN todos los campos se envían juntos a `createPath`.
 */
export type FieldType = 'text' | 'textarea' | 'select' | 'relation' | 'date' | 'number' | 'boolean';

export interface PanelField {
  name: string;
  label: string;
  type: FieldType;
  options?: readonly string[]; // enums (type 'select')
  /**
   * GET de lista + cómo etiquetar (type 'relation'). `dependsOn` acota las opciones a las que pertenecen al valor
   * elegido en OTRO campo: p. ej. los contactos de un proyecto se limitan a los del cliente seleccionado
   * (`{ field: 'clientId', rowKey: 'clientId' }`). Sin ese otro campo relleno, se ofrecen todas.
   */
  relation?: {
    source: string;
    labelFields: string[];
    dependsOn?: { field: string; rowKey: string };
  };
  suggest?: string; // endpoint GET → { data: string[] }: sugerencias para un campo de texto libre (datalist)
  required?: boolean;
  readOnly?: boolean;
  /** Valor inicial en modo CREACIÓN (p. ej. estado 'TODO' por defecto en una tarea nueva). */
  defaultValue?: string;
  /**
   * Oculta el campo (y lo excluye de crear/autoguardar) según los valores ACTUALES del formulario.
   * Recibe los valores como strings, incluyendo la relación al padre fijada por creación contextual.
   * P. ej.: un proyecto personal oculta cliente/oportunidad/servicio; una tarea con proyecto/oportunidad/
   * tarea-padre oculta "personal" (hereda el tipo del padre).
   */
  hidden?: (values: Record<string, string>) => boolean;
  /**
   * Información HEREDADA / de solo lectura: no se edita ni se envía; se muestra en el bloque "Contexto"
   * del panel (con su etiqueta resuelta si es relación/derivado). P. ej. el Proyecto y la Oportunidad de
   * una tarea se heredan de su padre → no se tocan, solo se ven. Solo se muestra si tiene valor.
   */
  context?: boolean;
  /**
   * Campo de SOLO LECTURA cuyo valor se DERIVA en vivo de un registro padre (no se guarda en este registro):
   * se hace GET de `entity` identificado por el valor de `idField` de este registro, y se lee `valueField`.
   * Nunca se envía al crear/guardar. Si no hay padre, cae al valor propio del registro (`name`).
   * P. ej. la oportunidad de una tarea se hereda del proyecto (idField 'projectId' → project.opportunityId),
   * así la tarea NO queda marcada como de oportunidad y sigue en la lista de tareas de proyecto.
   */
  derivedFrom?: { entity: string; idField: string; valueField: string };
  /** Proveedores externos que POSEEN este campo: se bloquea (solo lectura) si el registro vino de uno de ellos. */
  ownedBy?: readonly string[];
  commitPath?: (id: string) => string; // override del endpoint de autoguardado (edición)
  commitKey?: string; // override de la clave del payload (por defecto = name)
}

export interface RecordSpec {
  entity: string; // clave del ?rec=<entity>:<id>
  label: string; // "Cliente", "Contacto"…
  listPath: string; // ruta de la lista (para volver)
  detailPath?: (id: string) => string; // "Abrir ficha completa" — solo entidades con secciones internas
  createPath?: string; // POST (ausente = no se crea a nivel de lista, p. ej. task vive dentro de un proyecto)
  itemPath: (id: string) => string; // GET/PATCH del registro
  pick?: (data: unknown) => Record<string, unknown>; // extrae el registro plano del GET (por defecto identidad)
  fields: PanelField[];
  source?: boolean; // muestra "Fuente" (origen Twenty/Notion…) en el bloque de contexto
  readOnly?: boolean; // entidad de solo-referencia (Documents/Calendar…)
  // Creación contextual desde la sección de un padre (?rec=<e>:new&in=<ctxKey>:<parentId>):
  // fija (y oculta) la relación al padre. `createPath` opcional para rutas anidadas (task/deliverable).
  contextCreate?: Record<string, { presetField: string; createPath?: (parentId: string) => string }>;
}

const CLIENT_REL = { source: '/api/v1/clients', labelFields: ['name'] };
const CONTACT_REL = { source: '/api/v1/contacts', labelFields: ['firstName', 'lastName', 'email'] };
const OPPORTUNITY_REL = { source: '/api/v1/opportunities', labelFields: ['name'] };
const SERVICE_REL = { source: '/api/v1/services', labelFields: ['name'] };
const PROJECT_REL = { source: '/api/v1/projects', labelFields: ['name'] };
const AREA_REL = { source: '/api/v1/strategic-areas', labelFields: ['name'] };
const ASSET_REL = { source: '/api/v1/assets', labelFields: ['name'] };
/** Contactos ACOTADOS al cliente ya elegido en el mismo formulario (si no hay cliente, se ofrecen todos). */
const CONTACT_OF_CLIENT_REL = { ...CONTACT_REL, dependsOn: { field: 'clientId', rowKey: 'clientId' } };
const DECISION_REL = { source: '/api/v1/decisions', labelFields: ['title'] };

export const RECORDS: Record<string, RecordSpec> = {
  client: {
    entity: 'client',
    label: t('entity.client'),
    listPath: '/crm/clients',
    detailPath: (id) => `/crm/clients/${id}`, // Cliente tiene secciones internas → ficha completa
    createPath: '/api/v1/clients',
    itemPath: (id) => `/api/v1/clients/${id}`,
    source: true,
    pick: (d) => (d as { client: Record<string, unknown> }).client,
    fields: [
      { name: 'name', label: t('field.name'), type: 'text', required: true },
      { name: 'status', label: t('field.status'), type: 'select', options: CLIENT_STATUS },
      { name: 'industry', label: t('field.industry'), type: 'text' },
      { name: 'websiteUrl', label: t('field.websiteUrl'), type: 'text' },
      { name: 'notes', label: t('field.notes'), type: 'textarea' },
    ],
  },
  contact: {
    entity: 'contact',
    label: t('entity.contact'),
    listPath: '/crm/contacts',
    // Sin secciones internas → el panel es la ficha (no hay "Abrir ficha completa").
    createPath: '/api/v1/contacts',
    itemPath: (id) => `/api/v1/contacts/${id}`,
    source: true,
    contextCreate: { client: { presetField: 'clientId' } },
    fields: [
      { name: 'firstName', label: t('field.name'), type: 'text' },
      { name: 'lastName', label: t('field.lastName'), type: 'text' },
      { name: 'email', label: t('field.email'), type: 'text' },
      { name: 'phone', label: t('field.phone'), type: 'text' },
      { name: 'jobTitle', label: t('field.jobTitle'), type: 'text' },
      { name: 'clientId', label: t('field.clientId'), type: 'relation', relation: CLIENT_REL },
      { name: 'notes', label: t('field.notes'), type: 'textarea' },
    ],
  },
  /**
   * Owner 2026-09-02: para las oportunidades, CT es **sólo una máquina de estados**. No hay `createPath` (nacen en
   * Twenty) ni creación contextual desde el cliente, y **el único campo editable es `stage`**, que se autoguarda en
   * su sub-endpoint. Los campos que posee Twenty se bloquean por procedencia (`ownedBy`, mensaje "se edita en el
   * origen"); los tres que hoy NO viajan a Twenty —contacto principal, procedencia y notas— quedan de solo lectura
   * en espera de que el owner decida si se quedan como datos propios de CT o se retiran.
   */
  opportunity: {
    entity: 'opportunity',
    label: t('entity.opportunity'),
    listPath: '/crm/opportunities',
    detailPath: (id) => `/crm/opportunities/${id}`, // ficha con tareas de preventa → "Abrir ficha completa ↗"
    itemPath: (id) => `/api/v1/opportunities/${id}`,
    source: true,
    fields: [
      // Lo ÚNICO editable, y por eso va primero: mover la oportunidad por el embudo.
      { name: 'stage', label: t('field.stage'), type: 'select', options: OPPORTUNITY_STAGE, commitPath: (id) => `/api/v1/opportunities/${id}/stage`, commitKey: 'stage' },
      { name: 'name', label: t('field.name'), type: 'text', required: true, ownedBy: ['TWENTY'] },
      { name: 'clientId', label: t('entity.client'), type: 'relation', relation: CLIENT_REL, ownedBy: ['TWENTY'] },
      { name: 'estimatedValue', label: t('field.estimatedValue'), type: 'number', ownedBy: ['TWENTY'] },
      { name: 'currencyCode', label: t('field.currencyCode'), type: 'select', options: CURRENCIES, ownedBy: ['TWENTY'] },
      { name: 'expectedCloseDate', label: t('field.expectedCloseDate'), type: 'date', ownedBy: ['TWENTY'] },
      { name: 'primaryContactId', label: t('field.primaryContactId'), type: 'relation', relation: CONTACT_OF_CLIENT_REL, readOnly: true },
      { name: 'source', label: t('field.source'), type: 'text', readOnly: true },
      { name: 'notes', label: t('field.notes'), type: 'textarea', readOnly: true },
    ],
  },

  // ── Projects ──────────────────────────────────────────────────────────────
  project: {
    entity: 'project',
    label: t('entity.project'),
    listPath: '/projects',
    detailPath: (id) => `/projects/${id}`, // fases/tareas/deliverables → ficha completa
    createPath: '/api/v1/projects',
    itemPath: (id) => `/api/v1/projects/${id}`,
    pick: (d) => (d as { project: Record<string, unknown> }).project,
    contextCreate: { client: { presetField: 'clientId' } },
    fields: [
      { name: 'name', label: t('field.name'), type: 'text', required: true },
      // Al inicio: si se marca personal, los campos de cliente/oportunidad/servicio se ocultan (no aplican).
      { name: 'personal', label: t('field.personal'), type: 'boolean' },
      { name: 'status', label: t('field.status'), type: 'select', options: PROJECT_STATUS, commitPath: (id) => `/api/v1/projects/${id}/status` },
      // A-1 (ADR-005): tipo. CLIENT exige cliente (el back rechaza lo contrario con PROJECT_CLIENT_REQUIRED).
      { name: 'type', label: t('field.kind'), type: 'select', options: PROJECT_TYPE, defaultValue: 'INTERNAL', hidden: (v) => v.personal === 'true' },
      { name: 'description', label: t('field.description'), type: 'textarea' },
      { name: 'clientId', label: t('entity.client'), type: 'relation', relation: CLIENT_REL, hidden: (v) => v.personal === 'true' },
      { name: 'contactId', label: t('entity.contact'), type: 'relation', relation: CONTACT_OF_CLIENT_REL, hidden: (v) => v.personal === 'true' },
      { name: 'opportunityId', label: t('entity.opportunity'), type: 'relation', relation: OPPORTUNITY_REL, hidden: (v) => v.personal === 'true' },
      { name: 'serviceId', label: t('entity.service'), type: 'relation', relation: SERVICE_REL, hidden: (v) => v.personal === 'true' },
      { name: 'priority', label: t('field.priority'), type: 'select', options: PRIORITY },
      { name: 'startDate', label: t('field.startDate'), type: 'date' },
      { name: 'targetDate', label: t('projects.targetDate'), type: 'date' },
    ],
  },
  task: {
    entity: 'task',
    label: t('entity.task'),
    listPath: '/tasks',
    detailPath: (id) => `/tasks/${id}`, // ficha con subtareas (solo tareas de primer nivel; el panel la oculta si es subtarea)
    createPath: '/api/v1/tasks', // crear a nivel global (nativa de CT), con proyecto opcional
    itemPath: (id) => `/api/v1/tasks/${id}`,
    // Se crea dentro de un proyecto, dentro de una oportunidad (preventa) o dentro de otra tarea (subtarea).
    contextCreate: {
      project: { presetField: 'projectId', createPath: (pid) => `/api/v1/projects/${pid}/tasks` },
      opportunity: { presetField: 'opportunityId', createPath: (pid) => `/api/v1/opportunities/${pid}/tasks` },
      task: { presetField: 'parentTaskId', createPath: (pid) => `/api/v1/tasks/${pid}/subtasks` },
    },
    source: true, // puede venir de Twenty; título/fecha se bloquean si es así
    fields: [
      { name: 'title', label: t('field.title'), type: 'text', required: true, ownedBy: ['TWENTY'] },
      // Estado por defecto al crear: "Por hacer" (TODO); editable como cualquier otro campo.
      { name: 'status', label: t('field.status'), type: 'select', options: TASK_STATUS, defaultValue: 'TODO', commitPath: (id) => `/api/v1/tasks/${id}/status` },
      { name: 'description', label: t('field.description'), type: 'textarea' },
      { name: 'priority', label: t('field.priority'), type: 'select', options: PRIORITY },
      { name: 'dueDate', label: t('field.dueDate'), type: 'date' },
      // F-8: proyecto SELECCIONABLE. Al crear desde la vista global (`/tasks`) permite elegir proyecto en vez de
      // dejar la tarea huérfana; en edición permite reasignarla (el comando aplica la exclusión proyecto/
      // oportunidad/personal). Se oculta cuando es heredado: subtarea (parentTaskId) o tarea de preventa.
      { name: 'projectId', label: t('entity.project'), type: 'relation', relation: PROJECT_REL, hidden: (v) => Boolean(v.parentTaskId || v.opportunityId) },
      // Oportunidad: se hereda del proyecto (o es la propia de una tarea de preventa) → solo lectura, en "Contexto".
      { name: 'opportunityId', label: t('entity.opportunity'), type: 'relation', relation: OPPORTUNITY_REL, context: true, derivedFrom: { entity: 'project', idField: 'projectId', valueField: 'opportunityId' } },
      // "Personal" solo aplica a una tarea suelta (sin proyecto/oportunidad/tarea-padre): hereda el tipo del padre.
      { name: 'personal', label: t('field.personalTask'), type: 'boolean', hidden: (v) => Boolean(v.projectId || v.opportunityId || v.parentTaskId) },
    ],
  },
  project_phase: {
    entity: 'project_phase',
    label: t('entity.project_phase'),
    listPath: '/projects', // no hay lista global; se gestiona desde la ficha del proyecto (panel-only).
    itemPath: (id) => `/api/v1/project-phases/${id}`,
    contextCreate: { project: { presetField: 'projectId', createPath: (pid) => `/api/v1/projects/${pid}/phases` } },
    fields: [
      { name: 'name', label: t('field.name'), type: 'text', required: true },
      { name: 'status', label: t('field.status'), type: 'select', options: PROJECT_PHASE_STATUS, defaultValue: 'ACTIVE' },
      { name: 'description', label: t('field.description'), type: 'textarea' },
      { name: 'sortOrder', label: t('field.sortOrder'), type: 'number' },
    ],
  },
  deliverable: {
    entity: 'deliverable',
    label: t('entity.deliverable'),
    listPath: '/projects', // no hay lista global; se crea/edita desde el proyecto
    itemPath: (id) => `/api/v1/deliverables/${id}`,
    contextCreate: { project: { presetField: 'projectId', createPath: (pid) => `/api/v1/projects/${pid}/deliverables` } },
    fields: [
      { name: 'name', label: t('field.name'), type: 'text', required: true },
      { name: 'status', label: t('field.status'), type: 'select', options: DELIVERABLE_STATUS, commitPath: (id) => `/api/v1/deliverables/${id}/status` },
      { name: 'description', label: t('field.description'), type: 'textarea' },
      { name: 'dueDate', label: t('field.dueDate'), type: 'date' },
      { name: 'externalUrl', label: t('field.externalUrl'), type: 'text' },
    ],
  },

  // ── Business ──────────────────────────────────────────────────────────────
  strategic_area: {
    entity: 'strategic_area',
    label: t('entity.strategic_area'),
    listPath: '/business/strategic-areas',
    detailPath: (id) => `/business/strategic-areas/${id}`, // objetivos vinculados → ficha completa
    createPath: '/api/v1/strategic-areas',
    itemPath: (id) => `/api/v1/strategic-areas/${id}`,
    fields: [
      { name: 'name', label: t('field.name'), type: 'text', required: true },
      { name: 'description', label: t('field.description'), type: 'textarea' },
      { name: 'status', label: t('field.status'), type: 'select', options: LIFECYCLE_STATUS },
      { name: 'sortOrder', label: t('field.sortOrder'), type: 'number' },
    ],
  },
  goal: {
    entity: 'goal',
    label: t('entity.goal'),
    listPath: '/business/goals',
    createPath: '/api/v1/goals',
    itemPath: (id) => `/api/v1/goals/${id}`,
    contextCreate: { strategic_area: { presetField: 'strategicAreaId' } },
    fields: [
      { name: 'name', label: t('field.name'), type: 'text', required: true },
      { name: 'description', label: t('field.description'), type: 'textarea' },
      { name: 'status', label: t('field.status'), type: 'select', options: LIFECYCLE_STATUS },
      { name: 'priority', label: t('field.priority'), type: 'select', options: PRIORITY },
      { name: 'strategicAreaId', label: t('entity.strategic_area'), type: 'relation', relation: AREA_REL },
      { name: 'targetDate', label: t('field.targetDateGoal'), type: 'date' },
    ],
  },
  capability: {
    entity: 'capability',
    label: t('entity.capability'),
    listPath: '/business/capabilities',
    createPath: '/api/v1/capabilities',
    itemPath: (id) => `/api/v1/capabilities/${id}`,
    // Desde un servicio: crea la capacidad y la vincula (N:N) en un paso. `presetField` es nominal
    // (la capacidad no tiene serviceId): con `createPath` el padre va en la URL, no en el payload.
    contextCreate: {
      service: { presetField: 'serviceId', createPath: (sid) => `/api/v1/services/${sid}/capabilities/new` },
    },
    fields: [
      { name: 'name', label: t('field.name'), type: 'text', required: true },
      { name: 'status', label: t('field.status'), type: 'select', options: CAPABILITY_STATUS, commitPath: (id) => `/api/v1/capabilities/${id}/status` },
      { name: 'description', label: t('field.description'), type: 'textarea' },
      { name: 'maturity', label: t('field.maturity'), type: 'select', options: CAPABILITY_MATURITY },
      { name: 'notes', label: t('field.notes'), type: 'textarea' },
    ],
  },
  service: {
    entity: 'service',
    label: t('entity.service'),
    listPath: '/business/services',
    detailPath: (id) => `/business/services/${id}`, // capacidades vinculadas → ficha completa
    createPath: '/api/v1/services',
    itemPath: (id) => `/api/v1/services/${id}`,
    pick: (d) => (d as { service: Record<string, unknown> }).service,
    fields: [
      { name: 'name', label: t('field.name'), type: 'text', required: true },
      { name: 'status', label: t('field.status'), type: 'select', options: SERVICE_STATUS, commitPath: (id) => `/api/v1/services/${id}/status` },
      { name: 'description', label: t('field.description'), type: 'textarea' },
      { name: 'serviceType', label: t('field.kind'), type: 'text' },
      { name: 'notes', label: t('field.notes'), type: 'textarea' },
    ],
  },

  // ── Knowledge ─────────────────────────────────────────────────────────────
  knowledge_inbox: {
    entity: 'knowledge_inbox',
    label: t('entity.knowledge_inbox'),
    listPath: '/knowledge/inbox',
    // Panel-only (sin ficha completa). Se capturan con el formulario rápido → sin createPath.
    itemPath: (id) => `/api/v1/knowledge-inbox/${id}`,
    fields: [
      { name: 'title', label: t('field.title'), type: 'text' },
      { name: 'rawContent', label: t('field.rawContent'), type: 'textarea', required: true },
      { name: 'sourceType', label: t('field.sourceType'), type: 'text', readOnly: true },
      { name: 'knowledgeType', label: t('field.kind'), type: 'select', options: KNOWLEDGE_TYPE },
      { name: 'sector', label: t('field.sector'), type: 'text', suggest: '/api/v1/knowledge/sectors' },
    ],
  },
  knowledge_item: {
    entity: 'knowledge_item',
    label: t('entity.knowledge_item'),
    listPath: '/knowledge/library',
    createPath: '/api/v1/knowledge-items',
    itemPath: (id) => `/api/v1/knowledge-items/${id}`,
    // El cuerpo del ítem (y de los SOP) vive en Notion: el panel ofrece el salto a la página de origen.
    source: true,
    fields: [
      { name: 'title', label: t('field.title'), type: 'text', required: true },
      { name: 'status', label: t('field.status'), type: 'select', options: KNOWLEDGE_ITEM_STATUS, commitPath: (id) => `/api/v1/knowledge-items/${id}/status` },
      { name: 'knowledgeType', label: t('field.kind'), type: 'select', options: KNOWLEDGE_TYPE },
      { name: 'sector', label: t('field.sector'), type: 'text', suggest: '/api/v1/knowledge/sectors' },
      { name: 'summary', label: t('common.summary'), type: 'textarea' },
      { name: 'sourceUrl', label: t('field.sourceUrl'), type: 'textarea' },
    ],
  },
  decision: {
    entity: 'decision',
    label: t('entity.decision'),
    listPath: '/knowledge/decisions',
    createPath: '/api/v1/decisions',
    itemPath: (id) => `/api/v1/decisions/${id}`,
    contextCreate: { project: { presetField: 'projectId' }, service: { presetField: 'serviceId' } },
    fields: [
      { name: 'title', label: t('field.title'), type: 'text', required: true },
      { name: 'status', label: t('field.status'), type: 'select', options: DECISION_STATUS, commitPath: (id) => `/api/v1/decisions/${id}/status` },
      { name: 'context', label: t('field.context'), type: 'textarea' },
      { name: 'decision', label: t('entity.decision'), type: 'textarea', required: true },
      { name: 'rationale', label: t('field.rationale'), type: 'textarea' },
      // A-2 (ADR-006): al fijarlo, la decisión elegida pasa a SUPERSEDED (debe estar APROBADA) y queda el enlace.
      { name: 'supersedesDecisionId', label: t('field.supersedesDecisionId'), type: 'relation', relation: DECISION_REL },
    ],
  },
  asset: {
    entity: 'asset',
    label: t('entity.asset'),
    listPath: '/knowledge/assets',
    createPath: '/api/v1/assets',
    itemPath: (id) => `/api/v1/assets/${id}`,
    // A-3 (ADR-007): crear un activo desde la ficha de un proyecto lo CREA y lo ENLAZA (tabla puente N:M);
    // no hay `projectId` en `assets`, por eso el createPath override hace las dos cosas en la ruta.
    contextCreate: { project: { presetField: 'projectId', createPath: (pid) => `/api/v1/projects/${pid}/assets` } },
    source: true, // puede venir de GitHub; nombre/descr/URLs se bloquean si es así
    fields: [
      { name: 'name', label: t('field.name'), type: 'text', required: true, ownedBy: ['GITHUB'] },
      { name: 'status', label: t('field.status'), type: 'select', options: ASSET_STATUS, commitPath: (id) => `/api/v1/assets/${id}/status` },
      { name: 'assetType', label: t('field.kind'), type: 'text', required: true },
      { name: 'description', label: t('field.description'), type: 'textarea', ownedBy: ['GITHUB'] },
      { name: 'version', label: t('field.version'), type: 'text' },
      { name: 'externalUrl', label: t('field.externalUrl'), type: 'text', ownedBy: ['GITHUB'] },
      { name: 'repositoryUrl', label: t('field.repositoryUrl'), type: 'text', ownedBy: ['GITHUB'] },
    ],
  },
  learning: {
    entity: 'learning',
    label: t('entity.learning'),
    listPath: '/knowledge/learning',
    createPath: '/api/v1/learning',
    itemPath: (id) => `/api/v1/learning/${id}`,
    fields: [
      { name: 'title', label: t('field.title'), type: 'text', required: true },
      { name: 'kind', label: t('field.kind'), type: 'text', required: true },
      { name: 'status', label: t('field.status'), type: 'select', options: LEARNING_STATUS },
      { name: 'sector', label: t('field.sector'), type: 'text', suggest: '/api/v1/knowledge/sectors' },
      { name: 'progress', label: t('field.progress'), type: 'number' },
      { name: 'url', label: t('field.url'), type: 'text' },
      { name: 'notes', label: t('field.notes'), type: 'textarea' },
    ],
  },

  // ── Portfolio ─────────────────────────────────────────────────────────────
  portfolio_item: {
    entity: 'portfolio_item',
    label: t('entity.portfolio_item'),
    listPath: '/portfolio',
    createPath: '/api/v1/portfolio-items',
    itemPath: (id) => `/api/v1/portfolio-items/${id}`,
    fields: [
      { name: 'name', label: t('field.name'), type: 'text', required: true },
      { name: 'status', label: t('field.status'), type: 'select', options: PORTFOLIO_ITEM_STATUS, commitPath: (id) => `/api/v1/portfolio-items/${id}/status` },
      { name: 'visibility', label: t('field.visibility'), type: 'select', options: PORTFOLIO_ITEM_VISIBILITY, commitPath: (id) => `/api/v1/portfolio-items/${id}/visibility` },
      { name: 'type', label: t('field.kind'), type: 'select', options: PORTFOLIO_ITEM_TYPE },
      { name: 'description', label: t('field.description'), type: 'textarea' },
      { name: 'externalUrl', label: t('field.externalUrl'), type: 'text' },
      { name: 'projectId', label: t('entity.project'), type: 'relation', relation: PROJECT_REL },
      { name: 'assetId', label: t('entity.asset'), type: 'relation', relation: ASSET_REL },
    ],
  },

  review_item: {
    entity: 'review_item',
    label: t('review.title'),
    listPath: '/knowledge/review',
    createPath: '/api/v1/review-items',
    itemPath: (id) => `/api/v1/review-items/${id}`,
    fields: [
      { name: 'title', label: t('field.title'), type: 'text', required: true },
      { name: 'url', label: t('field.url'), type: 'text' },
      // Tipo y sector son etiquetas libres con sugerencias: la lista no tiene por qué ser cerrada.
      { name: 'kind', label: t('field.kind'), type: 'select', options: REVIEW_ITEM_KIND_SUGGESTIONS },
      { name: 'status', label: t('field.status'), type: 'select', options: REVIEW_ITEM_STATUS, defaultValue: 'TO_REVIEW', commitPath: (id) => `/api/v1/review-items/${id}/status` },
      { name: 'sector', label: t('field.sector'), type: 'text', suggest: '/api/v1/knowledge/sectors' },
      { name: 'notes', label: t('field.notes'), type: 'textarea' },
    ],
  },

  // ── Pagos ─────────────────────────────────────────────────────────────────
  payment: {
    entity: 'payment',
    label: t('entity.payment'),
    listPath: '/payments',
    createPath: '/api/v1/payments',
    itemPath: (id) => `/api/v1/payments/${id}`,
    fields: [
      { name: 'concept', label: t('field.concept'), type: 'text', required: true },
      // Entrada (te lo deben) o salida (lo debes tú): decide qué campos tienen sentido debajo.
      { name: 'direction', label: t('field.direction'), type: 'select', options: PAYMENT_DIRECTION, defaultValue: 'IN' },
      { name: 'status', label: t('field.status'), type: 'select', options: PAYMENT_STATUS, defaultValue: 'PENDING', commitPath: (id) => `/api/v1/payments/${id}/status` },
      { name: 'amount', label: t('field.amount'), type: 'number', required: true },
      { name: 'currencyCode', label: t('field.currencyCode'), type: 'select', options: CURRENCIES, defaultValue: 'EUR' },
      // Sólo en ENTRADA: a quién se lo cobras.
      { name: 'clientId', label: t('field.clientId'), type: 'relation', relation: CLIENT_REL, hidden: (v) => v.direction === 'OUT' },
      { name: 'contactId', label: t('entity.contact'), type: 'relation', relation: CONTACT_OF_CLIENT_REL, hidden: (v) => v.direction === 'OUT' },
      // Sólo en SALIDA: a quién le pagas (texto libre; un proveedor no tiene por qué estar en el CRM).
      { name: 'payeeLabel', label: t('field.payeeLabel'), type: 'text', hidden: (v) => v.direction !== 'OUT' },
      { name: 'dueDate', label: t('field.paymentDueDate'), type: 'date' },
      { name: 'notes', label: t('field.notes'), type: 'textarea' },
    ],
  },

  // ── Resources ─────────────────────────────────────────────────────────────
  resource: {
    entity: 'resource',
    label: t('entity.resource'),
    listPath: '/resources',
    createPath: '/api/v1/resources',
    itemPath: (id) => `/api/v1/resources/${id}`,
    contextCreate: { project: { presetField: 'projectId' }, client: { presetField: 'clientId' } },
    fields: [
      { name: 'name', label: t('field.name'), type: 'text', required: true },
      { name: 'type', label: t('field.kind'), type: 'text', required: true },
      { name: 'status', label: t('field.status'), type: 'select', options: RESOURCE_STATUS },
      { name: 'hosting', label: t('field.hosting'), type: 'select', options: RESOURCE_HOSTING },
      { name: 'clientId', label: t('entity.client'), type: 'relation', relation: CLIENT_REL },
      { name: 'projectId', label: t('entity.project'), type: 'relation', relation: PROJECT_REL },
      { name: 'provider', label: t('field.provider'), type: 'text' },
      { name: 'environment', label: t('field.environment'), type: 'text' },
      { name: 'url', label: t('field.url'), type: 'text' },
      { name: 'credentialLocation', label: t('field.credentialLocation'), type: 'text' },
      { name: 'notes', label: t('field.notes'), type: 'textarea' },
    ],
  },
};
