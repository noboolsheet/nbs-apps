import type { Database } from '@ct/db';
import {
  type NotionDataSource,
  readTitle,
  readRichText,
  readSelect,
  readDate,
  readUrl,
  readNumber,
} from '@ct/integrations';
import { type OrgContext } from '../auth/index';
import {
  createStrategicArea,
  createCapability,
  createService,
  createGoal,
  listStrategicAreas,
  listCapabilities,
  listServices,
  listGoals,
} from '../governance/index';
import { createProject, listProjects } from '../projects/index';
import { listResources } from '../resources/index';
import { listLearningItems } from '../learning/index';
import { createReviewItem, listReviewItems } from '../review/index';
import {
  createDecision,
  createKnowledgeItem,
  createAsset,
  listDecisions,
  listKnowledgeItems,
  listAssets,
} from '../knowledge/index';
import {
  isoDate,
  syncNotionEntity,
  pushNotionEntityById,
  type NotionEntitySpec,
  type NotionEntitySummary,
} from './sync-notion-entity';

/**
 * Specs por entidad (contrato NOTION_INFORMATION_ARCHITECTURE.md §4, con los nombres de propiedad reales,
 * verificados en §9). Solo campos ESCALARES: las relaciones y el cuerpo quedan gobernados por Notion.
 */

type Row<T extends (...args: never[]) => Promise<unknown[]>> = Awaited<ReturnType<T>>[number];

const decisionSpec: NotionEntitySpec<Row<typeof listDecisions>> = {
  internalType: 'decision',
  title: (d) => d.title,
  rowId: (d) => d.id,
  fields: [
    { prop: 'Status', kind: 'select', value: (d) => d.status },
    { prop: 'Context', kind: 'text', value: (d) => d.context },
    { prop: 'Decision', kind: 'text', value: (d) => d.decision },
    { prop: 'Rationale', kind: 'text', value: (d) => d.rationale },
    { prop: 'Decided at', kind: 'date', value: (d) => isoDate(d.decidedAt) },
  ],
  list: listDecisions,
  importFromNotion: (db, ctx, page) =>
    createDecision(db, ctx, {
      title: readTitle(page) ?? '(sin título)',
      decision: readRichText(page, 'Decision') ?? readTitle(page) ?? '(sin decisión)',
      context: readRichText(page, 'Context'),
      rationale: readRichText(page, 'Rationale'),
      status: readSelect(page, 'Status'),
    }),
};

const strategicAreaSpec: NotionEntitySpec<Row<typeof listStrategicAreas>> = {
  internalType: 'strategic_area',
  title: (a) => a.name,
  rowId: (a) => a.id,
  fields: [
    { prop: 'Description', kind: 'text', value: (a) => a.description },
    { prop: 'Status', kind: 'select', value: (a) => a.status },
    { prop: 'Sort Order', kind: 'number', value: (a) => a.sortOrder },
  ],
  list: listStrategicAreas,
  importFromNotion: (db, ctx, page) =>
    createStrategicArea(db, ctx, {
      name: readTitle(page) ?? '(sin nombre)',
      description: readRichText(page, 'Description'),
      status: readSelect(page, 'Status'),
      sortOrder: readNumber(page, 'Sort Order'),
    }),
};

const capabilitySpec: NotionEntitySpec<Row<typeof listCapabilities>> = {
  internalType: 'capability',
  title: (c) => c.name,
  rowId: (c) => c.id,
  fields: [
    { prop: 'Description', kind: 'text', value: (c) => c.description },
    { prop: 'Status', kind: 'select', value: (c) => c.status },
    { prop: 'Maturity', kind: 'select', value: (c) => c.maturity },
    { prop: 'Notes', kind: 'text', value: (c) => c.notes },
  ],
  list: listCapabilities,
  importFromNotion: (db, ctx, page) =>
    createCapability(db, ctx, {
      name: readTitle(page) ?? '(sin nombre)',
      description: readRichText(page, 'Description'),
      status: readSelect(page, 'Status'),
      maturity: readSelect(page, 'Maturity'),
      notes: readRichText(page, 'Notes'),
    }),
};

const serviceSpec: NotionEntitySpec<Row<typeof listServices>> = {
  internalType: 'service',
  title: (s) => s.name,
  rowId: (s) => s.id,
  fields: [
    { prop: 'Description', kind: 'text', value: (s) => s.description },
    { prop: 'Status', kind: 'select', value: (s) => s.status },
    { prop: 'Type', kind: 'text', value: (s) => s.serviceType },
    { prop: 'Notes', kind: 'text', value: (s) => s.notes },
  ],
  list: listServices,
  importFromNotion: (db, ctx, page) =>
    createService(db, ctx, {
      name: readTitle(page) ?? '(sin nombre)',
      description: readRichText(page, 'Description'),
      status: readSelect(page, 'Status'),
      serviceType: readRichText(page, 'Type'),
      notes: readRichText(page, 'Notes'),
    }),
};

