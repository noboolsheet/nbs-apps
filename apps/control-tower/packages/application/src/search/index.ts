import { and, or, isNull, sql, desc, type SQL } from 'drizzle-orm';
import type { AnyPgColumn, PgTable } from 'drizzle-orm/pg-core';
import type { Database } from '@ct/db';
import {
  clients,
  contacts,
  opportunities,
  projects,
  tasks,
  decisions,
  knowledgeItems,
  assets,
  services,
  capabilities,
  portfolioItems,
  reviewItems,
  learningItems,
  resources,
  payments,
} from '@ct/db/schema';
import { orgEq, type OrgContext } from '../auth/index';

/**
 * Global Search (M10, doc 5 §41): PostgreSQL FTS con columnas `search_vector` (GIN) +
 * `websearch_to_tsquery` y ranking `ts_rank`, con fallback ILIKE para subcadena/prefijo.
 * Sin vector/embeddings/RAG (ERRATA-011). Todo filtrado por organización, y **sin lo archivado**.
 *
 * ⚑ **Al añadir una entidad con `searchVector` al esquema, añádela también a `TARGETS`.** No hay nada que lo
 * fuerce —el índice se crea solo y la búsqueda simplemente no la encuentra—, y así es como cuatro entidades
 * estuvieron fuera sin que nadie lo notara. El test de integración `search.test.ts` compara ambas listas.
 */

export interface SearchHit {
  type: string;
  id: string;
  title: string;
  href: string;
}
export interface SearchGroup {
  type: string;
  label: string;
  items: SearchHit[];
}

interface SearchTarget {
  type: string;
  /**
   * Nombre de respaldo. El texto que se ve lo pone la UI desde su diccionario (`search.type.<type>`); esto
   * sólo cubre el caso de que se añada un tipo aquí y se olvide su clave allí.
   */
  label: string;
  table: PgTable;
  orgCol: AnyPgColumn;
  idCol: AnyPgColumn;
  vectorCol: AnyPgColumn;
  /** Columna de archivado: lo archivado se oculta de sus listas, así que tampoco debe salir aquí. */
  archivedCol: AnyPgColumn;
  title: SQL;
  href: (id: string) => string;
}

const PER_TYPE_LIMIT = 5;

