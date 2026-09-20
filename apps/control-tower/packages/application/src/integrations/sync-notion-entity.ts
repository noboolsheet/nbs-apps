import type { Database } from '@ct/db';
import {
  type NotionDataSource,
  type NotionPage,
  writeTitle,
  writeRichText,
  writeSelect,
  writeDate,
  writeUrl,
  writeNumber,
} from '@ct/integrations';
import { type OrgContext } from '../auth/index';
import { resolveInternalId, upsertIdentity, getExternalIdentityFor } from './identity';
import { errMsg, type SyncSkip } from './sync-common';

/**
 * Motor genérico de sync tipado bidireccional CT ↔ una base de datos de Notion (Fase 3, modelo
 * propiedad-por-campo). Cada entidad aporta un `NotionEntitySpec` (mapeo de campos escalares + cómo importar).
 * Reglas (idénticas al piloto de Decisions):
 *  - **pull-import**: crea en CT las filas de Notion sin identidad CT (bootstrap); no pisa las que CT ya posee.
 *  - **push-all**: CT es dueño de los campos escalares → upsert de cada fila CT en Notion (por `notion_page_id`).
 *  - Relaciones y cuerpo de página quedan gobernados por Notion (no se tocan aquí).
 */
const P = 'NOTION';

export type NotionFieldKind = 'text' | 'select' | 'date' | 'number' | 'url';

export interface NotionFieldMap<Row> {
  prop: string; // nombre exacto de la propiedad en Notion
  kind: NotionFieldKind;
  value: (row: Row) => string | number | null | undefined; // CT → valor a escribir
}

export interface NotionEntitySpec<Row> {
  internalType: string; // p. ej. 'capability' (external_identities.internal_type)
  title: (row: Row) => string;
  fields: NotionFieldMap<Row>[];
  list: (db: Database, ctx: OrgContext) => Promise<Row[]>;
  rowId: (row: Row) => string;
  /** Cómo importar una fila de Notion a CT (pull). Si se omite, la entidad es **push-only** (CT es su único autor). */
  importFromNotion?: (db: Database, ctx: OrgContext, page: NotionPage, titleProp: string) => Promise<{ id: string }>;
}

export interface NotionEntitySummary {
  imported: number; // Notion → CT (nuevas)
  pushedCreated: number; // CT → Notion (fila nueva)
  pushedUpdated: number; // CT → Notion (fila actualizada)
  skipped: SyncSkip[];
}

/** ISO date (YYYY-MM-DD) desde un Date o cadena, o null. */
export function isoDate(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  const s = new Date(d).toISOString().slice(0, 10);
  return s;
}

function buildProp(kind: NotionFieldKind, v: string | number | null | undefined): Record<string, unknown> {
  switch (kind) {
    case 'text':
      return writeRichText(v == null ? null : String(v));
    case 'select':
      return writeSelect(v == null ? null : String(v));
    case 'date':
      return writeDate(v == null ? null : String(v));
    case 'url':
      return writeUrl(v == null ? null : String(v));
    case 'number':
      return writeNumber(typeof v === 'number' ? v : v == null ? null : Number(v));
  }
}

export async function syncNotionEntity<Row>(
  db: Database,
  ctx: OrgContext,
  ds: NotionDataSource,
  databaseId: string,
  spec: NotionEntitySpec<Row>,
): Promise<NotionEntitySummary> {
  const summary: NotionEntitySummary = { imported: 0, pushedCreated: 0, pushedUpdated: 0, skipped: [] };
  const info = await ds.retrieveDatabase(databaseId);
  const titleProp = info.titlePropName;
  const T = spec.internalType;

  // 1) PULL (bootstrap): importa a CT las filas de Notion sin identidad CT. Sólo si la entidad lo soporta
  // (las push-only, como `resources`, se crean únicamente en CT).
  const importFromNotion = spec.importFromNotion;
  if (importFromNotion) {
    const pages = await ds.queryDatabase(databaseId);
    for (const page of pages) {
      try {
        const existing = await resolveInternalId(db, ctx, P, T, page.id);
        if (existing) continue;
        const created = await importFromNotion(db, ctx, page, titleProp);
        await upsertIdentity(db, ctx, {
          provider: P,
          externalType: T,
          externalId: page.id,
          internalType: T,
          internalId: created.id,
          metadata: { url: page.url },
        });
        summary.imported++;
      } catch (e) {
        summary.skipped.push({ entity: `${T}(notion)`, externalId: page.id, error: errMsg(e) });
      }
    }
  }

  // 2) PUSH: CT dueño → upsert de cada fila CT en Notion.
  const rows = await spec.list(db, ctx);
  for (const row of rows) {
    try {
      const res = await pushRow(db, ctx, ds, databaseId, spec, row, titleProp, info.propertyTypes);
      if (res === 'created') summary.pushedCreated++;
      else summary.pushedUpdated++;
    } catch (e) {
      summary.skipped.push({ entity: `${T}(ct)`, externalId: spec.rowId(row), error: errMsg(e) });
    }
  }

  return summary;
}

/** Upsert de UNA fila CT en Notion (crea o actualiza su página, por `notion_page_id`). */
async function pushRow<Row>(
  db: Database,
  ctx: OrgContext,
  ds: NotionDataSource,
  databaseId: string,
  spec: NotionEntitySpec<Row>,
  row: Row,
  titleProp: string,
  knownProps: Record<string, string>,
): Promise<'created' | 'updated'> {
  const props: Record<string, unknown> = { [titleProp]: writeTitle(spec.title(row)) };
  // Sólo se escriben las propiedades que EXISTEN en la DB de Notion (tolerante a drift: un campo del spec cuya
  // propiedad aún no se creó en Notion se omite en vez de romper el push con un 400).
  for (const f of spec.fields) if (f.prop in knownProps) props[f.prop] = buildProp(f.kind, f.value(row));
  const identity = await getExternalIdentityFor(db, ctx, P, spec.internalType, spec.rowId(row));
  if (identity) {
    await ds.updatePage(identity.externalId, props);
    return 'updated';
  }
  const page = await ds.createPage(databaseId, props);
  await upsertIdentity(db, ctx, {
    provider: P,
    externalType: spec.internalType,
    externalId: page.id,
    internalType: spec.internalType,
    internalId: spec.rowId(row),
    metadata: { url: page.url },
  });
  return 'created';
}

/** Push en tiempo real (Fase 5/E-1): empuja a Notion UNA entidad CT por su id (o no-op si no existe). */
export async function pushNotionEntityById<Row>(
  db: Database,
  ctx: OrgContext,
  ds: NotionDataSource,
  databaseId: string,
  spec: NotionEntitySpec<Row>,
  entityId: string,
): Promise<'created' | 'updated' | 'skip'> {
  const rows = await spec.list(db, ctx);
  const row = rows.find((r) => spec.rowId(r) === entityId);
  if (!row) return 'skip';
  const info = await ds.retrieveDatabase(databaseId);
  return pushRow(db, ctx, ds, databaseId, spec, row, info.titlePropName, info.propertyTypes);
}