const goalSpec: NotionEntitySpec<Row<typeof listGoals>> = {
  internalType: 'goal',
  title: (g) => g.name,
  rowId: (g) => g.id,
  fields: [
    { prop: 'Description', kind: 'text', value: (g) => g.description },
    { prop: 'Status', kind: 'select', value: (g) => g.status },
    { prop: 'Priority', kind: 'select', value: (g) => g.priority },
    { prop: 'Target Date', kind: 'date', value: (g) => isoDate(g.targetDate) },
  ],
  list: listGoals,
  importFromNotion: (db, ctx, page) =>
    createGoal(db, ctx, {
      name: readTitle(page) ?? '(sin nombre)',
      description: readRichText(page, 'Description'),
      status: readSelect(page, 'Status'),
      priority: readSelect(page, 'Priority'),
      targetDate: readDate(page, 'Target Date'),
    }),
};

const projectSpec: NotionEntitySpec<Row<typeof listProjects>> = {
  internalType: 'project',
  title: (p) => p.name,
  rowId: (p) => p.id,
  fields: [
    { prop: 'Description', kind: 'text', value: (p) => p.description },
    { prop: 'Status', kind: 'select', value: (p) => p.status },
    { prop: 'Priority', kind: 'select', value: (p) => p.priority },
    { prop: 'Start', kind: 'date', value: (p) => isoDate(p.startDate) },
    { prop: 'Target', kind: 'date', value: (p) => isoDate(p.targetDate) },
    // Client es texto en Notion (no hay DB Clients; la verdad es Twenty): empujamos el nombre.
    { prop: 'Client', kind: 'text', value: (p) => p.clientName },
  ],
  list: listProjects,
  importFromNotion: (db, ctx, page) =>
    createProject(db, ctx, {
      name: readTitle(page) ?? '(sin nombre)',
      description: readRichText(page, 'Description'),
      status: readSelect(page, 'Status'),
      priority: readSelect(page, 'Priority'),
      startDate: readDate(page, 'Start'),
      targetDate: readDate(page, 'Target'),
    }),
};

const knowledgeItemSpec: NotionEntitySpec<Row<typeof listKnowledgeItems>> = {
  internalType: 'knowledge_item',
  title: (k) => k.title,
  rowId: (k) => k.id,
  fields: [
    { prop: 'Type', kind: 'select', value: (k) => k.knowledgeType },
    { prop: 'Sector', kind: 'select', value: (k) => k.sector },
    { prop: 'Status', kind: 'select', value: (k) => k.status },
    { prop: 'Summary', kind: 'text', value: (k) => k.summary },
    { prop: 'Canonical URL', kind: 'text', value: (k) => k.sourceUrl }, // "URLs relacionadas": texto libre (varios URLs)
    { prop: 'Source', kind: 'select', value: (k) => k.sourceType },
  ],
  list: listKnowledgeItems,
  importFromNotion: (db, ctx, page) =>
    createKnowledgeItem(db, ctx, {
      title: readTitle(page) ?? '(sin título)',
      knowledgeType: readSelect(page, 'Type'),
      sector: readSelect(page, 'Sector'),
      status: readSelect(page, 'Status'),
      summary: readRichText(page, 'Summary'),
      sourceType: readSelect(page, 'Source') ?? 'NOTION',
      sourceUrl: readRichText(page, 'Canonical URL'),
    }),
};

const assetSpec: NotionEntitySpec<Row<typeof listAssets>> = {
  internalType: 'asset',
  title: (a) => a.name,
  rowId: (a) => a.id,
  fields: [
    { prop: 'Type', kind: 'text', value: (a) => a.assetType },
    { prop: 'Description', kind: 'text', value: (a) => a.description },
    { prop: 'Status', kind: 'select', value: (a) => a.status },
    { prop: 'Version', kind: 'text', value: (a) => a.version },
    { prop: 'External URL', kind: 'url', value: (a) => a.externalUrl },
    { prop: 'Repository URL', kind: 'url', value: (a) => a.repositoryUrl },
  ],
  list: listAssets,
  importFromNotion: (db, ctx, page) =>
    createAsset(db, ctx, {
      name: readTitle(page) ?? '(sin nombre)',
      assetType: readRichText(page, 'Type') ?? 'REFERENCE',
      description: readRichText(page, 'Description'),
      status: readSelect(page, 'Status'),
      version: readRichText(page, 'Version'),
      externalUrl: readUrl(page, 'External URL'),
      repositoryUrl: readUrl(page, 'Repository URL'),
    }),
};