const TARGETS: SearchTarget[] = [
  { type: 'client', label: 'Clients', table: clients, orgCol: clients.organizationId, idCol: clients.id, vectorCol: clients.searchVector, archivedCol: clients.archivedAt, title: sql`${clients.name}`, href: (id) => `/crm/clients/${id}` },
  {
    type: 'contact',
    label: 'Contacts',
    table: contacts,
    orgCol: contacts.organizationId,
    idCol: contacts.id,
    vectorCol: contacts.searchVector,
    archivedCol: contacts.archivedAt,
    title: sql`trim(coalesce(${contacts.firstName}, '') || ' ' || coalesce(${contacts.lastName}, ''))`,
    href: () => `/crm/contacts`,
  },
  { type: 'opportunity', label: 'Opportunities', table: opportunities, orgCol: opportunities.organizationId, idCol: opportunities.id, vectorCol: opportunities.searchVector, archivedCol: opportunities.archivedAt, title: sql`${opportunities.name}`, href: () => `/crm/opportunities` },
  { type: 'project', label: 'Projects', table: projects, orgCol: projects.organizationId, idCol: projects.id, vectorCol: projects.searchVector, archivedCol: projects.archivedAt, title: sql`${projects.name}`, href: (id) => `/projects/${id}` },
  { type: 'task', label: 'Tasks', table: tasks, orgCol: tasks.organizationId, idCol: tasks.id, vectorCol: tasks.searchVector, archivedCol: tasks.archivedAt, title: sql`${tasks.title}`, href: () => `/projects` },
  { type: 'decision', label: 'Decisions', table: decisions, orgCol: decisions.organizationId, idCol: decisions.id, vectorCol: decisions.searchVector, archivedCol: decisions.archivedAt, title: sql`${decisions.title}`, href: () => `/knowledge/decisions` },
  { type: 'knowledge', label: 'Knowledge', table: knowledgeItems, orgCol: knowledgeItems.organizationId, idCol: knowledgeItems.id, vectorCol: knowledgeItems.searchVector, archivedCol: knowledgeItems.archivedAt, title: sql`${knowledgeItems.title}`, href: () => `/knowledge/library` },
  { type: 'asset', label: 'Assets', table: assets, orgCol: assets.organizationId, idCol: assets.id, vectorCol: assets.searchVector, archivedCol: assets.archivedAt, title: sql`${assets.name}`, href: () => `/knowledge/assets` },
  { type: 'service', label: 'Services', table: services, orgCol: services.organizationId, idCol: services.id, vectorCol: services.searchVector, archivedCol: services.archivedAt, title: sql`${services.name}`, href: (id) => `/business/services/${id}` },
  { type: 'capability', label: 'Capabilities', table: capabilities, orgCol: capabilities.organizationId, idCol: capabilities.id, vectorCol: capabilities.searchVector, archivedCol: capabilities.archivedAt, title: sql`${capabilities.name}`, href: () => `/business/capabilities` },
  { type: 'portfolio', label: 'Portfolio', table: portfolioItems, orgCol: portfolioItems.organizationId, idCol: portfolioItems.id, vectorCol: portfolioItems.searchVector, archivedCol: portfolioItems.archivedAt, title: sql`${portfolioItems.name}`, href: (id) => `/portfolio/${id}` },
  // Estas cuatro FALTABAN (2026-09-01): tenían su `search_vector` y su índice GIN desde el principio —el coste
  // ya estaba pagado en cada escritura— pero nadie las añadió aquí, así que la búsqueda «universal» ignoraba en
  // silencio 4 de las 15 entidades indexadas. Lo reportó el owner al no encontrar un recurso de «Por revisar».
  { type: 'review_item', label: 'Por revisar', table: reviewItems, orgCol: reviewItems.organizationId, idCol: reviewItems.id, vectorCol: reviewItems.searchVector, archivedCol: reviewItems.archivedAt, title: sql`${reviewItems.title}`, href: () => `/knowledge/review` },
  { type: 'learning_item', label: 'Aprendizaje', table: learningItems, orgCol: learningItems.organizationId, idCol: learningItems.id, vectorCol: learningItems.searchVector, archivedCol: learningItems.archivedAt, title: sql`${learningItems.title}`, href: () => `/knowledge/learning` },
  { type: 'resource', label: 'Recursos', table: resources, orgCol: resources.organizationId, idCol: resources.id, vectorCol: resources.searchVector, archivedCol: resources.archivedAt, title: sql`${resources.name}`, href: (id) => `/resources/${id}` },
  { type: 'payment', label: 'Pagos', table: payments, orgCol: payments.organizationId, idCol: payments.id, vectorCol: payments.searchVector, archivedCol: payments.archivedAt, title: sql`${payments.concept}`, href: () => `/payments` },
];

/** Tipos que cubre la búsqueda. Expuesto para que un test pueda atarlo al esquema (ver `search.test.ts`). */
export const SEARCH_TYPES: readonly string[] = TARGETS.map((t) => t.type);

export async function globalSearch(
  db: Database,
  ctx: OrgContext,
  rawQuery: string,
): Promise<{ groups: SearchGroup[]; total: number }> {
  const q = rawQuery.trim();
  if (q.length === 0) return { groups: [], total: 0 };
  const like = `%${q.replace(/[%_\\]/g, (m) => `\\${m}`)}%`;

  const perTarget = await Promise.all(
    TARGETS.map(async (cfg) => {
      const rank = sql<number>`ts_rank(${cfg.vectorCol}, websearch_to_tsquery('simple', ${q}))`;
      const rows = await db
        .select({ id: cfg.idCol, title: cfg.title, rank })
        .from(cfg.table)
        .where(
          and(
            orgEq(cfg.orgCol, ctx),
            // Archivado = oculto de su lista; si saliera aquí, el resultado llevaría a una vista donde no está.
            isNull(cfg.archivedCol),
            or(
              sql`${cfg.vectorCol} @@ websearch_to_tsquery('simple', ${q})`,
              sql`${cfg.title} ilike ${like}`,
            ),
          ),
        )
        .orderBy(desc(rank))
        .limit(PER_TYPE_LIMIT);

      const items: SearchHit[] = rows
        .filter((r) => (r.id as string | null) != null)
        .map((r) => ({
          type: cfg.type,
          id: r.id as string,
          title: (r.title as string) || '(sin título)',
          href: cfg.href(r.id as string),
        }));
      return { type: cfg.type, label: cfg.label, items };
    }),
  );

  const groups = perTarget.filter((g) => g.items.length > 0);
  const total = groups.reduce((n, g) => n + g.items.length, 0);
  return { groups, total };
}