// Activos (Fase 8) — PUSH-ONLY (los activos se crean en CT; sin importFromNotion). Type/Status/Hosting son select
// en Notion; si el tipo es una etiqueta nueva, Notion crea la opción al escribir.
const resourceSpec: NotionEntitySpec<Row<typeof listResources>> = {
  internalType: 'resource',
  title: (r) => r.name,
  rowId: (r) => r.id,
  fields: [
    { prop: 'Type', kind: 'select', value: (r) => r.type },
    { prop: 'Status', kind: 'select', value: (r) => r.status },
    { prop: 'Hosting', kind: 'select', value: (r) => r.hosting },
    { prop: 'Client', kind: 'text', value: (r) => r.clientName },
    { prop: 'Project', kind: 'text', value: (r) => r.projectName },
    { prop: 'URL', kind: 'url', value: (r) => r.url },
    { prop: 'Provider', kind: 'text', value: (r) => r.provider },
    { prop: 'Environment', kind: 'text', value: (r) => r.environment },
    { prop: 'Credential location', kind: 'text', value: (r) => r.credentialLocation },
    { prop: 'Notes', kind: 'text', value: (r) => r.notes },
  ],
  list: listResources,
};

// Learning Path — PUSH-ONLY (los items se crean en CT; sin importFromNotion). Kind/Status/Sector son select en Notion.
const learningSpec: NotionEntitySpec<Row<typeof listLearningItems>> = {
  internalType: 'learning_item',
  title: (l) => l.title,
  rowId: (l) => l.id,
  fields: [
    { prop: 'Kind', kind: 'select', value: (l) => l.kind },
    { prop: 'Status', kind: 'select', value: (l) => l.status },
    { prop: 'Sector', kind: 'select', value: (l) => l.sector },
    { prop: 'URL', kind: 'url', value: (l) => l.url },
    { prop: 'Progress', kind: 'number', value: (l) => l.progress },
    { prop: 'Notes', kind: 'text', value: (l) => l.notes },
  ],
  list: listLearningItems,
};

/**
 * «Por revisar» (cola de artículos/vídeos/libros). **Bidireccional**: se puede guardar un enlace en Notion desde el
 * móvil y aparece aquí, o crearlo aquí y verlo allí. Propiedades esperadas en la DB de Notion — ver
 * `NOTION_INFORMATION_ARCHITECTURE.md` §4.11.
 */
const reviewItemSpec: NotionEntitySpec<Row<typeof listReviewItems>> = {
  internalType: 'review_item',
  title: (r) => r.title,
  rowId: (r) => r.id,
  fields: [
    { prop: 'Kind', kind: 'select', value: (r) => r.kind },
    { prop: 'Status', kind: 'select', value: (r) => r.status },
    // Sector es TEXTO en Notion (no select): es una etiqueta libre y así no hay que mantener las opciones allí.
    { prop: 'Sector', kind: 'text', value: (r) => r.sector },
    { prop: 'URL', kind: 'url', value: (r) => r.url },
    { prop: 'Notes', kind: 'text', value: (r) => r.notes },
  ],
  list: listReviewItems,
  importFromNotion: (db, ctx, page) =>
    createReviewItem(db, ctx, {
      title: readTitle(page) ?? '(sin título)',
      kind: readSelect(page, 'Kind'),
      // Si la página de Notion no trae estado, entra en la cola como pendiente.
      status: readSelect(page, 'Status') ?? 'TO_REVIEW',
      sector: readRichText(page, 'Sector'),
      url: readUrl(page, 'URL'),
      notes: readRichText(page, 'Notes'),
    }),
};

/**
 * internalType de las specs BIDIRECCIONALES (las que tienen `importFromNotion`). Son exactamente las que
 * reconcilian borrados (M40), así que todas tienen que estar en `ARCHIVABLE`: hay un test que lo comprueba,
 * porque si falta una, su reconciliación se salta en silencio y las páginas borradas en Notion se quedarían
 * colgando en CT sin que nadie se entere.
 */
export const NOTION_BIDIRECTIONAL_TYPES: readonly string[] = [
  decisionSpec,
  strategicAreaSpec,
  capabilitySpec,
  serviceSpec,
  goalSpec,
  projectSpec,
  knowledgeItemSpec,
  assetSpec,
  reviewItemSpec,
]
  .filter((spec) => !!spec.importFromNotion)
  .map((spec) => spec.internalType);

/** Clave de configuración (`integrations.configuration.databases.<key>`) → runner de esa entidad. */
const RUNNERS: Record<
  string,
  (db: Database, ctx: OrgContext, ds: NotionDataSource, dbId: string) => Promise<NotionEntitySummary>
> = {
  decisions: (db, ctx, ds, id) => syncNotionEntity(db, ctx, ds, id, decisionSpec),
  strategicAreas: (db, ctx, ds, id) => syncNotionEntity(db, ctx, ds, id, strategicAreaSpec),
  capabilities: (db, ctx, ds, id) => syncNotionEntity(db, ctx, ds, id, capabilitySpec),
  services: (db, ctx, ds, id) => syncNotionEntity(db, ctx, ds, id, serviceSpec),
  goals: (db, ctx, ds, id) => syncNotionEntity(db, ctx, ds, id, goalSpec),
  projects: (db, ctx, ds, id) => syncNotionEntity(db, ctx, ds, id, projectSpec),
  knowledgeItems: (db, ctx, ds, id) => syncNotionEntity(db, ctx, ds, id, knowledgeItemSpec),
  assets: (db, ctx, ds, id) => syncNotionEntity(db, ctx, ds, id, assetSpec),
  resources: (db, ctx, ds, id) => syncNotionEntity(db, ctx, ds, id, resourceSpec),
  learning: (db, ctx, ds, id) => syncNotionEntity(db, ctx, ds, id, learningSpec),
  reviewItems: (db, ctx, ds, id) => syncNotionEntity(db, ctx, ds, id, reviewItemSpec),
};

/** Ejecuta el sync tipado de cada base de datos de Notion configurada. */
export async function runNotionSync(
  db: Database,
  ctx: OrgContext,
  ds: NotionDataSource,
  databases: Record<string, string>,
): Promise<Record<string, NotionEntitySummary>> {
  const results: Record<string, NotionEntitySummary> = {};
  for (const [key, id] of Object.entries(databases)) {
    const runner = RUNNERS[key];
    if (runner && id) results[key] = await runner(db, ctx, ds, id);
  }
  return results;
}

/** Compat: piloto de Decisions (usado por tests) — ahora sobre el motor genérico. */
export function syncNotionDecisions(
  db: Database,
  ctx: OrgContext,
  ds: NotionDataSource,
  databaseId: string,
): Promise<NotionEntitySummary> {
  return syncNotionEntity(db, ctx, ds, databaseId, decisionSpec);
}

/** entityType (external_identities.internal_type) → clave de config + spec, para el push en tiempo real. */
type PushTarget = { key: string; push: (db: Database, ctx: OrgContext, ds: NotionDataSource, dbId: string, id: string) => Promise<'created' | 'updated' | 'skip'> };
const PUSH_TARGETS: Record<string, PushTarget> = {
  decision: { key: 'decisions', push: (db, ctx, ds, dbId, id) => pushNotionEntityById(db, ctx, ds, dbId, decisionSpec, id) },
  strategic_area: { key: 'strategicAreas', push: (db, ctx, ds, dbId, id) => pushNotionEntityById(db, ctx, ds, dbId, strategicAreaSpec, id) },
  capability: { key: 'capabilities', push: (db, ctx, ds, dbId, id) => pushNotionEntityById(db, ctx, ds, dbId, capabilitySpec, id) },
  service: { key: 'services', push: (db, ctx, ds, dbId, id) => pushNotionEntityById(db, ctx, ds, dbId, serviceSpec, id) },
  goal: { key: 'goals', push: (db, ctx, ds, dbId, id) => pushNotionEntityById(db, ctx, ds, dbId, goalSpec, id) },
  project: { key: 'projects', push: (db, ctx, ds, dbId, id) => pushNotionEntityById(db, ctx, ds, dbId, projectSpec, id) },
  knowledge_item: { key: 'knowledgeItems', push: (db, ctx, ds, dbId, id) => pushNotionEntityById(db, ctx, ds, dbId, knowledgeItemSpec, id) },
  asset: { key: 'assets', push: (db, ctx, ds, dbId, id) => pushNotionEntityById(db, ctx, ds, dbId, assetSpec, id) },
  resource: { key: 'resources', push: (db, ctx, ds, dbId, id) => pushNotionEntityById(db, ctx, ds, dbId, resourceSpec, id) },
  learning_item: { key: 'learning', push: (db, ctx, ds, dbId, id) => pushNotionEntityById(db, ctx, ds, dbId, learningSpec, id) },
  review_item: { key: 'reviewItems', push: (db, ctx, ds, dbId, id) => pushNotionEntityById(db, ctx, ds, dbId, reviewItemSpec, id) },
};

/** Push en tiempo real de UNA entidad a su DB de Notion (Fase 5). No-op si el tipo no se refleja o la DB no está configurada. */
export async function runNotionEntityPush(
  db: Database,
  ctx: OrgContext,
  ds: NotionDataSource,
  databases: Record<string, string>,
  entityType: string,
  entityId: string,
): Promise<'created' | 'updated' | 'skip' | 'noop'> {
  const target = PUSH_TARGETS[entityType];
  if (!target) return 'noop';
  const dbId = databases[target.key];
  if (!dbId) return 'noop';
  return target.push(db, ctx, ds, dbId, entityId);
}
